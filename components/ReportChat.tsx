'use client'
import { useState } from 'react'
import type { OnboardingReport } from '@/lib/types'

export default function ReportChat({ report }: { report: OnboardingReport }) {
  const [q, setQ] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])
  const [loading, setLoading] = useState(false)

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim() || loading) return
    const question = q.trim()
    setQ('')
    setMessages(m => [...m, { role: 'user', text: question }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, report }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', text: data.answer || 'No answer' }])
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
      </div>
      <div className="mb-4 max-h-64 space-y-3 overflow-y-auto rounded-lg bg-slate-950 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">Try: "how do I run tests?" or "where is the API?"</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'bg-sky-500/10 text-sky-200' : 'bg-slate-800 text-slate-300'}`}>
            <span className="mr-2 text-xs font-semibold uppercase opacity-60">{m.role}</span>
            {m.text}
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
        <button disabled={loading || !q.trim()} className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          Ask
        </button>
      </form>
    </section>
  )
}
