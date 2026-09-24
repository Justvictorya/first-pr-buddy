import type { OnboardingReport } from './types'
import { heuristics } from './heuristics'

/**
 * LLM-backed chat for the onboarding report.
 *
 * Provider order (all optional, all free-first):
 *   1. Groq        — OpenAI-compatible, free tier, model llama-3.3-70b-versatile
 *   2. OpenAI      — paid, optional override
 *   3. Anthropic   — paid, optional override
 *   4. Heuristics  — offline keyword fallback, always works
 *
 * Any failure (no key, network error, rate-limited) degrades to heuristics
 * so the UI always returns an answer.
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
  provider: 'groq' | 'openai' | 'anthropic' | 'heuristic'
  citations?: string[]
}

const SYSTEM_PROMPT = `You are an onboarding copilot for a developer joining a codebase.
You have been given a structured onboarding report (architecture, modules, tasks, setup, glossary)
plus sampled source files from the repo.

STRICT RULES:
- Answer ONLY using the report and the source samples provided below.
- If the answer is not in those files, say exactly: "I can't see that in the files I read. Try asking about the modules listed, or check the architecture map."
- Do NOT guess, do NOT invent file paths, do NOT assume behavior you haven't seen.
- Cite file paths when you reference code.
- Prefer short, actionable answers. This is a CLI-flavored tool, not a lecture.
- If asked to run/install/test, quote the exact commands from the setup section.`

function buildUserPrompt(ctx: ChatContext): string {
  const report = ctx.report
  const sourceEntries = [...ctx.sourceMap.entries()]
    .slice(0, 12)
    .map(([p, c]) => `--- ${p} ---\n${c.slice(0, 2000)}`)
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

SAMPLED SOURCE FILES (the only code I can see):
${sourceEntries || '(no source samples available)'}

CONVERSATION HISTORY:
${history || '(no prior messages)'}

USER QUESTION: ${ctx.question}`
}

async function tryOpenAICompatible(
  ctx: ChatContext,
  endpoint: string,
  apiKey: string,
  model: string,
  authHeader: string
): Promise<string | null> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [authHeader]: `Bearer ${apiKey}`,
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

async function tryGroq(ctx: ChatContext): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  return tryOpenAICompatible(
    ctx,
    'https://api.groq.com/openai/v1/chat/completions',
    apiKey,
    model,
    'Authorization'
  )
}

async function tryOpenAI(ctx: ChatContext): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  const model = process.env.CHAT_MODEL || 'gpt-4o-mini'
  return tryOpenAICompatible(
    ctx,
    'https://api.openai.com/v1/chat/completions',
    apiKey,
    model,
    'Authorization'
  )
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
  const block = data?.content?.find((b: { type: string }) => b.type === 'text')
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
  // Groq first (free, default), then paid providers, then offline heuristics.
  const groqAnswer = await tryGroq(ctx)
  if (groqAnswer) {
    return {
      answer: groqAnswer,
      provider: 'groq',
      citations: extractCitations(groqAnswer, ctx.sourceMap),
    }
  }

  const openaiAnswer = await tryOpenAI(ctx)
  if (openaiAnswer) {
    return {
      answer: openaiAnswer,
      provider: 'openai',
      citations: extractCitations(openaiAnswer, ctx.sourceMap),
    }
  }

  const anthropicAnswer = await tryAnthropic(ctx)
  if (anthropicAnswer) {
    return {
      answer: anthropicAnswer,
      provider: 'anthropic',
      citations: extractCitations(anthropicAnswer, ctx.sourceMap),
    }
  }

  // Fallback: deterministic heuristics (no external call)
  const answer = heuristics(ctx.question, ctx.report)
  return { answer, provider: 'heuristic' }
}