/**
 * Fetch real "good first issue" / "help wanted" issues for a repo via the
 * GitHub REST API, and match them to the modules/files in the onboarding report.
 *
 * - Unauthenticated requests are rate-limited to 60/hour; set GITHUB_TOKEN
 *   in the environment for 5,000/hour and private repo access.
 * - Skips issues that are already assigned or have a linked PR.
 * - Never throws: any failure returns an empty list so the page still renders.
 */

export interface RealIssue {
  number: number
  title: string
  htmlUrl: string
  labels: string[]
  assignees: string[]
  body: string
  createdAt: string
  /** Why this issue is a good fit for a new contributor. */
  fitReason: string
  /** Files/modules from the report most relevant to this issue. */
  matchedFiles: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
}

const GITHUB_API = 'https://api.github.com'

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'first-pr-buddy',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

/** Fetch issues for a repo, filtered to good-first-issue / help-wanted. */
async function fetchIssues(
  owner: string,
  name: string
): Promise<RealIssue[]> {
  const labels = ['good first issue', 'help wanted']
  const out: RealIssue[] = []

  for (const label of labels) {
    const url = `${GITHUB_API}/repos/${owner}/${name}/issues?labels=${encodeURIComponent(
      label
    )}&state=open&per_page=25&sort=created&direction=desc`
    const res = await fetch(url, { headers: authHeaders() })
    if (!res.ok) continue // try the other label, or return empty
    const data = await res.json()
    if (!Array.isArray(data)) continue

    for (const item of data) {
      // Skip pull requests (the issues endpoint returns them too)
      if (item.pull_request) continue
      // Skip assigned issues
      if (Array.isArray(item.assignees) && item.assignees.length > 0) continue
      // Skip issues with a linked PR (heuristic: PRs in comments or body)
      const body = (item.body || '').toLowerCase()
      const title = (item.title || '').toLowerCase()
      if (/(pull request|#\d+\s*(?:pr|pull))/.test(body + ' ' + title)) continue

      out.push({
        number: item.number,
        title: item.title,
        htmlUrl: item.html_url,
        labels: Array.isArray(item.labels) ? item.labels.map((l: { name: string }) => l.name) : [],
        assignees: Array.isArray(item.assignees) ? item.assignees.map((a: { login: string }) => a.login) : [],
        body: item.body || '',
        createdAt: item.created_at,
        fitReason: '',
        matchedFiles: [],
        difficulty: label === 'good first issue' ? 'beginner' : 'intermediate',
        estimatedTime: label === 'good first issue' ? '1–2 hours' : '2–4 hours',
      })
    }
  }

  return out
}

/** Score how relevant a file path is to an issue, based on keyword overlap. */
function scoreFileRelevance(filePath: string, issueText: string): number {
  const pathLower = filePath.toLowerCase()
  const parts = pathLower.split('/')
  let score = 0
  // Whole-path match is strong
  if (issueText.includes(pathLower)) score += 10
  // Directory match is medium
  for (const p of parts) {
    if (p.length > 2 && issueText.includes(p)) score += 3
  }
  // Extension match is weak but useful
  const ext = pathLower.split('.').pop()
  if (ext && issueText.includes(ext)) score += 1
  return score
}

/**
 * Match issues to the report's modules/files. Returns issues with
 * fitReason and matchedFiles populated, sorted by best fit.
 */
export function matchIssuesToReport(
  issues: RealIssue[],
  report: { tour: { modules: { path: string; files: string[]; purpose: string }[] } }
): RealIssue[] {
  const allFiles: string[] = []
  for (const m of report.tour.modules) {
    allFiles.push(m.path)
    for (const f of m.files) allFiles.push(f)
  }

  return issues
    .map((issue) => {
      const text = `${issue.title} ${issue.body}`.toLowerCase()
      const scored = allFiles
        .map((f) => ({ file: f, score: scoreFileRelevance(f, text) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((s) => s.file)

      const matched = scored.length > 0 ? scored : []

      // Build a fit reason
      let fitReason: string
      if (matched.length > 0) {
        const modulePath = matched[0].includes('/') ? matched[0].split('/').slice(0, 2).join('/') : matched[0]
        fitReason = `Labeled "${issue.labels.find((l) => l === 'good first issue' || l === 'help wanted') || 'community'}" and touches code in ${modulePath} — a great first contribution.`
      } else {
        fitReason = `Labeled "${issue.labels.find((l) => l === 'good first issue' || l === 'help wanted') || 'community'}" — a good fit for a new contributor, though we couldn't pinpoint the exact files.`
      }

      return { ...issue, matchedFiles: matched, fitReason }
    })
    .sort((a, b) => {
      // beginner first, then by number of matched files
      const order = { beginner: 0, intermediate: 1, advanced: 2 }
      if (order[a.difficulty] !== order[b.difficulty]) return order[a.difficulty] - order[b.difficulty]
      return b.matchedFiles.length - a.matchedFiles.length
    })
}

/** Main entry: fetch + match issues for a repo. Safe — never throws. */
export async function fetchRealIssues(
  owner: string,
  name: string,
  report: { tour: { modules: { path: string; files: string[]; purpose: string }[] } }
): Promise<{ issues: RealIssue[]; error: string | null }> {
  try {
    const raw = await fetchIssues(owner, name)
    if (raw.length === 0) return { issues: [], error: null }
    const matched = matchIssuesToReport(raw, report)
    return { issues: matched, error: null }
  } catch (e) {
    return { issues: [], error: e instanceof Error ? e.message : 'Failed to fetch issues' }
  }
}