import { NextRequest, NextResponse } from "next/server"
import { getBeemunSession } from "../../../../../../../../lib/get-session"

const cleanBackendUrl = (url: string) => url.replace(/\/+$/, "")

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; fileId: string }> }
) {
  const { productId, fileId } = await params
  const session = await getBeemunSession()
  const email = (session as any)?.user?.email as string | undefined
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const portalSecret = process.env.BEEMUN_PORTAL_API_SECRET

  if (!email) {
    return NextResponse.json({ message: "Sign in is required." }, { status: 401 })
  }

  if (!backendUrl || !portalSecret) {
    return NextResponse.json(
      { message: "BEEMUN secure media access is not configured." },
      { status: 503 }
    )
  }

  const response = await fetch(
    `${cleanBackendUrl(backendUrl)}/vendor/beemun/products/${encodeURIComponent(
      productId
    )}/media/${encodeURIComponent(fileId)}?email=${encodeURIComponent(email)}`,
    {
      headers: {
        "x-beemun-portal-secret": portalSecret,
      },
      cache: "no-store",
    }
  )

  if (!response.ok) {
    return NextResponse.json(
      { message: "Product media is not available." },
      { status: response.status }
    )
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "private, max-age=300",
    },
  })
}
