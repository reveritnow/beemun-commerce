import { NextRequest, NextResponse } from "next/server"
import { getBeemunSession } from "../../../../lib/get-session"
import {
  checkRateLimit,
  rateLimitedResponse,
  rateLimitKey,
} from "../../../../lib/rate-limit"

const cleanBackendUrl = (url: string) => url.replace(/\/+$/, "")

const backendUrl = () => process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const portalSecret = () => process.env.BEEMUN_PORTAL_API_SECRET

const responseData = async (response: Response) => {
  const text = await response.text().catch(() => "")
  const data = text
    ? (() => {
        try {
          return JSON.parse(text)
        } catch {
          return {}
        }
      })()
    : {}
  const message =
    typeof data?.message === "string" && data.message.trim()
      ? data.message.trim()
      : ""

  if (!response.ok && (!message || message.toLowerCase() === "an unknown error occurred.")) {
    const raw = text.trim()

    return {
      ...data,
      message:
        response.status === 413
          ? "The upload is too large for the application portal. Please choose a smaller file."
          : raw && raw.toLowerCase() !== "an unknown error occurred."
          ? `BEEMUN backend error: ${raw.slice(0, 500)}`
          : `BEEMUN backend rejected the portal request with status ${response.status}. Please try again or contact BEEMUN.`,
    }
  }

  return data
}

const sessionEmail = async () => {
  const session = await getBeemunSession()
  return (session as any)?.user?.email as string | undefined
}

export async function GET(request: NextRequest) {
  const email = await sessionEmail()
  const url = backendUrl()
  const secret = portalSecret()
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, "maker-portal:get", email),
    limit: 120,
    windowMs: 60_000,
  })

  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfter)
  }

  if (!email) {
    return NextResponse.json({ message: "Sign in is required." }, { status: 401 })
  }

  if (!url) {
    return NextResponse.json(
      { message: "BEEMUN backend URL is not configured." },
      { status: 500 }
    )
  }

  if (!secret) {
    return NextResponse.json(
      { message: "BEEMUN secure portal access is not configured." },
      { status: 503 }
    )
  }

  try {
    const response = await fetch(
      `${cleanBackendUrl(url)}/vendor/beemun/portal?email=${encodeURIComponent(
        email
      )}`,
      {
        cache: "no-store",
        headers: {
          "x-beemun-portal-secret": secret,
        },
      }
    )

    const data = await responseData(response)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `BEEMUN backend could not be reached: ${error.message}`
            : "BEEMUN backend could not be reached.",
      },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  const email = await sessionEmail()
  const url = backendUrl()
  const secret = portalSecret()
  const payload = await request.json().catch(() => null)
  const action = payload && typeof payload === "object" ? String(payload.action || "portal") : "portal"
  const rateLimit = checkRateLimit({
    key: rateLimitKey(request, `maker-portal:${action}`, email),
    limit:
      action === "document"
        ? 12
        : action === "message" || action === "complete_task"
        ? 30
        : 60,
    windowMs: 60 * 60_000,
  })

  if (!rateLimit.allowed) {
    return rateLimitedResponse(rateLimit.retryAfter)
  }

  if (!email) {
    return NextResponse.json({ message: "Sign in is required." }, { status: 401 })
  }

  if (!url) {
    return NextResponse.json(
      { message: "BEEMUN backend URL is not configured." },
      { status: 500 }
    )
  }

  if (!secret) {
    return NextResponse.json(
      { message: "BEEMUN secure portal access is not configured." },
      { status: 503 }
    )
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { message: "The portal request could not be read. Please refresh and try again." },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(`${cleanBackendUrl(url)}/vendor/beemun/portal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-beemun-portal-secret": secret,
      },
      body: JSON.stringify({ ...payload, email }),
      cache: "no-store",
    })

    const data = await responseData(response)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `BEEMUN backend could not be reached: ${error.message}`
            : "BEEMUN backend could not be reached.",
      },
      { status: 502 }
    )
  }
}
