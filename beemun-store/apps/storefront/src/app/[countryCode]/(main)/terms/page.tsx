import { Metadata } from "next"
import PublicPage from "../_components/public-page"

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Terms for using BEEMUN as a customer, applicant, or approved maker.",
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
      title="Terms for using the BEEMUN marketplace."
      intro="By using BEEMUN, creating an account, applying as a maker, or placing an order, you agree to use the marketplace honestly and follow the policies that protect customers, makers, and BEEMUN standards."
      primaryLink={{ href: "/contact", label: "Contact BEEMUN" }}
      sections={[
        {
          eyebrow: "Marketplace",
          title: "Use of BEEMUN",
          body: "BEEMUN provides a curated marketplace experience for discovering reviewed products, managing accounts, applying as a maker, and completing purchases through the storefront checkout flow.",
        },
        {
          eyebrow: "Products",
          title: "Product information",
          body: "BEEMUN reviews product and maker information for marketplace trust, but customers should still read product labels, usage instructions, ingredients, warnings, and maker disclosures before use.",
        },
        {
          eyebrow: "Makers",
          title: "Curated approval",
          body: "Submitting a maker application does not guarantee approval. Makers cannot publish products directly, and products require separate BEEMUN review before public listing.",
        },
      ]}
      note="BEEMUN may suspend access, remove content, reject applications, or restrict marketplace use when information is inaccurate, unsafe, misleading, unlawful, or inconsistent with BEEMUN standards."
    />
  )
}
