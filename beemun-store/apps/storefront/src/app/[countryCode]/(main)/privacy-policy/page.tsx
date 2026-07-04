import { Metadata } from "next"
import PublicPage from "../_components/public-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "A general privacy policy foundation for BEEMUN, ready for legal review before launch.",
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  return (
    <PublicPage
      countryCode={countryCode}
      eyebrow="Privacy policy"
      title="A privacy foundation for review before launch."
      intro="This page outlines the kind of privacy information BEEMUN expects to provide. It should be reviewed and finalized before production legal use."
      primaryLink={{ href: "/contact", label: "Contact BEEMUN" }}
      sections={[
        {
          eyebrow: "Data",
          title: "Information used to operate the store",
          body: "BEEMUN may need customer, order, account, payment status, shipping, and support information to operate the marketplace and fulfill requests.",
        },
        {
          eyebrow: "Use",
          title: "How information supports service",
          body: "Information may be used for checkout, order support, account access, fraud prevention, customer communication, and marketplace operations.",
        },
        {
          eyebrow: "Review",
          title: "Legal review required",
          body: "This placeholder should be replaced or approved by qualified counsel before BEEMUN relies on it as a final privacy policy.",
        },
      ]}
    />
  )
}
