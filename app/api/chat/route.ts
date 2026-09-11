import { NextRequest, NextResponse } from 'next/server'
import type { OnboardingReport } from '@/lib/types'

export const dynamic = 'force-dynamic'

function heuristics(question: string, report: OnboardingReport): string {
  const q = question.toLowerCase()
  if (q.includes('run') || q.includes('test') || q.includes('how to')) {
    const pkg = report.glossary.patterns.find(p => p.term === 'package manager')?.definition || ''
    const framework = report.glossary.patterns.find(p => ['next','react','vue'].includes(p.term))?.definition || ''
    return `To run this repo (${report.repo.language}): ${pkg}. ${framework} Tests: ${report.tour.overview}`
  }
  if (q.includes('api') || q.includes('route') || q.includes('endpoint')) {
    const api = report.tour.modules.filter(m => m.purpose.toLowerCase().includes('api'))
    if (api.length) return `API modules: ${api.map(m => `${m.path} — ${m.purpose}`).join('; ')}`
    return `No dedicated API module detected. Check: ${report.tour.modules.slice(0,3).map(m=>m.path).join(', ')}`
  }
  if (q.includes('where') || q.includes('find') || q.includes('file')) {
    return `Top modules: ${report.tour.modules.map(m=>m.path).join(', ')}. Recommended order: ${report.tour.recommendedOrder.slice(0,5).join(' → ')}`
  }
  if (q.includes('task') || q.includes('first') || q.includes('pr')) {
    return report.firstTasks.map((t,i)=>`${i+1}. ${t.title} (${t.difficulty}, ${t.estimatedTime}): ${t.description}`).join('\n')
  }
  return `${report.tour.overview} Key gotchas: ${report.glossary.gotchas.map(g=>g.title).join(', ')}. Ask about tests, API, or tasks.`
}

export async function POST(req: NextRequest) {
  try {
    const { question, report } = await req.json()
    if (!question || !report) return NextResponse.json({ error: 'question and report required' }, { status: 400 })
    const answer = heuristics(question, report as OnboardingReport)
    return NextResponse.json({ answer })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
