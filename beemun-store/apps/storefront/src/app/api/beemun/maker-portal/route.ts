import { NextRequest, NextResponse } from "next/server"
import { getBeemunSession } from "../../../../lib/get-session"

const cleanBackendUrl = (url: string) => url.replace(/\/+$/, "")

const backendUrl = () => process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

const sessionEmail = async () => {
  const session = await getBeemunSession()
  return (session as any)?.user?.email as string | undefined
}

export async function GET() {
  const email = await sessionEmail()
  const url = backendUrl()

  if (!email) {
    return NextResponse.json({ message: "Sign in is required." }, { status: 401 })
  }

  if (!url) {
    return NextResponse.json(
      { message: "BEEMUN backend URL is not configured." },
      { status: 500 }
    )
  }

  const response = await fetch(
    `${cleanBackendUrl(url)}/vendor/beemun/portal?email=${encodeURIComponent(
      email
    )}`,
    { cache: "no-store" }
  )

  const data = await response.json().catch(() => ({}))
  return NextResponse.json(data, { status: response.status })
}

export async function POST(request: NextRequest) {
  const email = await sessionEmail()
  const url = backendUrl()

  if (!email) {
    return NextResponse.json({ message: "Sign in is required." }, { status: 401 })
  }

  if (!url) {
    return NextResponse.json(
      { message: "BEEMUN backend URL is not configured." },
      { status: 500 }
    )
  }

  const payload = await request.json().catch(() => ({}))
  const response = await fetch(`${cleanBackendUrl(url)}/vendor/beemun/portal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, email }),
    cache: "no-store",
  })

  const data = await response.json().catch(() => ({}))
  return NextResponse.json(data, { status: response.status })
}
