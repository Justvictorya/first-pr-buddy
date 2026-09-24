'use client'
import { useState } from 'react'
import type { OnboardingReport } from '@/lib/types'

export type SourceSample = { path: string; content: string }

export default function ReportChat({
  report,
  sourceSamples = [],
}: {
  report: OnboardingReport
  sourceSamples?: SourceSample[]
}) {
  const [q, setQ] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; label?: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const [retryAfter, setRetryAfter] = useState('')

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim() || loading) return
    const question = q.trim()
    setQ('')
    setMessages(m => [...m, { role: 'user', text: question }])
    setLoading(true)
    setRateLimited(false)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          report,
          sourceSamples,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.text })),
        }),
      })
      if (res.status === 429) {
        const data = await res.json()
        const secs = Math.ceil((data.retryAfterMs || 60000) / 1000)
        setRetryAfter(secs > 60 ? `${Math.ceil(secs / 60)} min` : `${secs}s`)
        setRateLimited(true)
        setMessages(m => [...m, { role: 'assistant', text: "You've reached the chat limit for this hour. Try again in a bit — or refresh the page to start a new onboarding session." }])
        return
      }
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', text: data.answer || 'No answer', label: data.providerLabel }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Failed to answer — try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="card">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">💬</span>
        <h3 className="section-title">Ask about this repo</h3>
        <span className="ml-2 text-xs text-slate-500">
          Powered by Groq AI (free) · answers grounded in the files I read
        </span>
      </div>
      <div className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-slate-950/60 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Try: "how do I run tests?" or "where is the API?" or "what does the auth module do?"
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="space-y-1">
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                m.role === 'user' ? 'bg-sky-500/10 text-sky-200' : 'bg-slate-800/80 text-slate-300'
              }`}
            >
              <span className="mr-2 text-xs font-semibold uppercase opacity-60">{m.role}</span>
              {m.text}
            </div>
            {m.label && m.role === 'assistant' && (
              <span className="ml-3 badge bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                {m.label}
              </span>
            )}
          </div>
        ))}
        {loading && <p className="text-sm text-slate-500">Thinking…</p>}
      </div>
      <form onSubmit={ask} className="flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Ask anything about the codebase…"
          className="input-field"
        />
        <button
          disabled={loading || !q.trim()}
          className="btn-primary whitespace-nowrap"
        >
          Ask
        </button>
      </form>
    </section>
  )
}