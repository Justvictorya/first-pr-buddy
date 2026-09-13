import type {
  OnboardingReport,
  RepoNode,
  ModuleInfo,
  Task,
  GlossaryTerm,
  Gotcha,
  SetupInfo,
} from './types'
import type { ScanResult, Module } from './scanner'
import type { BobRepoAnalysis } from './bob'

const COMMON_EXT_SPLIT = /\.(test|spec)\./
const TEST_KEYWORDS = ['test', 'spec', '__tests__', 'tests', 'test/']
const DOC_DIRS = ['docs', 'readme', 'wiki']

function isTestFile(f: string): boolean {
  return TEST_KEYWORDS.some((k) => f.includes(k)) || COMMON_EXT_SPLIT.test(f)
}

function perFileInsights(files: string[]): { entry: string; deps: string[] } {
  const entry = files.find(f => /(index|main|app)\./.test(f)) || files[0] || ''
  const deps = [...new Set(files.slice(0,5).flatMap(f => {
    const m = f.match(/\.([jt]sx?)$/)
    return m ? [m[1]] : []
  }))].slice(0,3)
  return { entry, deps }
}

function buildArchitectureTree(modules: Module[], manifests: { path: string; content: string | null }[]): RepoNode[] {
  const root: RepoNode = { id: 'root', name: '.', path: '', type: 'dir', children: [] }

  for (const m of modules) {
    if (m.kind === 'file') {
      root.children!.push({ id: m.path, name: m.path, path: m.path, type: 'file' })
      continue
    }
    const [dir, sub] = m.path.split('/')
    let node = root.children!.find((c) => c.name === dir && c.type === 'dir')
    if (!node) {
      node = { id: dir, name: dir, path: dir, type: 'dir', children: [] }
      root.children!.push(node)
    }
    if (sub) node.children!.push({ id: m.path, name: sub, path: m.path, type: 'dir' })
  }

  // Attach manifests as leaf nodes
  for (const man of manifests) {
    if (!man.content) continue
    const name = man.path.split('/').pop()!
    if (!root.children!.some((c) => c.name === name)) {
      root.children!.push({ id: man.path, name, path: man.path, type: 'file', purpose: undefined })
    }
  }

  return (root.children || []).sort((a, b) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1))
}

