import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

const buckets = new Map<string, { count: number; resetAt: number }>()

const headerValue = (req: MedusaRequest, name: string) => {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

export const ipOf = (req: MedusaRequest) => {
  const forwarded = headerValue(req, "x-forwarded-for")
  return String(forwarded || headerValue(req, "x-real-ip") || req.ip || "unknown")
    .split(",")[0]
    .trim()
    .toLowerCase()
}

export const rateLimitKeyFor = (
  req: MedusaRequest,
  scope: string,
  identity?: string | null
) => `${scope}:${String(identity || ipOf(req)).trim().toLowerCase()}`

export const enforceRateLimit = (
  req: MedusaRequest,
  res: MedusaResponse,
  options: RateLimitOptions
) => {
  const now = Date.now()
  const existing = buckets.get(options.key)

  if (!existing || existing.resetAt <= now) {
    buckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs,
    })
    return true
  }

  existing.count += 1
  buckets.set(options.key, existing)

  if (existing.count > options.limit) {
    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    res.setHeader("Retry-After", String(retryAfter))
    res.status(429).json({
      message: "Too many requests. Please wait a moment and try again.",
      code: "rate_limited",
      retry_after: retryAfter,
    })
    return false
  }

  return true
}
