import { listFiles, getFile, type ClonedRepo } from './clone'

const MANIFEST_FILES = [
  'package.json', 'README.md', 'pyproject.toml', 'setup.py', 'Cargo.toml',
  'go.mod', 'requirements.txt', 'Gemfile', 'composer.json', 'build.gradle',
  'pom.xml', 'Dockerfile', 'docker-compose.yml', '.github/workflows',
  'Makefile', 'CODEOWNERS', 'CONTRIBUTING.md', 'LICENSE', 'AGENTS.md',
  '.env.example', '.env.sample',
]

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'coverage', 'vendor',
  '.venv', 'venv', '__pycache__', 'target', '.gradle', 'public',
])

export interface Module {
  path: string
  kind: 'dir' | 'file'
  files: string[]
  isEntry: boolean
}

export interface ScanResult {
  language: string
  manifests: { path: string; content: string | null }[]
  description: string | null
  modules: Module[]
  fileCount: number
  topFiles: string[]
  /** Sampled source files (path → content) for LLM context. Capped & prioritized. */
  sourceSamples: { path: string; content: string }[]
}

const LANGUAGE_HINTS: { ext: string; name: string }[] = [
  { ext: '.ts', name: 'TypeScript' },
  { ext: '.tsx', name: 'TypeScript/React' },
  { ext: '.js', name: 'JavaScript' },
  { ext: '.py', name: 'Python' },
  { ext: '.go', name: 'Go' },
  { ext: '.rs', name: 'Rust' },
  { ext: '.rb', name: 'Ruby' },
  { ext: '.java', name: 'Java' },
  { ext: '.c', name: 'C' },
  { ext: '.cpp', name: 'C++' },
  { ext: '.php', name: 'PHP' },
  { ext: '.swift', name: 'Swift' },
]

export async function scanRepo(repo: ClonedRepo): Promise<ScanResult> {
  const files = await listFiles(repo)
  const codeFiles = files.filter((f) => !f.includes('/node_modules/') && !/\.(lock|min\.js|map)$/.test(f))
  const realFiles = codeFiles.length > 0 ? codeFiles : files

  // Detect language
  const extCount: Record<string, number> = {}
  for (const f of realFiles) {
    const ext = '.' + f.split('.').pop()!
    extCount[ext] = (extCount[ext] || 0) + 1
  }
  const topExt = Object.entries(extCount).sort((a, b) => b[1] - a[1])[0]
  const language = LANGUAGE_HINTS.find((h) => h.ext === topExt?.[0])?.name
    || (topExt ? topExt[0].replace('.', '').toUpperCase() : 'Unknown')

  // Read manifests (parallel)
  const manifests = await Promise.all(
    MANIFEST_FILES.map(async (mf) => {
      const find = async (p: string): Promise<string | null> => {
        if (realFiles.includes(p) || files.includes(p)) return p
        // allow trailing-slash dirs to resolve to index
        if (p.endsWith('/')) {
          for (const f of realFiles) if (f.startsWith(p)) return f
        }
        return null
      }
      const hit = await find(mf)
      if (!hit) return { path: mf, content: null as string | null }
      const content = await getFile(repo, hit)
      // Skip binary junk
      if (content !== null && content.includes('\u0000')) return { path: mf, content: null }
      return { path: hit, content: content && content.length > 200_000 ? content.slice(0, 200_000) : content }
    })
  )

  // README for description
  const readme = manifests.find((m) => m.path.toLowerCase().includes('readme'))
  const readmeText = readme?.content || ''
  const descMatch = readmeText.match(/^#\s+.+\n\n?([^\n]+)/m) || readmeText.match(/^([^\n\]`\"')]{20,200})$/m)

  // Build modules: top-level dirs plus README on the root
  const topLevelDirs = [...new Set(realFiles.map((f) => f.split('/')[0]).filter((d) => !SKIP_DIRS.has(d)).filter((d) => d.includes('.')))].slice(0, 40)
  const modulePaths = new Set(realFiles.map((f) => f.includes('/') ? f.split('/').slice(0, 2).join('/') : f))

  const HIDDEN_TOP = new Set(['.github', '.claude', '.codesandbox', '.vscode', '.idea'])
  const modules: Module[] = []
  const seen = new Set<string>()
  for (const f of realFiles) {
    const top = f.split('/')[0]
    const isHiddenFile = f.startsWith('.') && !f.includes('/')
    const isHiddenDir = HIDDEN_TOP.has(top) || (top.startsWith('.') && f.includes('/'))
    if (isHiddenFile || isHiddenDir) continue
    const parts = f.split('/')
    if (parts.length === 1) {
      const key = f
      if (seen.has(key)) continue
      seen.add(key)
      modules.push({ path: f, kind: 'file', files: [f], isEntry: true })
    } else {
      const key = parts.slice(0, 2).join('/')
      if (seen.has(key)) continue
      seen.add(key)
      const dirFiles = realFiles.filter((x) => x.startsWith(key + '/')).slice(0, 80)
      modules.push({ path: key, kind: 'dir', files: dirFiles, isEntry: false })
    }
    if (modules.length >= 30) break
  }

  // Keep manifest files + entry points visible at top level
  const topFiles = [
    ...realFiles.filter((f) => !f.includes('/') && /\.(exec|cmd)$/.test(f)).slice(0, 10),
    'package.json', 'README.md',
  ].filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 40)
  void topLevelDirs

  // Sample representative source files for LLM context.
  // Priority: entry points, then files in the largest modules, capped by size & count.
  const sourceSamples = await sampleSources(repo, realFiles, modules)

  return {
    language,
    manifests,
    description: descMatch ? descMatch[1].slice(0, 300) : null,
    modules,
    fileCount: realFiles.length,
    topFiles,
    sourceSamples,
  }
}

