import { redirect } from "next/navigation"
import { getMakerPortalDataByEmail } from "../../../../../lib/data/maker-portal"
import { getBeemunSession } from "../../../../../lib/get-session"

export default async function MakerPortalStartPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const session = await getBeemunSession()
  const email = (session as any)?.user?.email as string | undefined

  if (!email) {
    redirect(
      `/${countryCode}/maker-portal/sign-in?callbackUrl=/${countryCode}/maker-portal/start`
    )
  }

  const portalData = await getMakerPortalDataByEmail(email)

  if (portalData?.vendor?.status === "approved") {
    redirect(`/${countryCode}/maker-dashboard`)
  }

  if (portalData?.vendor) {
    redirect(`/${countryCode}/maker-portal`)
  }

  redirect(`/${countryCode}/maker-portal/apply`)
}
