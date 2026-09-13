import { NextRequest, NextResponse } from 'next/server'
import type { OnboardingReport } from '@/lib/types'

export const dynamic = 'force-dynamic'

function hasWord(q: string, w: string) {
  return new RegExp(`\\b${w}\\b`).test(q)
}

function heuristics(question: string, report: OnboardingReport): string {
  const q = question.toLowerCase()
  if (q.includes('username') || q.includes('owner') || hasWord(q, 'who')) {
    return `Repo: ${report.repo.fullName} (owner: ${report.repo.fullName.split('/')[0]}, name: ${report.repo.name}) — ${report.repo.description || report.tour.overview}`
  }
  if (q.includes('run') || q.includes('how to') || hasWord(q, 'test')) {
    const pkg = report.glossary.patterns.find(p => p.term === 'package manager')?.definition || ''
    const framework = report.glossary.patterns.find(p => ['next','react','vue'].includes(p.term))?.definition || ''
    return `To run this repo (${report.repo.language}): ${pkg}. ${framework} Tests: ${report.tour.overview}`
  }
  if (hasWord(q, 'api') || hasWord(q, 'route') || hasWord(q, 'endpoint')) {
    const api = report.tour.modules.filter(m => m.purpose.toLowerCase().includes('api'))
    const core = report.tour.modules.filter(m => !m.path.startsWith('.')).slice(0,3).map(m=>m.path).join(', ')
    if (api.length) return `API modules: ${api.map(m => `${m.path} — ${m.purpose}`).join('; ')}`
    return `No dedicated API module in this repo. Core modules: ${core || report.tour.modules.slice(0,3).map(m=>m.path).join(', ')}`
  }
  if (hasWord(q, 'where') || hasWord(q, 'find') || hasWord(q, 'file')) {
    const core = report.tour.modules.filter(m => !m.path.startsWith('.'))
    return `Top modules: ${core.slice(0,5).map(m=>m.path).join(', ')}. Recommended order: ${report.tour.recommendedOrder.filter(p=>!p.startsWith('.')).slice(0,5).join(' → ')}`
  }
  if (hasWord(q, 'task') || (hasWord(q, 'first') && hasWord(q, 'pr')) || hasWord(q, 'todo')) {
    return report.firstTasks.map((t,i)=>`${i+1}. ${t.title} (${t.difficulty}, ${t.estimatedTime}): ${t.description}`).join('\n')
  }
  return `${report.tour.overview} Key gotchas: ${report.glossary.gotchas.map(g=>g.title).join(', ')}. Ask about owner, tests, API, or tasks.`
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
