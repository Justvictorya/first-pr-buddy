'use client'
import { useEffect, useState } from 'react'
import type { OnboardingReport, Task } from '@/lib/types'

export interface RealIssue {
  number: number
  title: string
  htmlUrl: string
  labels: string[]
  fitReason: string
  matchedFiles: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
}

const difficultyStyles: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  advanced: 'bg-red-500/10 text-red-400 border-red-500/30',
}

const difficultyIcons: Record<string, string> = {
  beginner: '🌱',
  intermediate: '🔧',
  advanced: '🚀',
}

export default function FirstTasks({
  tasks,
  report,
}: {
  tasks: Task[]
  report: OnboardingReport
}) {
  const [realIssues, setRealIssues] = useState<RealIssue[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const parts = report.repo.fullName.split('/')
        if (parts.length !== 2) {
          setLoading(false)
          return
        }
        const res = await fetch('/api/issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner: parts[0], name: parts[1], report }),
        })
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        if (!cancelled) {
          setRealIssues(data.issues || [])
          setError(data.error || null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [report.repo.fullName])

  const hasRealIssues = (realIssues?.length || 0) > 0
  const displayItems = hasRealIssues ? realIssues! : tasks
  const isRealIssues = hasRealIssues

  return (
    <section className="card">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xl">🎯</span>
        <h3 className="section-title">Your First 3 Tasks</h3>
        {isRealIssues && (
          <span className="ml-2 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-400">
            Real issues
          </span>
        )}
        {!isRealIssues && !loading && (
          <span className="ml-2 rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Suggested tasks
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-sky-500" />
          Finding good first issues…
        </div>
      )}

      {error && !loading && (
        <p className="mb-4 text-xs text-amber-400/80">
          Could not fetch live issues ({error}). Showing suggested tasks instead.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {displayItems.slice(0, 3).map((item: any, i) => {
          const isIssue = isRealIssues
          const title = isIssue ? `#${item.number} ${item.title}` : item.title
          const description = isIssue ? item.fitReason : item.description
          const files = isIssue ? item.matchedFiles : item.files
          const difficulty = item.difficulty
          const time = item.estimatedTime
          const url = isIssue ? item.htmlUrl : null

          return (
            <div key={isIssue ? `issue-${item.number}` : item.id} className="relative rounded-lg border border-slate-800 bg-slate-900 p-5">
              <div className="absolute -top-3 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-white">
                {i + 1}
              </div>
              <div className="mb-3 mt-2">
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${difficultyStyles[difficulty]}`}>
                  {difficultyIcons[difficulty]} {difficulty}
                </span>
                <span className="ml-2 text-[10px] text-slate-500">~{time}</span>
              </div>
              <h4 className="mb-2 text-sm font-semibold text-slate-100">
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-sky-400">
                    {title}
                  </a>
                ) : (
                  title
                )}
              </h4>
              <p className="mb-3 text-xs leading-relaxed text-slate-400">{description}</p>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {files.slice(0, 3).map((f: string) => (
                    <code key={f} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{f}</code>
                  ))}
                  {files.length > 3 && (
                    <span className="text-[10px] text-slate-500">+{files.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}