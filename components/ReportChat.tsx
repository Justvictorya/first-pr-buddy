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
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">💬</span>
        <h3 className="text-lg font-semibold">Ask about this repo</h3>
        {messages.length > 0 && (
          <span className="ml-2 text-xs text-slate-500">
            Powered by Groq AI (free) · answers grounded in the files I read
          </span>
        )}
      </div>
      <div className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-slate-950 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Try: "how do I run tests?" or "where is the API?" or "what does the auth module do?"
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className="space-y-1">
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                m.role === 'user' ? 'bg-sky-500/10 text-sky-200' : 'bg-slate-800 text-slate-300'
              }`}
            >
              <span className="mr-2 text-xs font-semibold uppercase opacity-60">{m.role}</span>
              {m.text}
            </div>
            {m.label && m.role === 'assistant' && (
              <span className="ml-3 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
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
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
        />
        <button
          disabled={loading || !q.trim()}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </section>
  )
}