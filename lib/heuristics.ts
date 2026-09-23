import type { OnboardingReport } from './types'

/**
 * Deterministic keyword-based chat fallback.
 *
 * Used when no LLM provider is configured (no OPENAI_API_KEY / ANTHROPIC_API_KEY).
 * Pure function — no network, no state. Always returns an answer.
 */

export function hasWord(q: string, w: string) {
  return new RegExp(`\\b${w}\\b`).test(q)
}

export function heuristics(question: string, report: OnboardingReport): string {
  const q = question.toLowerCase()
  const identity = `${report.repo.fullName} (owner: ${report.repo.fullName.split('/')[0]}, repo name: ${report.repo.name})`
  if (q.includes('username') || q.includes('user name') || q.includes('owner') || q.includes('who') || q.includes('repo name') || q.includes('project name') || q.includes('name of the')) {
    return `This is ${identity} — ${report.repo.description || report.tour.overview}`
  }
  if (q.includes('run') || q.includes('how to') || q.includes('install') || hasWord(q, 'test')) {
    const s = report.setup
    const dev = s.scripts.find(x => /\bdev\b|develop|start/.test(x.name))
    const testCmd = s.scripts.find(x => /\btest/.test(x.name))
    const parts = [`Install: ${s.installCommand}`, ...(dev ? [`Dev: ${s.packageManager} run ${dev.name}`] : []), ...(testCmd ? [`Test: ${s.packageManager} run ${testCmd.name}`] : [])]
    if (!parts.length) parts.push(`Uses ${s.packageManager} — no scripts detected in package.json`)
    if (s.hasDockerfile) parts.push('Also ships a Dockerfile')
    return `How to run ${identity}:\n${parts.join('\n')}`
  }
  if (hasWord(q, 'api') || hasWord(q, 'route') || hasWord(q, 'endpoint')) {
    const api = report.tour.modules.filter(m => m.purpose.toLowerCase().includes('api'))
    const core = report.tour.modules.filter(m => !m.path.startsWith('.')).slice(0,3).map(m=>m.path).join(', ')
    if (api.length) return `API modules: ${api.map(m => `${m.path} — ${m.purpose}`).join('; ')}`
    return `No dedicated API module in this repo. Core modules: ${core || report.tour.modules.slice(0,3).map(m=>m.path).join(', ')}`
  }
  if (q.includes('env') || q.includes('config') || q.includes('secret') || q.includes('key')) {
    return report.setup.envVars.length
      ? `Requires env vars: ${report.setup.envVars.join(', ')} (see .env.example)`
      : 'No .env.example found — env vars likely documented in README instead. Check: README.md, manifests.'
  }
  if (hasWord(q, 'where') || hasWord(q, 'find') || hasWord(q, 'file')) {
    const core = report.tour.modules.filter(m => !m.path.startsWith('.'))
    return `Top modules: ${core.slice(0,5).map(m=>m.path).join(', ')}. Recommended order: ${report.tour.recommendedOrder.filter(p=>!p.startsWith('.')).slice(0,5).join(' → ')}`
  }
  if (hasWord(q, 'task') || (hasWord(q, 'first') && hasWord(q, 'pr')) || hasWord(q, 'todo')) {
    return report.firstTasks.map((t,i)=>`${i+1}. ${t.title} (${t.difficulty}, ${t.estimatedTime}): ${t.description}`).join('\n')
  }
  return `${identity} — ${report.tour.overview} Key gotchas: ${report.glossary.gotchas.map(g=>g.title).join(', ')}. Ask about owner, tests, API, env vars, or tasks.`
}