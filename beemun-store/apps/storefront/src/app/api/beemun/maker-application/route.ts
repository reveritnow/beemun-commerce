import { NextRequest, NextResponse } from "next/server"
import { getBeemunSession } from "../../../../lib/get-session"

const cleanBackendUrl = (url: string) => url.replace(/\/+$/, "")

const errorMessageFrom = async (response: Response) => {
  try {
    const data = await response.json()
    const message = data?.message || data?.error || data?.detail

    if (
      typeof message === "string" &&
      message.trim() &&
      message.toLowerCase() !== "an unknown error occurred."
    ) {
      return message
    }

    return (
      data?.code
        ? `The maker application could not be submitted (${data.code}). Please contact BEEMUN if this continues.`
        : `The maker application could not be submitted because the BEEMUN backend returned ${response.status}. Please try again or contact BEEMUN.`
    )
  } catch {
    return `The maker application could not be submitted because the BEEMUN backend returned ${response.status}. Please try again or contact BEEMUN.`
  }
}

export async function POST(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
  const session = await getBeemunSession()
  const user = (session as any)?.user

  if (!user?.email) {
    return NextResponse.json(
      {
        message:
          "Please sign in with your BEEMUN account before submitting a maker application.",
      },
      { status: 401 }
    )
  }

  if (!backendUrl) {
    return NextResponse.json(
      {
        message:
          "BEEMUN backend URL is not configured. Please set NEXT_PUBLIC_MEDUSA_BACKEND_URL.",
      },
      { status: 500 }
    )
  }

  let payload: Record<string, unknown>

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      { message: "Invalid maker application payload." },
      { status: 400 }
    )
  }

  try {
    const response = await fetch(
      `${cleanBackendUrl(backendUrl)}/vendor/beemun/onboarding`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          email: user.email,
          owner_email: user.email,
          submit: true,
          status: "submitted",
        }),
        cache: "no-store",
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { message: await errorMessageFrom(response) },
        { status: response.status }
      )
    }

    const data = await response.json().catch(() => ({}))

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `Unable to reach BEEMUN backend: ${error.message}`
            : "Unable to reach BEEMUN backend.",
      },
      { status: 502 }
    )
  }
}
