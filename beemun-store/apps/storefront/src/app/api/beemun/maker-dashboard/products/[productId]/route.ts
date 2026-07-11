import { NextRequest, NextResponse } from "next/server"
import { getBeemunSession } from "../../../../../../lib/get-session"
import {
  checkRateLimit,
  rateLimitedResponse,
  rateLimitKey,
} from "../../../../../../lib/rate-limit"

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
      message: `BEEMUN backend rejected the maker product request with status ${response.status}. Please try again or contact BEEMUN.`,
    }
  }

  return data
}

const backendConfig = () => {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const portalSecret = process.env.BEEMUN_PORTAL_API_SECRET

  if (!backendUrl) {
    return { error: "BEEMUN backend URL is not configured.", status: 500 }
  }

  if (!portalSecret) {
    return {
      error: "BEEMUN secure maker dashboard access is not configured.",
      status: 503,
    }
  }

  return { backendUrl, portalSecret }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  const session = await getBeemunSession()
  const email = (session as any)?.user?.email as string | undefined
  const limit = checkRateLimit({
    key: rateLimitKey(request, "maker-product-detail", email),
    limit: 120,
    windowMs: 60_000,
  })

  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfter)
  }

  if (!email) {
    return NextResponse.json({ message: "Sign in is required." }, { status: 401 })
  }

  const config = backendConfig()

  if ("error" in config) {
    return NextResponse.json({ message: config.error }, { status: config.status })
  }

  try {
    const response = await fetch(
      `${cleanBackendUrl(config.backendUrl)}/vendor/beemun/products/${encodeURIComponent(
        productId
      )}?email=${encodeURIComponent(email)}`,
      {
        headers: {
          "x-beemun-portal-secret": config.portalSecret,
        },
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  const session = await getBeemunSession()
  const email = (session as any)?.user?.email as string | undefined
  const payload = await request.json().catch(() => null)
  const limit = checkRateLimit({
    key: rateLimitKey(request, "maker-product-update", email),
    limit: 60,
    windowMs: 60 * 60_000,
  })

  if (!limit.allowed) {
    return rateLimitedResponse(limit.retryAfter)
  }

  if (!email) {
    return NextResponse.json({ message: "Sign in is required." }, { status: 401 })
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { message: "The product update request could not be read." },
      { status: 400 }
    )
  }

  const config = backendConfig()

  if ("error" in config) {
    return NextResponse.json({ message: config.error }, { status: config.status })
  }

  try {
    const response = await fetch(
      `${cleanBackendUrl(config.backendUrl)}/vendor/beemun/products/${encodeURIComponent(
        productId
      )}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-beemun-portal-secret": config.portalSecret,
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
