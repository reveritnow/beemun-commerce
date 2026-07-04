import { Metadata } from "next"
import PublicPage from "../_components/public-page"

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

  return (
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
  )
}
