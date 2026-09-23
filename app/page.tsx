'use client'

import { useState } from 'react'
import type { OnboardingReport } from '@/lib/types'
import ArchitectureMap from '@/components/ArchitectureMap'
import RepoTour from '@/components/RepoTour'
import FirstTasks from '@/components/FirstTasks'
import Glossary from '@/components/Glossary'
import GettingStarted from '@/components/GettingStarted'
import ReportChat from '@/components/ReportChat'
import ProgressTracker from '@/components/ProgressTracker'

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'cloning' | 'analyzing' | 'generating' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState('')
  const [report, setReport] = useState<OnboardingReport | null>(null)
  const [error, setError] = useState('')

  async function analyze(e: React.FormEvent) {
    e.preventDefault()
    if (!repoUrl.trim()) return
    setStatus('cloning')
    setProgress('Cloning repository…')
    setError('')
    setReport(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Analysis failed')
      }

      const data = await res.json()
      setReport(data.report)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const isAnalyzing = status === 'cloning' || status === 'analyzing' || status === 'generating'

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-sky-400">
            AI Onboarding Copilot
          </p>
          <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-6xl">
            Your first PR,{' '}
            <span className="bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
              hours early
            </span>
          </h1>
          <p className="mb-10 text-lg text-slate-400">
            Point it at any codebase. Get an architecture map, a guided tour, your first 3 tasks,
            and the glossary of gotchas — in seconds.
          </p>

          {/* URL input */}
          <form onSubmit={analyze} className="mx-auto max-w-xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/facebook/react"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
              <button
                type="submit"
                disabled={isAnalyzing || !repoUrl.trim()}
                className="rounded-lg bg-sky-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    {status === 'cloning' ? 'Cloning…' : status === 'analyzing' ? 'Bob is analyzing…' : 'Generating…'}
                  </span>
                ) : (
                  'Generate onboarding'
                )}
              </button>
            </div>
          </form>

          {/* Progress steps */}
          {isAnalyzing && (
            <div className="mx-auto mt-8 max-w-xl">
              <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: status === 'cloning' ? '20%' : status === 'analyzing' ? '60%' : '90%',
                  }}
                />
              </div>
              <div className="flex justify-center gap-6 text-xs font-medium text-slate-400">
                <span className={status === 'cloning' ? 'text-sky-400' : 'text-slate-500'}>
                  {status === 'cloning' ? '●' : '✓'} Clone
                </span>
                <span className={status === 'analyzing' ? 'text-sky-400' : 'text-slate-500'}>
                  {status === 'analyzing' ? '●' : '✓'} Bob subagents
                </span>
                <span className={status === 'generating' ? 'text-sky-400' : 'text-slate-500'}>
                  {status === 'generating' ? '●' : '✓'} Report
                </span>
              </div>
              {progress && <p className="mt-4 text-sm text-slate-500">{progress}</p>}
            </div>
          )}

          {status === 'error' && error && (
            <p className="mx-auto mt-6 max-w-xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
      </section>

      {/* Report */}
      {report && (
        <section className="px-6 py-12">
          <div className="mx-auto max-w-5xl space-y-12">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Onboarding package for <span className="text-sky-400">{report.repo.fullName}</span>
              </h2>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                Generated in {report.analysisSeconds}s
              </span>
            </div>
            <ProgressTracker repo={report.repo.fullName} />
            <GettingStarted setup={report.setup} />
            <ArchitectureMap nodes={report.architectureMap} repo={report.repo} />
            <RepoTour tour={report.tour} />
            <FirstTasks tasks={report.firstTasks} />
            <Glossary patterns={report.glossary.patterns} gotchas={report.glossary.gotchas} />
            <ReportChat report={report} />
          </div>
        </section>
      )}
    </main>
  )
}