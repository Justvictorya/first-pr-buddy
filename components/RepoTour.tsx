import type { OnboardingReport } from '@/lib/types'

interface Props {
  tour: OnboardingReport['tour']
}

const complexityColors: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-400',
  medium: 'bg-amber-500/10 text-amber-400',
  high: 'bg-red-500/10 text-red-400',
}

export default function RepoTour({ tour }: Props) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">🧭</span>
        <h3 className="text-lg font-semibold">Guided Repo Tour</h3>
      </div>
      <p className="mb-6 text-sm leading-relaxed text-slate-400">{tour.overview}</p>

      {tour.recommendedOrder.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Suggested reading order
          </p>
          <div className="flex flex-wrap gap-2">
            {tour.recommendedOrder.map((item, i) => (
              <span key={item} className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                <span className="text-sky-400">{i + 1}.</span>
                <span className="font-mono">{item}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tour.modules.map((module) => (
          <details key={module.path} className="group rounded-lg border border-slate-800 bg-slate-900 p-4">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
              <span className="font-mono text-sm font-semibold text-sky-300">{module.path}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${complexityColors[module.complexity]}`}>
                {module.complexity} complexity
              </span>
              <span className="text-xs text-slate-500">{module.files.length} files</span>
            </summary>
            <div className="mt-3 space-y-3 text-sm">
              <p className="text-slate-400">{module.purpose}</p>
              {module.entryPoints.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Entry points</p>
                  <div className="flex flex-wrap gap-1.5">
                    {module.entryPoints.map((f) => (
                      <code key={f} className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-emerald-400">{f}</code>
                    ))}
                  </div>
                </div>
              )}
              {module.talkTo.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Talks to</p>
                  <div className="flex flex-wrap gap-1.5">
                    {module.talkTo.map((f) => (
                      <code key={f} className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-amber-300">{f}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}