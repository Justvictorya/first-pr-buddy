import fs from 'fs'
import path from 'path'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import os from 'os'

export interface ClonedRepo {
  /** Absolute path to the cloned tree */
  root: string
  name: string
  owner: string
  defaultBranch: string
  via: 'github-api' | 'git'
}

export interface RepoFile {
  path: string
  content: string
}

export class RepoError extends Error {}

function parseGitUrl(url: string): { owner: string; name: string } | null {
  const m = url.match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/i)
  if (m) return { owner: m[1], name: m[2] }
  return null
}

/** Download a GitHub repo's full file tree via the API (fast on serverless, no git needed). */
async function cloneViaGitHubApi(url: string): Promise<ClonedRepo> {
  const parsed = parseGitUrl(url)
  if (!parsed) throw new RepoError('Only GitHub URLs are supported right now')

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`

  const repoRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.name}`, { headers })
  if (repoRes.status === 404) throw new RepoError(`Repo not found: ${parsed.owner}/${parsed.name}`)
  if (!repoRes.ok) throw new RepoError(`GitHub API returned ${repoRes.status}`)

  const repo = await repoRes.json()
  const defaultBranch = repo.default_branch
  const treeSha = repo.treeSha || await getDefaultTreeSha(parsed.owner, parsed.name, defaultBranch, headers)

  const treeRes = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.name}/git/trees/${treeSha}?recursive=1`,
    { headers }
  )
  if (!treeRes.ok) throw new RepoError('Failed to fetch repo tree')
  const tree = await treeRes.json()

  const paths: string[] = tree.tree
    .filter((e: { type: string; path: string }) => e.type === 'blob')
    .map((e: { path: string }) => e.path)

  return {
    root: '', // content is fetched lazily via getFile
    name: parsed.name,
    owner: parsed.owner,
    defaultBranch,
    via: 'github-api',
    _paths: paths,
  } as ClonedRepo & { _paths: string[] }
}

async function getDefaultTreeSha(owner: string, name: string, branch: string, headers: Record<string, string>): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/git/trees/${branch}`, { headers })
  if (!res.ok) throw new RepoError('Failed to resolve default branch')
  const data = await res.json()
  return data.sha
}

/** Use the GitHub API for a single file's content. Fallback: read from local clone. */
export async function getFile(cloned: ClonedRepo, filePath: string): Promise<string | null> {
  // Strip _paths type hack
  const viaApi = (cloned as any).via === 'github-api'

  if (viaApi && (cloned as any).root === '') {
    const res = await fetch(
      `https://api.github.com/repos/${cloned.owner}/${cloned.name}/contents/${filePath}?ref=${cloned.defaultBranch}`,
      {
        headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      }
    )
    if (res.status === 404) return null
    if (!res.ok) throw new RepoError(`Failed to fetch ${filePath} (${res.status})`)
    const data = await res.json()
    if (data.encoding === 'base64') {
      // Binary / encoded file — still return it; analyzers can detect and skip
      return Buffer.from(data.content, 'base64').toString('utf-8')
    }
    return data.content || null
  }

  try {
    const full = path.join(cloned.root, filePath)
    const stat = await fs.promises.stat(full)
    if (!stat.isFile()) return null
    return await fs.promises.readFile(full, 'utf-8')
  } catch {
    return null
  }
}

/** List all tracked file paths (GitHub API mode). For local clones, walk the tree. */
export async function listFiles(cloned: ClonedRepo): Promise<string[]> {
  if (cloned.via === 'github-api') {
    const paths = (cloned as any)._paths as string[] | undefined
    if (paths) return paths
  }

  const out: string[] = []
  async function walk(dir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else out.push(path.relative(cloned.root, full))
    }
  }
  await walk(cloned.root)
  return out
}

const IGNORED_TOP_LEVEL = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage'])

/**
 * Clone any git URL. Uses the GitHub API (fast, no system git) for github.com URLs,
 * falls back to a shallow isomorphic-git clone otherwise.
 */
export async function cloneRepo(url: string): Promise<ClonedRepo> {
  const parsed = parseGitUrl(url)
  if (parsed && !process.env.DISABLE_GITHUB_API) {
    // Prefer API mode for speed
    try {
      return await cloneViaGitHubApi(url)
    } catch {
      // fall through to real clone
    }
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'firstprb-'))
  const name = parsed ? parsed.name : url.split('/').pop()?.replace(/\.git$/, '') || 'repo'

  try {
    await git.clone({
      fs,
      http,
      dir,
      url,
      singleBranch: true,
      depth: 1,
    })
  } catch (err) {
    throw new RepoError(`Failed to clone ${url}. Make sure it's a valid public git URL.`)
  }

  const defaultBranch = await git.currentBranch({ fs, dir })

  // Prune heavy dirs to keep analysis fast
  await Promise.all(
    Array.from(IGNORED_TOP_LEVEL).map((d) =>
      fs.promises.rm(path.join(dir, d), { recursive: true, force: true })
    )
  )

  return { root: dir, name, owner: parsed?.owner || '', defaultBranch: defaultBranch || 'main', via: 'git' }
}

export async function cleanupRepo(repo: ClonedRepo) {
  if (repo.via === 'git' && repo.root) {
    await fs.promises.rm(repo.root, { recursive: true, force: true }).catch(() => {})
  }
}