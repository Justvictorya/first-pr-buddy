'use client'
import { useState } from 'react'
import type { Task } from '@/lib/types'

function mockDiff(task: Task): string {
  if (task.id.startsWith('task-tests')) {
    return `diff --git a/${task.files[0] || 'src/example.test.ts'} b/${task.files[0] || 'src/example.test.ts'}\n+describe('${task.title}', () => {\n+  it('should work', () => {\n+    expect(true).toBe(true)\n+  })\n+})`
  }
  if (task.id === 'task-getting-started') {
    return `diff --git a/README.md b/README.md\n+## Getting Started\n+1. npm install\n+2. npm run dev\n+3. npm test`
  }
  if (task.id === 'task-lockfile') {
    return `diff --git a/package-lock.json b/package-lock.json\n+{ "lockfileVersion": 3, ... 12k lines }`
  }
  return `diff --git a/${task.files[0] || 'README.md'} b/${task.files[0] || 'README.md'}\n+// ${task.title}\n+// ${task.description.slice(0,60)}`
}

export default function PRPreview({ task }: { task: Task }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="text-xs font-semibold text-sky-400 hover:text-sky-300">
        {open ? 'Hide diff' : 'Preview PR diff →'}
      </button>
      {open && (
        <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs leading-relaxed text-emerald-300">
          {mockDiff(task)}
        </pre>
      )}
    </div>
  )
}
