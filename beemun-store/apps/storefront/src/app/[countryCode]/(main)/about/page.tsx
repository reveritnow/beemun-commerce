import { Metadata } from "next"
import PublicPage from "../_components/public-page"

export const metadata: Metadata = {
  title: "About BEEMUN",
  description:
    "Learn why BEEMUN exists and how the ZPS 100 marketplace brings zero plastic, zero synthetic, full disclosure products into one curated place.",
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  return (
    <PublicPage
      countryCode={countryCode}
      eyebrow="About BEEMUN"
      title="A curated marketplace for products that show their proof."
      intro="BEEMUN exists for customers who want cleaner choices without decoding vague claims. Every public product is expected to carry clearer ingredient, packaging, maker, and review context."
      primaryLink={{ href: "/zps-100", label: "Explore ZPS 100" }}
      secondaryLink={{ href: "/how-it-works", label: "How it works" }}
      sections={[
        {
          eyebrow: "Pure for You",
          title: "Less guessing before checkout",
          body: "BEEMUN product pages are built around visible ingredient disclosure, packaging notes, maker context, and review signals.",
        },
        {
          eyebrow: "Pure for Earth",
          title: "A standard for better defaults",
          body: "The marketplace prioritizes zero plastic intent, zero synthetic intent, and full disclosure over generic ecommerce volume.",
        },
        {
          eyebrow: "Trust first",
          title: "Makers remain accountable",
          body: "BEEMUN is designed so the people and studios behind products stay part of the buying decision.",
        },
      ]}
    />
  )
}
