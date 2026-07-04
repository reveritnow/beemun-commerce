import { Metadata } from "next"
import PublicPage from "../_components/public-page"

export const metadata: Metadata = {
  title: "Shipping and Returns",
  description:
    "General BEEMUN shipping and returns information for marketplace orders.",
}

export default async function ShippingReturnsPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  return (
    <PublicPage
      countryCode={countryCode}
      eyebrow="Shipping and returns"
      title="Clear order flow, careful support."
      intro="BEEMUN uses the existing checkout and order flow to keep customer orders traceable. Final shipping options and timelines are shown during checkout."
      primaryLink={{ href: "/contact", label: "Contact support" }}
      secondaryLink={{ href: "/store", label: "Continue shopping" }}
      sections={[
        {
          eyebrow: "Shipping",
          title: "Shipping options",
          body: "Available shipping methods, rates, and delivery estimates may vary by region and cart contents. Checkout shows the current options.",
        },
        {
          eyebrow: "Returns",
          title: "Return requests",
          body: "Return eligibility can depend on product type, condition, hygiene considerations, and order status. Contact BEEMUN support for help before sending anything back.",
        },
        {
          eyebrow: "Issues",
          title: "Damaged or incorrect orders",
          body: "If something arrives damaged or incorrect, keep the packaging and contact support with order details and photos where possible.",
        },
      ]}
      note="This page is a general customer support foundation and should be reviewed before final legal or operational launch."
    />
  )
}