/**
 * Pick up to `MAX_SAMPLES` representative source files and read their contents.
 * Prioritizes entry points (index/main/app) and files from the largest modules,
 * skips test files and anything over the per-file byte cap.
 */
const MAX_SAMPLES = 12
const MAX_SAMPLE_BYTES = 8_000

async function sampleSources(
  repo: ClonedRepo,
  files: string[],
  modules: Module[]
): Promise<{ path: string; content: string }[]> {
  const isTest = (f: string) => /\.(test|spec)\./.test(f) || /(__tests__|\/tests?\/)/.test(f)
  const isSource = (f: string) => /\.(ts|tsx|js|jsx|py|go|rs|rb|java|c|cpp|php|swift|kt)$/.test(f)

  const candidates = files
    .filter((f) => isSource(f) && !isTest(f) && !f.includes('/node_modules/'))
    .sort((a, b) => {
      // entry points first
      const aEntry = /(index|main|app|server|cli)\.(ts|tsx|js|jsx|py|go)$/.test(a) ? 0 : 1
      const bEntry = /(index|main|app|server|cli)\.(ts|tsx|js|jsx|py|go)$/.test(b) ? 0 : 1
      if (aEntry !== bEntry) return aEntry - bEntry
      // then by module size (larger modules first)
      const aMod = modules.find((m) => m.files.includes(a))
      const bMod = modules.find((m) => m.files.includes(b))
      return (bMod?.files.length || 0) - (aMod?.files.length || 0)
    })

  const seen = new Set<string>()
  const samples: { path: string; content: string }[] = []
  for (const f of candidates) {
    if (samples.length >= MAX_SAMPLES) break
    const dir = f.split('/').slice(0, 2).join('/')
    if (seen.has(dir) && samples.length > 2) continue // spread across modules after entries
    seen.add(f)
    const content = await getFile(repo, f)
    if (content === null) continue
    const trimmed = content.length > MAX_SAMPLE_BYTES ? content.slice(0, MAX_SAMPLE_BYTES) : content
    samples.push({ path: f, content: trimmed })
  }
  return samples
}