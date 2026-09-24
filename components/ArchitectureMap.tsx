'use client'

import { useState } from 'react'
import type { RepoNode, RepoStats } from '@/lib/types'

interface Props {
  nodes: RepoNode[]
  repo: RepoStats
  sourceSamples: { path: string; content: string }[]
}

function fileUrl(repo: RepoStats, path: string): string {
  return `https://github.com/${repo.fullName}/blob/${repo.defaultBranch}/${path}`
}
function dirUrl(repo: RepoStats, path: string): string {
  const tree = path.split('/').slice(0, -1).join('/')
  return `https://github.com/${repo.fullName}/tree/${repo.defaultBranch}/${tree || ''}`
}

function Tree({
  nodes,
  depth = 0,
  repo,
  sourceMap,
  selectedPath,
  onSelect,
}: {
  nodes: RepoNode[]
  depth: number
  repo: RepoStats
  sourceMap: Map<string, string>
  selectedPath: string | null
  onSelect: (path: string) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  if (nodes.length === 0) return null

  return (
    <div style={{ marginLeft: depth > 0 ? '1.25rem' : undefined }}>
      {nodes.map((node) => {
        const isCollapsed = collapsed.has(node.id)
        const url = node.type === 'file' ? fileUrl(repo, node.path) : dirUrl(repo, node.path)
        const hasContent = sourceMap.has(node.path)
        const isSelected = selectedPath === node.path

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
                <button
                  onClick={() => hasContent && onSelect(node.path)}
                  disabled={!hasContent}
                  className={`flex w-full items-center gap-2 text-left ${
                    hasContent ? 'cursor-pointer' : 'cursor-default opacity-60'
                  }`}
                  title={hasContent ? 'Click to preview' : 'Not in sampled files'}
                >
                  <span className="text-slate-600">·</span>
                  <span
                    className={`font-mono text-xs transition ${
                      isSelected
                        ? 'text-sky-300'
                        : hasContent
                          ? 'text-slate-400 group-hover:text-sky-300'
                          : 'text-slate-600'
                    }`}
                  >
                    {node.name}
                  </span>
                  {hasContent && (
                    <span className="ml-auto rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400 ring-1 ring-emerald-500/30">
                      preview
                    </span>
                  )}
                  {!hasContent && (
                    <span className="ml-auto text-[10px] text-slate-600">open ↗</span>
                  )}
                </button>
              )}
            </div>
            {node.type === 'dir' && !isCollapsed && node.children && (
              <Tree
                nodes={node.children}
                depth={depth + 1}
                repo={repo}
                sourceMap={sourceMap}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
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

export default function ArchitectureMap({ nodes, repo, sourceSamples }: Props) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const sourceMap = new Map<string, string>(sourceSamples.map((s) => [s.path, s.content]))

  const selected = selectedPath ? sourceMap.get(selectedPath) : null

  return (
    <section className="card">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">🗺️</span>
        <h3 className="section-title">Architecture Map</h3>
        <span className="badge ml-2 hidden bg-slate-800 text-slate-400 ring-1 ring-slate-700 sm:inline-flex">
          click a file to preview its source
        </span>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="max-h-[600px] overflow-y-auto pr-2">
          <Tree
            nodes={nodes}
            depth={0}
            repo={repo}
            sourceMap={sourceMap}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
          />
        </div>
        <div className="max-h-[600px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
          {selected ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
                <code className="font-mono text-xs text-sky-300">{selectedPath}</code>
                <a
                  href={fileUrl(repo, selectedPath!)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-sky-400"
                >
                  open on GitHub ↗
                </a>
              </div>
              <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-300">
                {selected.slice(0, 8000)}
              </pre>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
              <div>
                <p className="mb-1 text-2xl">📄</p>
                <p>Click a file in the tree to preview its source code</p>
                <p className="mt-1 text-xs text-slate-600">
                  Files marked with a green badge are available for preview
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}