import "server-only"

const cleanBackendUrl = (url: string) => url.replace(/\/+$/, "")

export type MakerPortalVendor = {
  id: string
  name: string
  status: string
  status_reason?: string | null
  submitted_at?: string | null
  approved_at?: string | null
  metadata?: Record<string, any> | null
}

export type MakerPortalData = {
  vendor: MakerPortalVendor | null
  review_events: Array<Record<string, any>>
  documents: Array<Record<string, any>>
  tasks: Array<Record<string, any>>
  messages: Array<Record<string, any>>
}

export const getMakerPortalDataByEmail = async (
  email?: string | null
): Promise<MakerPortalData | null> => {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

  if (!email || !backendUrl) {
    return null
  }

  try {
    const response = await fetch(
      `${cleanBackendUrl(backendUrl)}/vendor/beemun/portal?email=${encodeURIComponent(
        email
      )}`,
      { cache: "no-store" }
    )

    if (!response.ok) {
      return null
    }

    return (await response.json()) as MakerPortalData
  } catch {
    return null
  }
}
