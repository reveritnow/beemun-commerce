import { Metadata } from "next"
import Link from "next/link"
import PublicPage from "../_components/public-page"
import MakerApplicationForm from "./maker-application-form"
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

  return (
    <>
    <PublicPage
      countryCode={countryCode}
      eyebrow="For makers"
      title="For makers ready to stand behind every ingredient and package."
      intro="BEEMUN is for makers who want their products reviewed, explained, and presented with accountability before customers buy."
      primaryLink={{ href: "/contact", label: "Contact BEEMUN" }}
      secondaryLink={{ href: "/zps-100", label: "Review ZPS 100" }}
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
          body: "Makers cannot publish products directly. BEEMUN approval is required before products become publicly visible.",
        },
      ]}
    />
    {user ? (
      <MakerApplicationForm
        countryCode={countryCode}
        userEmail={user.email}
        userName={user.name}
      />
    ) : (
      <section className="beemun-section beemun-application-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Start Maker Application</p>
          <h2>Create or sign into your BEEMUN account first.</h2>
          <p>
            Your account keeps the application, review timeline, messages,
            tasks, and future maker dashboard connected to one identity.
          </p>
          <Link
            className="beemun-btn-primary"
            href={`/${countryCode}/maker-portal/sign-in?callbackUrl=/${countryCode}/become-a-maker`}
          >
            Start Maker Application
          </Link>
        </div>
      </section>
    )}
    </>
  )
}
