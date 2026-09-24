'use client'

import { useState } from 'react'
import type { SetupInfo } from '@/lib/types'

export default function GettingStarted({ setup }: { setup: SetupInfo }) {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(text)
      setTimeout(() => setCopied(null), 1200)
    })
  }

  const rows: { label: string; cmd: string }[] = [
    { label: 'Install deps', cmd: setup.installCommand },
    ...setup.scripts.slice(0, 3).map((s) => ({ label: `Run ${s.name}`, cmd: `${setup.packageManager} run ${s.name}` })),
    ...(setup.dockerCommands ? setup.dockerCommands.map((c) => ({ label: 'Docker', cmd: c })) : []),
  ]

  return (
    <section className="card">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">🚀</span>
        <h3 className="section-title">Getting Started</h3>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Commands <span className="normal-case text-slate-600">(click to copy)</span>
          </p>
          <div className="space-y-2">
            {rows.map((r) => (
              <button
                key={r.label}
                onClick={() => copy(r.cmd)}
                className="group flex w-full items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-left transition hover:border-sky-500/40 hover:bg-slate-900"
              >
                <span className="text-xs text-slate-500">{r.label}</span>
                <code className="font-mono text-xs text-emerald-300 group-hover:text-sky-300">
                  {copied === r.cmd ? '✓ copied' : r.cmd}
                </code>
              </button>
            ))}
          </div>
        </div>
        <div>
          {setup.envVars.length > 0 ? (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Required env vars
              </p>
              <div className="flex flex-wrap gap-1.5">
                {setup.envVars.map((v) => (
                  <button
                    key={v}
                    onClick={() => copy(v)}
                    className="rounded-lg bg-amber-500/10 px-2 py-1 font-mono text-xs text-amber-300 ring-1 ring-amber-500/20 transition hover:bg-amber-500/20"
                    title="copy variable name"
                  >
                    {v}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Copy <code className="text-slate-400">.env.example</code> → <code className="text-slate-400">.env.local</code>, fill in the values.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">
              No <code className="text-slate-500">.env.example</code> found — the README likely documents any required variables.
            </p>
          )}
          {setup.hasMakefile && (
            <p className="mt-3 text-xs text-slate-500">
              This repo also ships a <code className="text-slate-400">Makefile</code> — check its targets for the canonical dev workflow.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}