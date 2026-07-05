import { Metadata } from "next"
import { redirect } from "next/navigation"
import MakerApplicationForm from "../../become-a-maker/maker-application-form"
import { getMakerPortalDataByEmail } from "../../../../../lib/data/maker-portal"
import { getBeemunSession } from "../../../../../lib/get-session"

export const metadata: Metadata = {
  title: "BEEMUN Maker Application",
  description:
    "Complete the guided BEEMUN maker application before product tools unlock.",
}

export default async function MakerPortalApplyPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const session = await getBeemunSession()
  const user = (session as any)?.user

  if (!user?.email) {
    redirect(
      `/${countryCode}/maker-portal/sign-in?callbackUrl=/${countryCode}/maker-portal/apply`
    )
  }

  const portalData = await getMakerPortalDataByEmail(user.email)

  if (portalData?.vendor) {
    redirect(`/${countryCode}/maker-portal`)
  }

  return (
    <MakerApplicationForm
      countryCode={countryCode}
      userEmail={user.email}
      userName={user.name}
    />
  )
}
