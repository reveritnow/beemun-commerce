import { Metadata } from "next"
import PublicPage from "../_components/public-page"

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "How BEEMUN reviews refund and support requests.",
}

export default async function RefundPolicyPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  return (
    <PublicPage
      countryCode={countryCode}
      eyebrow="Refund policy"
      title="How BEEMUN reviews refund requests."
      intro="BEEMUN reviews refund requests based on order status, fulfillment status, product condition, product type, and the information provided to support."
      primaryLink={{ href: "/contact", label: "Contact support" }}
      secondaryLink={{ href: "/shipping-returns", label: "Shipping and returns" }}
      sections={[
        {
          eyebrow: "Requests",
          title: "How to request help",
          body: "Contact BEEMUN with your order details, product name, photos if relevant, and a clear reason for the request. Faster, specific information helps support review the request.",
        },
        {
          eyebrow: "Review",
          title: "How requests are reviewed",
          body: "Refund eligibility may depend on whether an item has shipped, whether it is unopened, whether it arrived damaged, and any product-specific limitations.",
        },
        {
          eyebrow: "Limits",
          title: "When refunds may not apply",
          body: "Refunds may be unavailable for opened, used, damaged-by-customer, customized, final-sale, or hygiene-sensitive items unless required by law or approved by BEEMUN support.",
        },
      ]}
      note="This policy does not limit any rights customers may have under applicable consumer protection laws."
    />
  )
}