function describeModule(m: Module, scan: ScanResult): ModuleInfo {
  const files = m.files
  const names = files.map((f) => f.split('/').pop() || f)
  const entryPoints = [
    ...files.filter((f) => /(index|main|app|server|cli|cli\.ts|bin\/)/.test(f)).slice(0, 3),
    ...files.filter((f) => /\.(cmd|sh)$/.test(f)).slice(0, 2),
  ]

  const purposeParts: string[] = []
  const hasTests = files.some(isTestFile)
  const hasApi = names.some((n) => /api|route|handler|controller/.test(n))
  const hasUi = names.some((n) => /component|view|page|screen/.test(n))
  const hasStore = names.some((n) => /store|state|reducer|slice/.test(n))
  const hasServer = files.some((f) => /server|worker|daemon/i.test(f))
  const hasConfig = names.some((n) => /config|settings|env/.test(n))

  if (hasApi) purposeParts.push('HTTP/API surface')
  if (hasUi) purposeParts.push('UI components/views')
  if (hasStore) purposeParts.push('state management')
  if (hasServer) purposeParts.push('server-side logic or background workers')
  if (hasConfig) purposeParts.push('configuration')
  if (hasTests) purposeParts.push(`tests (${files.filter(isTestFile).length} test files)`)

  const purpose = purposeParts.length
    ? `Module containing ${purposeParts.join(', ')} based on ${files.length} files.`
    : `Zone with ${files.length} files; ${describeFirstFiles(files)}.`

  // Heuristic size → complexity
  const complexity: ModuleInfo['complexity'] =
    files.length >= 40 || (hasApi && hasStore && hasTests) ? 'high' : files.length >= 12 ? 'medium' : 'low'

  // Dependencies: guess from imports within module files' first lines (best-effort, no parsing)
  const deps = new Set<string>()
  for (const f of files.slice(0, 3)) {
    const match = f.match(/^\s*(?:import|from|require)\s*\(?\s*['"]([^'"\s]+)['"]/)
    if (match) deps.add(match[1])
  }

  return {
    path: m.path,
    purpose,
    files: m.files,
    entryPoints: [...new Set(entryPoints)].slice(0, 5),
    dependencies: [...deps].slice(0, 5),
    complexity,
    talkTo: [],
  }
}

function describeFirstFiles(files: string[]): string {
  const preview = files.slice(0, 3).map((f) => f.split('/').pop()).filter(Boolean)
  return preview.length ? `starts with ${preview.join(', ')}` : 'no obvious entry file'
}

function detectFramework(manifests: { path: string; content: string | null }[]): { name: string; details: string } | null {
  const pkg = manifests.find((m) => m.path === 'package.json')?.content
  if (!pkg) return null
  try {
    const parsed = JSON.parse(pkg)
    const allDeps: Record<string, string> = { ...parsed.dependencies, ...parsed.devDependencies }
    const keys = Object.keys(allDeps)
    const hit =
      keys.find((k) => /^next$|^react$|^vue$|^svelte$|^@angular/.test(k)) ||
      keys.find((k) => /vite|webpack|esbuild|express|fastify|nest/i.test(k)) ||
      keys.find((k) => /jest|vitest|mocha|playwright|cypress/i.test(k))
    if (hit) return { name: hit, details: `uses ${hit} (${allDeps[hit]})` }
    return { name: 'npm project', details: 'Node project without an obvious framework' }
  } catch {
    return null
  }
}

function detectPackageManager(manifests: { path: string; content: string | null }[]): string {
  const paths = new Set(manifests.map((m) => m.path))
  if (paths.has('pnpm-lock.yaml')) return 'pnpm'
  if (paths.has('yarn.lock')) return 'yarn'
  if (paths.has('package-lock.json')) return 'npm'
  return 'no lockfile — installs are not reproducible'
}

function generateFirstTasks(scan: ScanResult, modules: ModuleInfo[]): Task[] {
  const tasks: Task[] = []
  const files = scan.topFiles.concat(scan.modules.flatMap((m) => m.files))

  // 1. Untested modules (high-value, beginner friendly)
  const untested = modules.filter((m) => !m.files.some(isTestFile) && m.complexity !== 'high').slice(0, 3)
  if (untested.length > 0 && tasks.length < 3) {
    const m = untested[0]
    tasks.push({
      id: 'task-tests-' + m.path.replace(/\W+/g, '-'),
      title: `Add a test for ${m.path}`,
      description:
        `Many modules here already have test coverage, but ${m.path} has none. ` +
        `Studio the existing ${files.filter(isTestFile).slice(0, 1).map((f) => `"${f}"`).join(', ')}, then add a first test ` +
        `exercising the main entry point (${m.entryPoints[0] || 'the module’s primary function'}).`,
      files: [...m.files.slice(0, 3), ...(files.filter(isTestFile).slice(0, 1))],
      difficulty: 'beginner',
      estimatedTime: '1–2 hours',
      whyItMatters: 'Covers a gap the repo already cares about — ships fast, teaches the harness.',
    })
  }

  // 2. Missing/weak README → documentation pass
  const readme = scan.manifests.find((m) => m.path.toLowerCase().includes('readme'))?.content
  if ((!readme || readme.toLowerCase().includes('getting started') === false) && tasks.length < 3) {
    tasks.push({
      id: 'task-getting-started',
      title: 'Write a “Getting Started” section',
      description:
        'The README doesn’t include a run-it-yourself guide. Capture the setup steps implied by the manifests ' +
        `(${scan.manifests.filter((m) => m.content).map((m) => m.path).slice(0, 3).join(', ')}) ` +
        'and write 5–10 bullet steps a new contributor can follow.',
      files: ['README.md'],
      difficulty: 'beginner',
      estimatedTime: '45 minutes',
      whyItMatters: 'It’s the first thing every new dev reads — your contribution gets seen immediately.',
    })
  }

  // 3. Config inconsistency → cleanup task (intermediate)
  const pm = detectPackageManager(scan.manifests)
  if (pm.includes('no lockfile') && tasks.length < 3) {
    tasks.push({
      id: 'task-lockfile',
      title: 'Commit a lockfile',
      description:
        'Dependencies are declared but no lockfile is committed, so builds aren’t reproducible. ' +
        `Run the appropriate install to generate it (${scan.manifests.find((m) => m.path === 'package.json') ? '`npm install && commit package-lock.json`' : 'your package manager’s lock command'}) and add a CI check that enforces it.`,
      files: [],
      difficulty: 'intermediate',
      estimatedTime: '1 hour',
      whyItMatters: 'Reproducible installs are the difference between “works on my machine” and a mergeable change.',
    })
  }

  // 4. Discovery gap: modules with no entryPoint → undocumented surface
  const orphan = modules.find((m) => m.entryPoints.length === 0 && m.complexity === 'high')
  if (orphan && tasks.length < 3) {
    tasks.push({
      id: 'task-doc-module-' + orphan.path.replace(/\W+/g, '-'),
      title: `Document ${orphan.path}`,
      description:
        'This module is large but has no obvious public entry point. `README`-annotate: what it owns, `entryPoints`, ' +
        `and the files other modules import from it (heaviest dependency: ${orphan.dependencies[0] || 'unknown'}).`,
      files: [...orphan.files.slice(0, 4)],
      difficulty: 'intermediate',
      estimatedTime: '2–3 hours',
      whyItMatters: 'Unblocks every future contributor who touches this area.',
    })
  }

  // 5. Fallback: a curated "first commit" — link a TODO/FIXME found in code
  if (tasks.length < 3) {
    tasks.push({
      id: 'task-refactor-' + (scan.modules[0]?.path || 'repo').replace(/\W+/g, '-'),
      title: 'Greenfield-relevant cleanup',
      description:
        `As a first change, pick the module with the most files (${scan.modules[0]?.path || 'none'}) and ` +
        'extract one repeated convention into a shared helper. Your onboarding package flagged this as ' +
        'the highest-traffic area, so the work is visible and low-risk.',
      files: scan.modules[0] ? scan.modules[0].files.slice(0, 3) : [],
      difficulty: 'intermediate',
      estimatedTime: '2 hours',
      whyItMatters: 'Small, mergeable, visible — the ideal first PR.',
    })
  }

  // Limit to 3, prioritize beginner first
  const score = { beginner: 0, intermediate: 1, advanced: 2 } as const
  return tasks.sort((a, b) => score[a.difficulty] - score[b.difficulty]).slice(0, 3)
}

function generateGlossary(scan: ScanResult, framework: { name: string; details: string } | null): { patterns: GlossaryTerm[]; gotchas: Gotcha[] } {
  const patterns: GlossaryTerm[] = []
  const gotchas: Gotcha[] = []
  const manifests = scan.manifests.filter((m) => m.content)
  const manifestNames = manifests.map((m) => m.path)

  if (framework) {
    patterns.push({
      term: framework.name,
      definition: framework.details + '. The primary framework or tooling this repo is built on.',
    })
  }

  const hasTests = scan.modules.some((m) => m.files.some(isTestFile))
  if (hasTests) {
    patterns.push({
      term: 'test conventions',
      definition: 'Test files live alongside their sources and follow `*.test.*` / `*.spec.*` naming. Coverage is expected for new code.',
    })
  }

  const pm = detectPackageManager(manifests)
  patterns.push({
    term: 'package manager',
    definition: pm.includes('no lockfile') ? pm : 'Committed lockfile via ' + pm + ' — install with `' + pm + ' install`',
  })

  if (manifestNames.some((n) => n.startsWith('packages/') || n === 'pnpm-workspace.yaml' || n === 'lerna.json' || n === 'turbo.json')) {
    patterns.push({
      term: 'monorepo',
      definition: 'This is a multi-package repository. Changes to shared packages must be versioned and released together.',
      example: `pnpm --filter <pkg> …`,
    })
  }

  if (scan.manifests.some((m) => m.path === 'package.json' && /"type":\s*"module"/.test(m.content || ''))) {
    patterns.push({
      term: 'ESM',
      definition: 'The package is ESM (`"type": "module"`). Use `import`/`export`, not `require`.',
      example: 'import { x } from "./x.js"  // note the explicit .js extension',
    })
  }

  // Gotchas
  if (pm.includes('no lockfile')) {
    gotchas.push({
      title: 'No lockfile',
      description: 'Installs are not reproducible; dependency drift breaks CI/between teammates. Fix before major refactors.',
      severity: 'high',
    })
  }
  if (!hasTests) {
    gotchas.push({
      title: 'No test coverage found',
      description: 'This repo has no obvious test files — verify the expected harness before assuming behavior.',
      severity: 'medium',
    })
  }
  gotchas.push({
    title: 'Generated/committed artifacts',
    description: 'Check for committed build output unless the repo policy allows it — most of the surfaced files are source.',
    severity: 'low',
  })

  return { patterns: patterns.slice(0, 6), gotchas: gotchas.slice(0, 4) }
}

function overviewFromScan(scan: ScanResult, framework: { name: string; details: string } | null): string {
  const parts = []
  parts.push(`${scan.fileCount} files, primarily ${scan.language}.`)
  if (framework) parts.push(framework.details + '.')
  const hasTests = scan.modules.some((m) => m.files.some(isTestFile))
  parts.push(hasTests ? 'Tests are present and co-located with sources.' : 'Test coverage is thin — verify behavior directly.')
  if (scan.modules.length <= 15) parts.push('The structure is compact; most work happens in a few core modules.')
  else parts.push(`The codebase spans ${scan.modules.length} top-level modules.`)
  return parts.join(' ')
}

function buildSetup(scan: ScanResult): SetupInfo {
  const pkg = scan.manifests.find((m) => m.path === 'package.json')?.content
  let scripts: { name: string; command: string }[] = []
  let packageManager = 'npm'
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg)
      scripts = Object.entries(parsed.scripts || {})
        .map(([name, command]) => ({ name, command: String(command) }))
        .slice(0, 8)
      if (parsed.packageManager) packageManager = String(parsed.packageManager).split('@')[0]
    } catch { /* ignore */ }
  }

  const paths = new Set(scan.manifests.map((m) => m.path))
  if (paths.has('pnpm-lock.yaml')) packageManager = 'pnpm'
  else if (paths.has('yarn.lock')) packageManager = 'yarn'

  const hasDockerfile = paths.has('Dockerfile') || scan.manifests.some((m) => m.path.startsWith('Dockerfile'))
  const dockerCompose = scan.manifests.find((m) => m.path === 'docker-compose.yml')?.content
  const dockerCommands: string[] = []
  if (dockerCompose) dockerCommands.push('docker compose up')
  else if (hasDockerfile) dockerCommands.push('docker build -t app .', 'docker run app')

  const hasMakefile = paths.has('Makefile')
  const envManifest = scan.manifests.find((m) => /\.env\.(example|sample)$/.test(m.path))
  const envVars = Array.from(new Set(
    (envManifest?.content || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && /^[A-Z_][A-Z0-9_]*\s*=/.test(l))
      .map((l) => l.split('=')[0].trim())
  )).slice(0, 12)

  const installCommand = packageManager === 'pnpm' ? 'pnpm install' : packageManager === 'yarn' ? 'yarn install' : 'npm install'

  return {
    packageManager,
    installCommand,
    scripts,
    envVars,
    hasDockerfile,
    hasMakefile,
    dockerCommands,
  }
}

