import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    groq: process.env.GROQ_API_KEY ? `set (len=${process.env.GROQ_API_KEY.length})` : 'MISSING',
    nodeEnv: process.env.NODE_ENV,
    buildId: process.env.NEXT_BUILD_ID || 'unknown',
  })
}