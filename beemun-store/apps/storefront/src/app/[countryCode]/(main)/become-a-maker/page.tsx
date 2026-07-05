import { Metadata } from "next"
import Link from "next/link"
import PublicPage from "../_components/public-page"
import { getMakerPortalDataByEmail } from "../../../../lib/data/maker-portal"
import { getBeemunSession } from "../../../../lib/get-session"

export const metadata: Metadata = {
  title: "Become a BEEMUN Maker",
  description:
    "Apply interest in joining BEEMUN as an approved maker for the ZPS 100 marketplace.",
}

export default async function BecomeMakerPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const session = await getBeemunSession()
  const user = (session as any)?.user
  const portalData = await getMakerPortalDataByEmail(user?.email)
  const startHref = user
    ? portalData?.vendor
      ? `/${countryCode}/maker-portal`
      : `/${countryCode}/maker-portal/apply`
    : `/${countryCode}/maker-portal/sign-in?callbackUrl=/${countryCode}/maker-portal/start`

  return (
    <>
      <PublicPage
        countryCode={countryCode}
        eyebrow="BEEMUN Maker Program"
        title="For makers ready to prove what goes into every product."
        intro="Join a curated ZPS 100 marketplace where every maker profile and product is reviewed before anything becomes public."
        primaryLink={{ href: "/zps-100", label: "Review ZPS 100" }}
        secondaryLink={{ href: "/contact", label: "Contact BEEMUN" }}
        sections={[
          {
            eyebrow: "Fit",
            title: "Who should apply",
            body: "Small studios, independent makers, and responsible brands with clear ingredients, careful packaging, and honest product claims.",
          },
          {
            eyebrow: "Review",
            title: "What BEEMUN asks for",
            body: "Expect to share product details, packaging notes, maker story, sourcing context, and any certifications or compliance information available.",
          },
          {
            eyebrow: "Approval",
            title: "Publishing is curated",
            body: "Makers cannot publish products directly. BEEMUN approval is required before product tools and public visibility unlock.",
          },
        ]}
      />
      <section className="beemun-section beemun-application-section">
        <div className="beemun-maker-landing-cta">
          <p className="beemun-eyebrow">Start Maker Application</p>
          <h2>
            {portalData?.vendor
              ? "Your maker application is waiting in My Application."
              : "Begin the guided BEEMUN maker review journey."}
          </h2>
          <p>
            Create one BEEMUN account, complete the guided application, then
            track review progress from a locked application dashboard. Product
            tools unlock only after approval.
          </p>
          <Link className="beemun-btn-primary" href={startHref}>
            {portalData?.vendor ? "Open My Application" : "Start Maker Application"}
          </Link>
        </div>
      </section>
    </>
  )
}
