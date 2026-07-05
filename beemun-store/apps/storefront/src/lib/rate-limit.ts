import { NextRequest, NextResponse } from "next/server"

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

const buckets = new Map<string, { count: number; resetAt: number }>()

export const ipOf = (request: NextRequest) =>
  String(
    request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown"
  )
    .split(",")[0]
    .trim()
    .toLowerCase()

export const rateLimitKey = (
  request: NextRequest,
  scope: string,
  identity?: string | null
) => `${scope}:${String(identity || ipOf(request)).trim().toLowerCase()}`

export const checkRateLimit = ({ key, limit, windowMs }: RateLimitOptions) => {
  const now = Date.now()
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  current.count += 1
  buckets.set(key, current)

  if (current.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  return { allowed: true, retryAfter: 0 }
}

export const rateLimitedResponse = (retryAfter: number) =>
  NextResponse.json(
    {
      message: "Too many requests. Please wait a moment and try again.",
      code: "rate_limited",
      retry_after: retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
      },
    }
  )
