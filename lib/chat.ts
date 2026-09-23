import type { OnboardingReport } from './types'
import { heuristics } from './heuristics'

/**
 * Real LLM-backed chat for the onboarding report.
 *
 * Design:
 * - Provider-agnostic: prefers OpenAI-compatible endpoints, falls back to
 *   Anthropic, then to the existing keyword heuristics.
 * - Never throws: any failure degrades gracefully to heuristics so the UI
 *   always gets an answer.
 * - Grounded: we send the report + sampled source files, so the model can
 *   answer with real code context instead of guessing.
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatContext {
  report: OnboardingReport
  sourceMap: Map<string, string>
  history: ChatMessage[]
  question: string
}

export interface ChatResult {
  answer: string
  provider: 'llm' | 'heuristic'
  citations?: string[]
}

const SYSTEM_PROMPT = `You are an onboarding copilot for a developer joining a codebase.
You have been given a structured onboarding report (architecture, modules, tasks, setup, glossary)
plus sampled source files from the repo.

Answer the user's question using ONLY the provided context. Be concrete:
- Cite file paths when you reference code.
- If something isn't in the context, say so and point them at the most likely place to look.
- Prefer short, actionable answers. This is a CLI-flavored tool, not a lecture.
- If asked to run/install/test, quote the exact commands from the setup section.`

function buildUserPrompt(ctx: ChatContext): string {
  const report = ctx.report
  const sourceEntries = [...ctx.sourceMap.entries()]
    .slice(0, 10)
    .map(([p, c]) => `--- ${p} ---\n${c.slice(0, 1500)}`)
    .join('\n\n')

  const history = ctx.history
    .slice(-6)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n')

  return `REPO: ${report.repo.fullName}
OVERVIEW: ${report.tour.overview}
SETUP: install=${report.setup.installCommand}, pm=${report.setup.packageManager}, scripts=${report.setup.scripts.map(s => s.name).join(',')}
MODULES:
${report.tour.modules.map(m => `- ${m.path}: ${m.purpose} [${m.complexity}]`).join('\n')}
GOTCHAS: ${report.glossary.gotchas.map(g => `${g.title}: ${g.description}`).join(' | ')}
TASKS: ${report.firstTasks.map(t => `${t.title} (${t.difficulty})`).join(' | ')}

SAMPLED SOURCE:
${sourceEntries || '(no source samples available)'}

CONVERSATION HISTORY:
${history || '(no prior messages)'}

USER QUESTION: ${ctx.question}
`
}

async function tryOpenAI(ctx: ChatContext): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const model = process.env.CHAT_MODEL || 'gpt-4o-mini'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(ctx) },
      ],
      max_tokens: 800,
      temperature: 0.2,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.choices?.[0]?.message?.content?.trim() || null
}

async function tryAnthropic(ctx: ChatContext): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(ctx) }],
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  const block = data?.content?.find((b: any) => b.type === 'text')
  return block?.text?.trim() || null
}

/** Pull file paths mentioned in an answer as citations. */
function extractCitations(text: string, sourceMap: Map<string, string>): string[] {
  const found = new Set<string>()
  for (const [path] of sourceMap) {
    const basename = path.split('/').pop()!
    if (text.includes(path) || text.includes(basename)) found.add(path)
  }
  return [...found].slice(0, 5)
}

export async function chat(ctx: ChatContext): Promise<ChatResult> {
  // Try OpenAI first (most common), then Anthropic, then heuristics.
  const llmAnswer = (await tryOpenAI(ctx)) ?? (await tryAnthropic(ctx))
  if (llmAnswer) {
    return {
      answer: llmAnswer,
      provider: 'llm',
      citations: extractCitations(llmAnswer, ctx.sourceMap),
    }
  }

  // Fallback: deterministic heuristics (no external call)
  const answer = heuristics(ctx.question, ctx.report)
  return { answer, provider: 'heuristic' }
}