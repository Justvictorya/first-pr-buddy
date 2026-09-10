'use client'

import { useState } from 'react'
import type { RepoNode } from '@/lib/types'

interface Props {
  nodes: RepoNode[]
}

function Tree({ nodes, depth = 0 }: { nodes: RepoNode[]; depth: number }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (nodes.length === 0) return null

  return (
    <div style={{ marginLeft: depth > 0 ? '1rem' : undefined }}>
      {nodes.map((node) => {
        const isCollapsed = collapsed.has(node.id)
        return (
          <div key={node.id} className="mb-0.5">
            <button
              onClick={() => {
                const next = new Set(collapsed)
                if (next.has(node.id)) next.delete(node.id)
                else next.add(node.id)
                setCollapsed(next)
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left transition hover:bg-slate-800/60"
            >
              <span className="text-slate-500">{node.type === 'dir' ? (isCollapsed ? '▸' : '▾') : '·'}</span>
              <span className={`font-mono text-xs ${node.type === 'dir' ? 'font-semibold text-sky-300' : 'text-slate-300'}`}>
                {node.name}
              </span>
              {node.type === 'dir' && node.children && (
                <span className="ml-auto text-[10px] text-slate-500">{node.children.length}</span>
              )}
            </button>
            {node.type === 'dir' && !isCollapsed && node.children && (
              <Tree nodes={node.children} depth={depth + 1} />
            )}
            {node.purpose && !isCollapsed && (
              <p className="ml-6 mt-0.5 rounded bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400">
                {node.purpose}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ArchitectureMap({ nodes }: Props) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">🗺️</span>
        <h3 className="text-lg font-semibold">Architecture Map</h3>
      </div>
      <Tree nodes={nodes} depth={0} />
    </section>
  )
}