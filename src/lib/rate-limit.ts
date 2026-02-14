import { NextRequest } from 'next/server'

// Simple in-memory rate limiter (per-instance). For prod scale use Redis.
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  limit: number
  resetTime: number
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp =
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-client-ip')
  return realIp || 'unknown'
}

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs
    rateLimitMap.set(identifier, { count: 1, resetTime })
    return { allowed: true, remaining: limit - 1, limit, resetTime }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, limit, resetTime: record.resetTime }
  }

  record.count += 1
  return {
    allowed: true,
    remaining: Math.max(0, limit - record.count),
    limit,
    resetTime: record.resetTime,
  }
}

export function buildRateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
  }
}
