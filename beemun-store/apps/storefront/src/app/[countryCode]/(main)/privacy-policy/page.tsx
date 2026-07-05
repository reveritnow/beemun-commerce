import { Metadata } from "next"
import PublicPage from "../_components/public-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How BEEMUN collects, uses, and protects information for customers and maker applicants.",
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
      title="How BEEMUN handles personal and business information."
      intro="BEEMUN collects only the information needed to operate the storefront, review makers, support orders, protect accounts, and improve trust in the marketplace."
      primaryLink={{ href: "/contact", label: "Contact BEEMUN" }}
      sections={[
        {
          eyebrow: "Data",
          title: "Information we collect",
          body: "We may collect account details, contact information, order and shipping details, support messages, maker application details, uploaded business documents, device information, and security logs.",
        },
        {
          eyebrow: "Use",
          title: "How information is used",
          body: "Information is used to provide account access, process orders, review maker applications, communicate about support or review tasks, prevent misuse, maintain security, and meet legal or operational obligations.",
        },
        {
          eyebrow: "Control",
          title: "Access and deletion requests",
          body: "You may contact BEEMUN to request access, correction, or deletion of your information. Some records may be retained where required for security, compliance, dispute handling, tax, or marketplace operations.",
        },
      ]}
      note="Uploaded maker documents are treated as sensitive business records and are only used for BEEMUN review, compliance, and account safety."
    />
  )
}
