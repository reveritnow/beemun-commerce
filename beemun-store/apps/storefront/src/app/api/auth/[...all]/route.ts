import { toNextJsHandler } from "better-auth/next-js"
import { auth } from "../../../../lib/auth"
import {
  checkRateLimit,
  rateLimitedResponse,
  rateLimitKey,
} from "../../../../lib/rate-limit"

const handlers = toNextJsHandler(auth)

export const GET = async (request: Request) => {
  const nextRequest = request as any
  const result = checkRateLimit({
    key: rateLimitKey(nextRequest, "auth:get"),
    limit: 120,
    windowMs: 60_000,
  })

  if (!result.allowed) {
    return rateLimitedResponse(result.retryAfter)
  }

  return handlers.GET(request)
}

export const POST = async (request: Request) => {
  const nextRequest = request as any
  const result = checkRateLimit({
    key: rateLimitKey(nextRequest, "auth:post"),
    limit: 20,
    windowMs: 60_000,
  })

  if (!result.allowed) {
    return rateLimitedResponse(result.retryAfter)
  }

  return handlers.POST(request)
}
