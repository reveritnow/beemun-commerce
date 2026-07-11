import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { getBeemunSession } from "../get-session"

const cleanBackendUrl = (url: string) => url.replace(/\/+$/, "")

export type MakerDashboardData = {
  vendor: Record<string, any> | null
  member: Record<string, any> | null
  vendor_products: Array<Record<string, any>>
  product_items?: Array<Record<string, any>>
  product_reviews: Array<Record<string, any>>
  documents: Array<Record<string, any>>
  tasks: Array<Record<string, any>>
  messages: Array<Record<string, any>>
  review_events: Array<Record<string, any>>
}

export type MakerDashboardContext = MakerDashboardData & {
  countryCode: string
  user: Record<string, any>
}

export const getMakerDashboardDataByEmail = cache(
  async (email?: string | null): Promise<MakerDashboardData | null> => {
    const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
    const portalSecret = process.env.BEEMUN_PORTAL_API_SECRET

    if (!email || !backendUrl || !portalSecret) {
      return null
    }

    try {
      const response = await fetch(
        `${cleanBackendUrl(
          backendUrl
        )}/vendor/beemun/dashboard?email=${encodeURIComponent(email)}`,
        {
          cache: "no-store",
          headers: {
            "x-beemun-portal-secret": portalSecret,
          },
        }
      )

      if (!response.ok) {
        return null
      }

      return (await response.json()) as MakerDashboardData
    } catch {
      return null
    }
  }
)

export const getApprovedMakerDashboardContext = async (
  countryCode: string
): Promise<MakerDashboardContext> => {
  const session = await getBeemunSession()
  const user = (session as any)?.user

  if (!user?.email) {
    redirect(
      `/${countryCode}/maker-portal/sign-in?callbackUrl=/${countryCode}/maker-dashboard`
    )
  }

  const data = await getMakerDashboardDataByEmail(user.email)

  if (!data?.vendor) {
    redirect(`/${countryCode}/maker-portal/apply`)
  }

  if (data.vendor.status !== "approved") {
    redirect(`/${countryCode}/maker-portal`)
  }

  if (!data.member || data.member.status !== "active") {
    redirect(`/${countryCode}/maker-portal`)
  }

  return {
    ...data,
    countryCode,
    user,
  }
}