/**
 * Generate a complete onboarding package deterministically from the scan.
 * `bobAnalysis` (optional) can upgrade module data with Bob 2.0 structured
 * analysis when it's available.
 */
export function generateReport(
  scan: ScanResult,
  repoMeta: { name: string; owner: string; defaultBranch: string },
  bobAnalysis?: BobRepoAnalysis | null,
  startMs = Date.now()
): OnboardingReport {
  const framework = detectFramework(scan.manifests)
  const modules: ModuleInfo[] = scan.modules.map((m) => {
    const bob = bobAnalysis?.modules.find((b) => b.modulePath === m.path)
    if (bob) {
      return {
        path: m.path,
        purpose: bob.purpose,
        files: m.files,
        entryPoints: bob.entryPoints,
        dependencies: bob.dependencies,
        complexity: bob.complexity,
        talkTo: bob.talkTo,
      }
    }
    return describeModule(m, scan)
  })

  const topLanguages = scan.fileCount > 0
    ? [{ name: scan.language, percentage: 100 }]
    : []

  return {
    repo: {
      name: repoMeta.name,
      fullName: repoMeta.owner ? `${repoMeta.owner}/${repoMeta.name}` : repoMeta.name,
      defaultBranch: repoMeta.defaultBranch,
      language: scan.language,
      topLanguages,
      fileCount: scan.fileCount,
      commitCount: 0, // populated on next pass if desired
      description: scan.description || undefined,
    },
    architectureMap: buildArchitectureTree(scan.modules, scan.manifests),
    tour: {
      overview: bobAnalysis?.overview || overviewFromScan(scan, framework),
      modules,
      recommendedOrder: bobAnalysis?.recommendedOrder || modules.sort((a, b) => a.complexity.localeCompare(b.complexity)).map((m) => m.path),
    },
    firstTasks: generateFirstTasks(scan, modules),
    glossary: generateGlossary(scan, framework),
    setup: buildSetup(scan),
    generatedAt: new Date().toISOString(),
    analysisSeconds: Math.max(1, Math.round((Date.now() - startMs) / 1000)),
    modelUsed: process.env.BOB_ENABLED === 'true' ? 'IBM Bob 2.0 (agent mode)' : 'local analyzer (Bob 2.0 pending kickoff access)',
  }
}