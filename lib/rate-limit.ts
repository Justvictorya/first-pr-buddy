/**
 * Simple per-IP rate limiter for the chat endpoint.
 *
 * In-memory only (single-process). For multi-instance deployments, replace
 * this with a Redis-backed store. Limits are intentionally generous so a
 * legitimate onboarding session never hits them, while spammy visitors get
 * a friendly "try again in a bit" message.
 *
 * Default: 20 messages per 60-minute sliding window per IP.
 */

const WINDOW_MS = 60 * 60 * 1000 // 1 hour
const MAX_MESSAGES = 20

interface IpState {
  count: number
  windowStart: number
}

const store = new Map<string, IpState>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInMs: number
  message?: string
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now()
  const key = ip || 'unknown'
  const state = store.get(key)

  // Expire old entries lazily
  if (state && now - state.windowStart > WINDOW_MS) {
    store.delete(key)
  }

  const current = store.get(key) ?? { count: 0, windowStart: now }

  if (current.count >= MAX_MESSAGES) {
    const resetInMs = WINDOW_MS - (now - current.windowStart)
    return {
      allowed: false,
      remaining: 0,
      resetInMs,
      message: "You've reached the chat limit for this hour. Try again in a bit — or refresh the page to start a new onboarding session.",
    }
  }

  current.count += 1
  store.set(key, current)

  return {
    allowed: true,
    remaining: MAX_MESSAGES - current.count,
    resetInMs: WINDOW_MS - (now - current.windowStart),
  }
}

export function rateLimitStats() {
  return { windowMs: WINDOW_MS, maxMessages: MAX_MESSAGES, trackedIps: store.size }
}