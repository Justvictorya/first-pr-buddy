'use client'

import { useState } from 'react'
import type { RepoNode, RepoStats } from '@/lib/types'

interface Props {
  nodes: RepoNode[]
  repo: RepoStats
}

function fileUrl(repo: RepoStats, path: string): string {
  return `https://github.com/${repo.fullName}/blob/${repo.defaultBranch}/${path}`
}
function dirUrl(repo: RepoStats, path: string): string {
  const tree = path.split('/').slice(0, -1).join('/')
  return `https://github.com/${repo.fullName}/tree/${repo.defaultBranch}/${tree || ''}`
}

function Tree({ nodes, depth = 0, repo }: { nodes: RepoNode[]; depth: number; repo: RepoStats }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (nodes.length === 0) return null

  return (
    <div style={{ marginLeft: depth > 0 ? '1.25rem' : undefined }}>
      {nodes.map((node) => {
        const isCollapsed = collapsed.has(node.id)
        const url = node.type === 'file' ? fileUrl(repo, node.path) : dirUrl(repo, node.path)
        return (
          <div key={node.id} className="mb-0.5">
            <div className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-800/60">
              {node.type === 'dir' ? (
                <button
                  onClick={() => {
                    const next = new Set(collapsed)
                    if (next.has(node.id)) next.delete(node.id)
                    else next.add(node.id)
                    setCollapsed(next)
                  }}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="text-slate-500 transition group-hover:text-sky-400">
                    {isCollapsed ? '▸' : '▾'}
                  </span>
                  <span className="font-mono text-xs font-semibold text-sky-300">
                    {node.name}
                  </span>
                  {node.children && (
                    <span className="ml-auto rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {node.children.length}
                    </span>
                  )}
                </button>
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-2 no-underline"
                >
                  <span className="text-slate-600">·</span>
                  <span className="font-mono text-xs text-slate-400 transition group-hover:text-sky-300">
                    {node.name}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-600 opacity-0 transition group-hover:opacity-100">
                    ↗ open
                  </span>
                </a>
              )}
            </div>
            {node.type === 'dir' && !isCollapsed && node.children && (
              <Tree nodes={node.children} depth={depth + 1} repo={repo} />
            )}
            {node.type === 'file' && node.purpose && (
              <p className="ml-7 mt-0.5 rounded-lg bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400">
                {node.purpose}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ArchitectureMap({ nodes, repo }: Props) {
  return (
    <section className="card">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">🗺️</span>
        <h3 className="section-title">Architecture Map</h3>
        <span className="badge ml-2 hidden bg-slate-800 text-slate-400 ring-1 ring-slate-700 sm:inline-flex">
          click a file to open it on GitHub
        </span>
      </div>
      <Tree nodes={nodes} depth={0} repo={repo} />
    </section>
  )
}