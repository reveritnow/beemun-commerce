import { Metadata } from "next"
import MakerPortalAuthForm from "../auth-form"

export const metadata: Metadata = {
  title: "BEEMUN Maker Portal Sign In",
  description:
    "Create or access the BEEMUN account used for maker applications and future maker dashboard access.",
}

export default async function MakerPortalSignInPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  return <MakerPortalAuthForm countryCode={countryCode} />
}
