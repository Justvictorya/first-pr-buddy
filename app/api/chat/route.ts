import { NextRequest, NextResponse } from 'next/server'
import type { OnboardingReport } from '@/lib/types'
import { chat } from '@/lib/chat'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface ChatBody {
  question?: string
  report?: OnboardingReport
  sourceSamples?: { path: string; content: string }[]
  history?: { role: 'user' | 'assistant'; content: string }[]
}

export async function POST(req: NextRequest) {
  // Per-IP rate limit (20 messages / hour)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || 'unknown'
  const limit = checkRateLimit(ip)
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: limit.message,
        rateLimited: true,
        retryAfterMs: limit.resetInMs,
      },
      { status: 429 }
    )
  }

  try {
    const body = (await req.json()) as ChatBody
    const { question, report, sourceSamples, history } = body

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ error: 'A question is required' }, { status: 400 })
    }
    if (!report) {
      return NextResponse.json({ error: 'Report context is required' }, { status: 400 })
    }

    const sourceMap = new Map<string, string>()
    if (Array.isArray(sourceSamples)) {
      for (const s of sourceSamples) {
        if (s?.path && s?.content) sourceMap.set(s.path, s.content)
      }
    }

    const result = await chat({
      report,
      sourceMap,
      history: Array.isArray(history) ? history.slice(-8) : [],
      question: question.trim(),
    })

    // Map internal provider names to UI-friendly labels
    const label =
      result.provider === 'ollama' ? 'Ollama AI'
      : result.provider === 'openai' ? 'OpenAI'
      : result.provider === 'anthropic' ? 'Anthropic'
      : 'Offline mode'

    return NextResponse.json({
      answer: result.answer,
      provider: result.provider,
      providerLabel: label,
      citations: result.citations,
      remaining: limit.remaining,
    })
  } catch (e) {
    console.error('[chat]', e)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}