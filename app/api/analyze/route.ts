import { NextRequest, NextResponse } from 'next/server'
import { cloneRepo, listFiles, getFile, cleanupRepo } from '@/lib/clone'
import { scanRepo } from '@/lib/scanner'
import { analyzeWithBob } from '@/lib/bob'
import { generateReport } from '@/lib/report'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function isValidGitUrl(url: string): boolean {
  return /^(https?:\/\/|git@)[^\s]+$/.test(url)
}

export async function POST(req: NextRequest) {
  const startMs = Date.now()
  let repo: Awaited<ReturnType<typeof cloneRepo>> | null = null

  try {
    const body = await req.json().catch(() => ({}))
    const repoUrl = typeof body?.repoUrl === 'string' ? body.repoUrl.trim() : ''

    if (!repoUrl) {
      return NextResponse.json({ error: 'A git URL is required' }, { status: 400 })
    }
    if (!isValidGitUrl(repoUrl)) {
      return NextResponse.json({ error: 'That doesn\u2019t look like a valid git URL' }, { status: 400 })
    }

    // 1. Clone / fetch the tree
    repo = await cloneRepo(repoUrl)

    // 2. Scan structure
    const scan = await scanRepo(repo)
    if (scan.modules.length === 0 && scan.fileCount === 0) {
      throw new Error('Repo appears empty or unreadable')
    }

    // 3. Optional Bob 2.0 deep pass (parallel subagents per module)
    let bobAnalysis = null
    if (process.env.BOB_ENABLED === 'true') {
      bobAnalysis = await analyzeWithBob(repo.root, scan.modules)
    }

    // 4. Generate the onboarding package
    const report = generateReport(
      scan,
      { name: repo.name, owner: repo.owner, defaultBranch: repo.defaultBranch },
      bobAnalysis,
      startMs
    )

    return NextResponse.json({ report })
  } catch (err) {
    console.error('[analyze]', err)
    const message = err instanceof Error ? err.message : 'Analysis failed'
    const status = /not found|couldn't clone|invalid|empty/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  } finally {
    if (repo) await cleanupRepo(repo).catch(() => {})
  }
}

// Root-language sanity check used by the scanner-import above in dev; keep tree-shakeable.
void listFiles
void getFile