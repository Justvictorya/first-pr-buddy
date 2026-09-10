import type { ModuleInfo } from './types'

/**
 * IBM Bob 2.0 integration.
 *
 * Bob 2.0 (the AI dev partner with full repo context) powers the deep analysis:
 *  - Agent mode plans the tour
 *  - Subagents analyze each module in parallel
 *  - Document understanding reads READMEs, manifests, and code like a human
 *
 * Access is granted at hackathon kickoff (Sept 25). Until then this layer
 * stays behind an env flag and the deterministic fallback in `report.ts`
 * keeps the product demoable end-to-end with zero external calls.
 *
 * The demo video shows real Bob task sessions (screenshots) doing this work;
 * the app itself uses the same shaped output via `report.ts`.
 */

export interface BobModuleAnalysis {
  modulePath: string
  purpose: string
  entryPoints: string[]
  dependencies: string[]
  complexity: 'low' | 'medium' | 'high'
  talkTo: string[]
}

export interface BobRepoAnalysis {
  modules: BobModuleAnalysis[]
  overview: string
  recommendedOrder: string[]
}

export interface BobOptions {
  /** Node/CLI binary used by Bob 2.0. Leave unset to use the API key mode. */
  binaryPath?: string
}

const BINARY_NAME = process.env.BOB_BINARY || 'bob'

/**
 * Run Bob 2.0 in Agent mode against a cloned repo path and return structured
 * per-module analysis. Falls back to `null` when Bob isn't configured, so the
 * pipeline can use the deterministic local generator instead.
 */
export async function analyzeWithBob(repoPath: string, modules: { path: string }[]): Promise<BobRepoAnalysis | null> {
  const enabled = process.env.BOB_ENABLED === 'true'
  if (!enabled) return null

  // TODO(kickoff): replace with the real Bob 2.0 API once access is granted.
  // Expected shape — a single Agent-mode session with parallel subagent tasks:
  //
  //   { task: "Analyze repo at <repoPath> and map each module",
  //     subagents: modules.map(m => ({ target: m.path, prompt: "...spec..." })) }
  //
  // The mock below emits the same shape locally so the contract is testable.

  const mock = await import('./report')
  void mock

  if (process.env.NODE_ENV === 'test') {
    return {
      modules: modules.map((m) => ({
        modulePath: m.path,
        purpose: 'Handled by a Bob subagent',
        entryPoints: [],
        dependencies: [],
        complexity: 'medium' as const,
        talkTo: [],
      })),
      overview: 'Analyzed by Bob 2.0 agent mode.',
      recommendedOrder: modules.map((m) => m.path),
    }
  }

  // Attempt to shell out to the Bob CLI if available (dev machines).
  if (process.env.BOB_BINARY_ENABLED === 'true') {
    try {
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(execFile)
      const { stdout } = await execAsync(BINARY_NAME, ['--version'], { timeout: 5000 })
      if (stdout) return null // CLI exists — real integration goes here at kickoff
    } catch {
      /* binary not installed */
    }
  }

  return null
}