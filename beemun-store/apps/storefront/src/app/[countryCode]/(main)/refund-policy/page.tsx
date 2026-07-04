import { Metadata } from "next"
import PublicPage from "../_components/public-page"

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "General BEEMUN refund policy foundation for review before launch.",
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
      title="A simple refund foundation for customer support."
      intro="Refund handling depends on order status, product type, fulfillment status, and support review. This page should be finalized before legal launch."
      primaryLink={{ href: "/contact", label: "Contact support" }}
      secondaryLink={{ href: "/shipping-returns", label: "Shipping and returns" }}
      sections={[
        {
          eyebrow: "Requests",
          title: "How to request help",
          body: "Customers should contact BEEMUN support with order details, product information, and the reason for the request.",
        },
        {
          eyebrow: "Review",
          title: "How requests are reviewed",
          body: "Refund eligibility may depend on whether an item has shipped, whether it is unopened, whether it arrived damaged, and any product-specific limitations.",
        },
        {
          eyebrow: "Placeholder",
          title: "Needs final policy review",
          body: "This is a general operational foundation and should be reviewed before it is used as the final refund policy.",
        },
      ]}
    />
  )
}
