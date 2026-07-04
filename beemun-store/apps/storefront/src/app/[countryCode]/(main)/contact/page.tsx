import { Metadata } from "next"
import PublicPage from "../_components/public-page"

export const metadata: Metadata = {
  title: "Contact BEEMUN",
  description:
    "Contact BEEMUN for customer support, maker interest, product questions, or marketplace inquiries.",
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  return (
    <PublicPage
      countryCode={countryCode}
      eyebrow="Contact"
      title="Questions about an order, product, or maker application?"
      intro="Reach BEEMUN for support, product disclosure questions, shipping and returns help, or maker interest."
      primaryLink={{ href: "/shipping-returns", label: "Shipping and returns" }}
      secondaryLink={{ href: "/become-a-maker", label: "For makers" }}
      sections={[
        {
          eyebrow: "Support",
          title: "Customer questions",
          body: "For order or product questions, include your order number when available so support can review the right details.",
        },
        {
          eyebrow: "Makers",
          title: "Maker inquiries",
          body: "If you want to join BEEMUN, share your product category, ingredient approach, packaging approach, and current availability.",
        },
        {
          eyebrow: "Email",
          title: "General contact",
          body: "Use the public contact channel configured for launch. This page is ready for the final support email or form integration.",
        },
      ]}
    />
  )
}
