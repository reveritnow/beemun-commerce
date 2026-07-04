import { Metadata } from "next"
import PublicPage from "../_components/public-page"

export const metadata: Metadata = {
  title: "Terms",
  description:
    "General BEEMUN terms foundation for customer and marketplace use, ready for review before launch.",
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  return (
    <PublicPage
      countryCode={countryCode}
      eyebrow="Terms"
      title="General marketplace terms foundation."
      intro="These terms are a clear placeholder for launch preparation and should be reviewed before being treated as final legal terms."
      primaryLink={{ href: "/contact", label: "Contact BEEMUN" }}
      sections={[
        {
          eyebrow: "Marketplace",
          title: "Use of BEEMUN",
          body: "Customers use BEEMUN to discover reviewed products and complete purchases through the storefront checkout flow.",
        },
        {
          eyebrow: "Products",
          title: "Product information",
          body: "BEEMUN aims to show ingredient, packaging, maker, and review details clearly, while final product use remains subject to maker instructions and customer judgment.",
        },
        {
          eyebrow: "Review",
          title: "Legal review required",
          body: "This placeholder should be finalized with appropriate legal guidance before public launch.",
        },
      ]}
    />
  )
}
