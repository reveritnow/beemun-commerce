import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getMakerPortalDataByEmail } from "../../../../lib/data/maker-portal"
import { getBeemunSession } from "../../../../lib/get-session"
import MakerPortalClient from "./portal-client"

export const metadata: Metadata = {
  title: "My BEEMUN Maker Application",
  description:
    "Track your BEEMUN maker application, review timeline, messages, tasks, and documents.",
}

export default async function MakerPortalPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const session = await getBeemunSession()

  if (!(session as any)?.user?.email) {
    redirect(
      `/${countryCode}/maker-portal/sign-in?callbackUrl=/${countryCode}/maker-portal`
    )
  }

  const portalData = await getMakerPortalDataByEmail((session as any).user.email)

  if (portalData?.vendor?.status === "approved") {
    redirect(`/${countryCode}/maker-dashboard`)
  }

  return <MakerPortalClient countryCode={countryCode} />
}
