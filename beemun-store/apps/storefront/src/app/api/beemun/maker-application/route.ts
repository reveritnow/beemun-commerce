import { NextRequest, NextResponse } from "next/server"

const cleanBackendUrl = (url: string) => url.replace(/\/+$/, "")

const errorMessageFrom = async (response: Response) => {
  try {
    const data = await response.json()
    return (
      data?.message ||
      data?.error ||
      data?.detail ||
      "The maker application could not be submitted."
    )
  } catch {
    return "The maker application could not be submitted."
  }
}

export async function POST(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

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
