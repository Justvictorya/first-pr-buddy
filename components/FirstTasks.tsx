import PRPreview from './PRPreview'
import type { Task } from '@/lib/types'

interface Props {
  tasks: Task[]
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

export default function FirstTasks({ tasks }: Props) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xl">🎯</span>
        <h3 className="text-lg font-semibold">Your First 3 Tasks</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {tasks.map((task, i) => (
          <div key={task.id} className="relative rounded-lg border border-slate-800 bg-slate-900 p-5">
            <div className="absolute -top-3 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-white">
              {i + 1}
            </div>
            <div className="mb-3 mt-2">
              <span
                className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${difficultyStyles[task.difficulty]}`}
              >
                {difficultyIcons[task.difficulty]} {task.difficulty}
              </span>
              <span className="ml-2 text-[10px] text-slate-500">~{task.estimatedTime}</span>
            </div>
            <h4 className="mb-2 text-sm font-semibold text-slate-100">{task.title}</h4>
            <p className="mb-3 text-xs leading-relaxed text-slate-400">{task.description}</p>
            <p className="mb-3 text-xs text-sky-300/80">
              <span className="font-semibold text-sky-300">Why it matters:</span> {task.whyItMatters}
            </p>
            {task.files.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.files.slice(0, 3).map((f) => (
                  <code key={f} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{f}</code>
                ))}
                {task.files.length > 3 && (
                  <span className="text-[10px] text-slate-500">+{task.files.length - 3} more</span>
                )}
              </div>
            )}
            <PRPreview task={task} />
          </div>
        ))}
      </div>
    </section>
  )
}