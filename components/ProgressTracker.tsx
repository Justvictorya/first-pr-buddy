'use client'
import { useEffect, useState } from 'react'

const STEPS = [
  { id: 'clone', label: 'Cloned & scanned repo' },
  { id: 'tour', label: 'Completed guided tour' },
  { id: 'task1', label: 'Finished task 1' },
  { id: 'task2', label: 'Finished task 2' },
  { id: 'task3', label: 'Finished task 3' },
  { id: 'pr', label: 'Opened first PR' },
]

export default function ProgressTracker({ repo }: { repo: string }) {
  const key = `progress:${repo}`
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]')
      setDone(new Set(saved))
    } catch {}
  }, [key])

  function toggle(id: string) {
    const next = new Set(done)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setDone(next)
    localStorage.setItem(key, JSON.stringify([...next]))
  }

  const pct = Math.round((done.size / STEPS.length) * 100)

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">✅</span>
          <h3 className="text-lg font-semibold">Onboarding progress</h3>
        </div>
        <span className="text-sm font-semibold text-emerald-400">{pct}%</span>
      </div>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-2">
        {STEPS.map(s => (
          <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-900 px-3 py-2 hover:bg-slate-800">
            <input type="checkbox" checked={done.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-500" />
            <span className={`text-sm ${done.has(s.id) ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{s.label}</span>
          </label>
        ))}
      </div>
    </section>
  )
}
