import type { GlossaryTerm, Gotcha } from '@/lib/types'

interface Props {
  patterns: GlossaryTerm[]
  gotchas: Gotcha[]
}

const severityStyles: Record<string, string> = {
  low: 'bg-slate-500/10 text-slate-400',
  medium: 'bg-amber-500/10 text-amber-400',
  high: 'bg-red-500/10 text-red-400',
}

export default function Glossary({ patterns, gotchas }: Props) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xl">📖</span>
          <h3 className="text-lg font-semibold">Patterns &amp; Conventions</h3>
        </div>
        <div className="space-y-3">
          {patterns.map((p) => (
            <div key={p.term} className="rounded-lg bg-slate-900 p-4">
              <p className="mb-1 font-mono text-sm font-semibold text-sky-300">{p.term}</p>
              <p className="text-sm text-slate-400">{p.definition}</p>
              {p.example && (
                <code className="mt-2 block rounded bg-slate-800 px-2 py-1 font-mono text-xs text-slate-300">{p.example}</code>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xl">⚠️</span>
          <h3 className="text-lg font-semibold">Gotchas</h3>
        </div>
        <div className="space-y-3">
          {gotchas.map((g) => (
            <div key={g.title} className="rounded-lg bg-slate-900 p-4">
              <div className="mb-1 flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-100">{g.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityStyles[g.severity]}`}>
                  {g.severity}
                </span>
              </div>
              <p className="text-sm text-slate-400">{g.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}