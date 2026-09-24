import { NextRequest, NextResponse } from 'next/server'
import { fetchRealIssues } from '@/lib/issues'
import type { OnboardingReport } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const owner = typeof body?.owner === 'string' ? body.owner.trim() : ''
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const report = body?.report as OnboardingReport | undefined

    if (!owner || !name) {
      return NextResponse.json({ error: 'owner and name are required' }, { status: 400 })
    }

    const { issues, error } = await fetchRealIssues(owner, name, {
      tour: report?.tour || { modules: [] },
    })

    return NextResponse.json({ issues, error: error || null })
  } catch (e) {
    console.error('[issues]', e)
    return NextResponse.json({ issues: [], error: 'Failed to fetch issues' }, { status: 500 })
  }
}