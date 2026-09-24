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
  const [sourceSamples, setSourceSamples] = useState<{ path: string; content: string }[]>([])
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)

  async function analyze(e: React.FormEvent) {
    e.preventDefault()
    if (!repoUrl.trim()) return
    setStatus('cloning')
    setProgress('Cloning repository…')
    setError('')
    setReport(null)
    setSourceSamples([])
    setCached(false)

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
      setSourceSamples(Array.isArray(data.sourceSamples) ? data.sourceSamples : [])
      setCached(Boolean(data.cached))
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  function analyzeAnother() {
    setRepoUrl('')
    setReport(null)
    setSourceSamples([])
    setError('')
    setStatus('idle')
  }

  const isAnalyzing = status === 'cloning' || status === 'analyzing' || status === 'generating'

  return (
    <main className="mx-auto max-w-5xl px-6">
      {/* Hero */}
      <section className="py-20 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-sky-400">
          AI Onboarding Copilot
        </p>
        <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-6xl">
          Your first PR,{' '}
          <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
            hours early
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400">
          Point it at any codebase. Get an architecture map, a guided tour, real
          GitHub issues to fix, and the glossary of gotchas — in seconds.
        </p>

        {/* URL input */}
        <form onSubmit={analyze} className="mx-auto max-w-xl">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/facebook/react"
              className="input-field"
            />
            <button
              type="submit"
              disabled={isAnalyzing || !repoUrl.trim()}
              className="btn-primary whitespace-nowrap"
            >
              {isAnalyzing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  {status === 'cloning' ? 'Cloning…' : status === 'analyzing' ? 'Analyzing…' : 'Generating…'}
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
                {status === 'analyzing' ? '●' : '✓'} Scan
              </span>
              <span className={status === 'generating' ? 'text-sky-400' : 'text-slate-500'}>
                {status === 'generating' ? '●' : '✓'} Report
              </span>
            </div>
            {progress && <p className="mt-4 text-sm text-slate-500">{progress}</p>}
          </div>
        )}

        {status === 'error' && error && (
          <div className="mx-auto mt-6 max-w-xl rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <p>{error}</p>
            <button
              onClick={analyzeAnother}
              className="mt-2 text-xs font-semibold text-red-300 underline"
            >
              Try again
            </button>
          </div>
        )}
      </section>

      {/* Report */}
      {report && (
        <section className="py-12">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">
              Onboarding package for{' '}
              <span className="text-sky-400">{report.repo.fullName}</span>
            </h2>
            <div className="flex items-center gap-2">
              {cached && (
                <span className="badge bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30">
                  Cached
                </span>
              )}
              <span className="badge bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                Generated in {report.analysisSeconds}s
              </span>
              <button
                onClick={analyzeAnother}
                className="btn-ghost"
              >
                Analyze another →
              </button>
            </div>
          </div>
          <div className="space-y-8">
            <ProgressTracker repo={report.repo.fullName} />
            <GettingStarted setup={report.setup} />
            <ArchitectureMap nodes={report.architectureMap} repo={report.repo} />
            <RepoTour tour={report.tour} />
            <FirstTasks tasks={report.firstTasks} report={report} />
            <Glossary patterns={report.glossary.patterns} gotchas={report.glossary.gotchas} />
            <ReportChat report={report} sourceSamples={sourceSamples} />
          </div>
        </section>
      )}
    </main>
  )
}