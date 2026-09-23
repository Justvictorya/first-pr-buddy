import type { OnboardingReport } from './types'

/**
 * In-memory analysis cache keyed by normalized repo URL + branch.
 *
 * Why: cloning + scanning a repo takes seconds. Re-analyzing the same repo
 * (e.g. when a user refreshes or asks follow-ups) should be instant.
 *
 * Limits:
 * - Bounded size (MAX_ENTRIES) so memory doesn't grow unbounded.
 * - TTL so stale analyses expire.
 * - Per-entry byte cap so a huge report can't balloon memory.
 */
const MAX_ENTRIES = 50
const TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_REPORT_BYTES = 2 * 1024 * 1024 // 2 MB

interface CacheEntry {
  report: OnboardingReport
  sourceSamples: { path: string; content: string }[]
  sourceMap: Map<string, string>
  storedAt: number
}

const store = new Map<string, CacheEntry>()

function keyFor(repoUrl: string, branch?: string): string {
  // Normalize: strip trailing .git, slashes, lowercase host
  let u = repoUrl.trim().replace(/\.git$/i, '').toLowerCase()
  if (branch) u += `@${branch}`
  return u
}

export function setCache(repoUrl: string, branch: string | undefined, entry: Omit<CacheEntry, 'storedAt'>) {
  const k = keyFor(repoUrl, branch)
  // Evict oldest if at capacity
  if (store.size >= MAX_ENTRIES && !store.has(k)) {
    const firstKey = store.keys().next().value
    if (firstKey) store.delete(firstKey)
  }
  store.set(k, { ...entry, storedAt: Date.now() })
}

export function getCache(repoUrl: string, branch?: string): CacheEntry | null {
  const entry = store.get(keyFor(repoUrl, branch))
  if (!entry) return null
  if (Date.now() - entry.storedAt > TTL_MS) {
    store.delete(keyFor(repoUrl, branch))
    return null
  }
  return entry
}

/** Build a lookup map from file path → content for fast chat lookups. */
export function buildSourceMap(
  samples: { path: string; content: string }[]
): Map<string, string> {
  const m = new Map<string, string>()
  for (const s of samples) m.set(s.path, s.content)
  return m
}

/** Serialize a report for the client, capping its size. */
export function serializeReport(report: OnboardingReport): OnboardingReport {
  const s = JSON.stringify(report)
  if (s.length <= MAX_REPORT_BYTES) return report
  // Trim glossary & tasks to fit — keep architecture + setup intact
  return {
    ...report,
    glossary: { patterns: report.glossary.patterns.slice(0, 3), gotchas: report.glossary.gotchas.slice(0, 2) },
    firstTasks: report.firstTasks.slice(0, 2),
  }
}

export function cacheStats() {
  return { size: store.size, max: MAX_ENTRIES, ttlMs: TTL_MS }
}