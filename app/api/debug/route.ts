import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    groq: process.env.GROQ_API_KEY ? `set (len=${process.env.GROQ_API_KEY.length})` : 'MISSING',
    openai: process.env.OPENAI_API_KEY ? 'set' : 'missing',
    anthropic: process.env.ANTHROPIC_API_KEY ? 'set' : 'missing',
    github: process.env.GITHUB_TOKEN ? 'set' : 'missing',
    nodeEnv: process.env.NODE_ENV,
  })
}