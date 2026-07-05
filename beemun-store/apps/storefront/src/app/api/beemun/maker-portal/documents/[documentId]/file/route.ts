import { NextRequest, NextResponse } from "next/server"
import { getBeemunSession } from "../../../../../../../lib/get-session"

const cleanBackendUrl = (url: string) => url.replace(/\/+$/, "")

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const portalSecret = process.env.BEEMUN_PORTAL_API_SECRET
  const session = await getBeemunSession()
  const email = (session as any)?.user?.email as string | undefined
  const { documentId } = await params

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
      { message: "BEEMUN document access is not configured." },
      { status: 503 }
    )
  }

  const response = await fetch(
    `${cleanBackendUrl(
      backendUrl
    )}/vendor/beemun/documents/${encodeURIComponent(
      documentId
    )}/file?email=${encodeURIComponent(email)}`,
    {
      cache: "no-store",
      headers: {
        "x-beemun-portal-secret": portalSecret,
      },
    }
  )

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(
      { message: data?.message || "Document file could not be loaded." },
      { status: response.status }
    )
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type":
        response.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition":
        response.headers.get("content-disposition") || "inline",
    },
  })
}
