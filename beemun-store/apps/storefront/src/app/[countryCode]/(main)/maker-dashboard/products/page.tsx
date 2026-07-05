import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"
import { MakerDashboardEmpty, reviewStatusLabel } from "../_components/dashboard-ui"

export default async function MakerDashboardProductsPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const context = await getApprovedMakerDashboardContext(countryCode)
  const products = context.vendor_products || []

  if (!products.length) {
    return (
      <MakerDashboardEmpty
        title="No maker products are linked yet"
        body="When product onboarding opens, approved makers will create Medusa draft products that are linked to this BEEMUN maker profile and routed into ZPS review."
        action={{
          href: `/${countryCode}/maker-dashboard/product-onboarding`,
          label: "View product onboarding",
        }}
      />
    )
  }

  return (
    <div className="beemun-dashboard-grid">
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Products</p>
        <h2>Linked maker products</h2>
        <p>
          These products are connected to your maker profile. Public visibility
          still depends on Medusa published status and BEEMUN ZPS approval.
        </p>
      </article>
      {products.map((product) => {
        const review = context.product_reviews.find(
          (item) => item.vendor_product_id === product.id
        )

        return (
          <article className="beemun-dashboard-card" key={product.id}>
            <p className="beemun-eyebrow">Product</p>
            <h2>{product.product_id}</h2>
            <p>Relationship: {product.relationship_type || "maker"}</p>
            <span className="beemun-dashboard-chip">
              {reviewStatusLabel(review?.status)}
            </span>
          </article>
        )
      })}
    </div>
  )
}
