import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"
import { MakerDashboardEmpty } from "../_components/dashboard-ui"
import ProductListManager from "../_components/product-list-manager"

export default async function MakerDashboardProductsPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const context = await getApprovedMakerDashboardContext(countryCode)
  const products = context.product_items || []

  if (!products.length) {
    return (
      <MakerDashboardEmpty
        title="No maker products are linked yet"
        body="Create a Medusa draft product through BEEMUN product onboarding. It will stay private until BEEMUN approves and publishes it."
        action={{
          href: `/${countryCode}/maker-dashboard/product-onboarding`,
          label: "Start product onboarding",
        }}
      />
    )
  }

  return <ProductListManager countryCode={countryCode} items={products} />
}
