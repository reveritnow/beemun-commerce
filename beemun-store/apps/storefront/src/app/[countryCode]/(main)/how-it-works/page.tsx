import { Metadata } from "next"
import PublicPage from "../_components/public-page"

export const metadata: Metadata = {
  title: "How BEEMUN Works",
  description:
    "See how BEEMUN reviews makers and products before they become public on the ZPS 100 marketplace.",
}

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  return (
    <PublicPage
      countryCode={countryCode}
      eyebrow="How it works"
      title="BEEMUN reviews first, then products become discoverable."
      intro="The marketplace is built around a simple public promise: products should be visible only when they are published in Medusa and approved through BEEMUN's ZPS 100 trust layer."
      primaryLink={{ href: "/store", label: "Shop approved products" }}
      secondaryLink={{ href: "/become-a-maker", label: "Become a maker" }}
      sections={[
        {
          eyebrow: "01",
          title: "Maker review",
          body: "BEEMUN reviews maker identity, product ownership, disclosure habits, and willingness to keep information current.",
        },
        {
          eyebrow: "02",
          title: "Product review",
          body: "Ingredients, packaging, claims, usage notes, and product presentation are reviewed before public visibility.",
        },
        {
          eyebrow: "03",
          title: "Public marketplace",
          body: "Approved products can appear in store, category, collection, maker, and product discovery while preserving Medusa commerce logic.",
        },
        {
          eyebrow: "Learn more",
          title: "The ZPS 100 standard",
          body: "ZPS 100 explains BEEMUN's zero plastic, zero synthetic, full disclosure, and review-led product direction.",
        },
      ]}
      note="For the standard itself, visit the ZPS 100 page from any product or maker profile."
    />
  )
}
