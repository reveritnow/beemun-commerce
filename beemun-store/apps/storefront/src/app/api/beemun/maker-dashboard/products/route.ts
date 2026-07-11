import { NextRequest, NextResponse } from "next/server"
import { getBeemunSession } from "../../../../../lib/get-session"
import {
  checkRateLimit,
  rateLimitedResponse,
  rateLimitKey,
} from "../../../../../lib/rate-limit"

const cleanBackendUrl = (url: string) => url.replace(/\/+$/, "")

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

  if (!response.ok && !message) {
    return {
      ...data,
      message: `BEEMUN backend rejected product onboarding with status ${response.status}. Please try again or contact BEEMUN.`,
    }
  }

  return data
}

export async function POST(request: NextRequest) {
  const session = await getBeemunSession()
  const email = (session as any)?.user?.email as string | undefined
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const portalSecret = process.env.BEEMUN_PORTAL_API_SECRET
  const payload = await request.json().catch(() => null)
  const limit = checkRateLimit({
    key: rateLimitKey(request, "maker-dashboard-product-create", email),
    limit: 20,
    windowMs: 60 * 60_000,
  })

  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfter)
  }

  if (!email) {
    return NextResponse.json({ message: "Sign in is required." }, { status: 401 })
  }

  if (!backendUrl) {
    return NextResponse.json(
      { message: "BEEMUN backend URL is not configured." },
      { status: 500 }
    )
  }

  if (!portalSecret) {
    return NextResponse.json(
      { message: "BEEMUN secure maker dashboard access is not configured." },
      { status: 503 }
    )
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { message: "The product onboarding request could not be read." },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(
      `${cleanBackendUrl(backendUrl)}/vendor/beemun/products/drafts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-beemun-portal-secret": portalSecret,
        },
        body: JSON.stringify({ ...(payload as Record<string, any>), email }),
        cache: "no-store",
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
