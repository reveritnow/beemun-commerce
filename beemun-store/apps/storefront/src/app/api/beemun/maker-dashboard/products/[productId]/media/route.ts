import { NextRequest, NextResponse } from "next/server"
import { getBeemunSession } from "../../../../../../../lib/get-session"
import {
  checkRateLimit,
  rateLimitedResponse,
  rateLimitKey,
} from "../../../../../../../lib/rate-limit"

const cleanBackendUrl = (url: string) => url.replace(/\/+$/, "")

const responseData = async (response: Response, fallback: string) => {
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
  return {
    ...data,
    message:
      typeof data?.message === "string" && data.message.trim()
        ? data.message.trim()
        : response.ok
        ? data?.message
        : fallback,
  }
}

const forwardProductAction = async ({
  request,
  productId,
  action,
  limitKey,
  limit,
  fallback,
}: {
  request: NextRequest
  productId: string
  action: string
  limitKey: string
  limit: number
  fallback: string
}) => {
  const session = await getBeemunSession()
  const email = (session as any)?.user?.email as string | undefined
  const payload = await request.json().catch(() => ({}))
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const portalSecret = process.env.BEEMUN_PORTAL_API_SECRET
  const rate = checkRateLimit({
    key: rateLimitKey(request, limitKey, email),
    limit,
    windowMs: 60 * 60_000,
  })

  if (!rate.allowed) {
    return rateLimitedResponse(rate.retryAfter)
  }

  if (!email) {
    return NextResponse.json({ message: "Sign in is required." }, { status: 401 })
  }

  if (!backendUrl) {
    return NextResponse.json({ message: "BEEMUN backend URL is not configured." }, { status: 500 })
  }

  if (!portalSecret) {
    return NextResponse.json(
      { message: "BEEMUN secure maker dashboard access is not configured." },
      { status: 503 }
    )
  }

  try {
    const response = await fetch(
      `${cleanBackendUrl(backendUrl)}/vendor/beemun/products/${encodeURIComponent(productId)}/${action}`,
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
    const data = await responseData(response, fallback)
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
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  return forwardProductAction({
    request,
    productId,
    action: "media",
    limitKey: "maker-product-media",
    limit: 40,
    fallback: "BEEMUN could not upload this product image.",
  })
}
