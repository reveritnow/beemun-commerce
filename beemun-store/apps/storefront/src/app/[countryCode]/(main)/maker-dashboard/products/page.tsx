import Link from "next/link"

import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"
import { MakerDashboardEmpty, reviewStatusLabel } from "../_components/dashboard-ui"

const allStatuses = [
  "draft",
  "submitted",
  "automatic_checks",
  "pending_zps_review",
  "needs_changes",
  "approved",
  "rejected",
  "published",
]

const productTitle = (item: Record<string, any>) =>
  item.product?.title || item.product_review?.product_id || item.vendor_product?.product_id

const productId = (item: Record<string, any>) =>
  item.product?.id || item.product_review?.product_id || item.vendor_product?.product_id

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

  return (
    <div className="beemun-dashboard-grid">
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Products</p>
        <h2>Maker product review loop</h2>
        <p>
          Track every product from draft to BEEMUN approval. Makers can edit
          only Draft and Needs Changes products; publishing remains an admin
          action.
        </p>
        <div className="beemun-status-strip">
          {allStatuses.map((status) => (
            <span key={status}>{reviewStatusLabel(status)}</span>
          ))}
        </div>
      </article>
      {products.map((item) => {
        const review = item.product_review
        const id = productId(item)
        const editable = ["draft", "needs_changes"].includes(review?.status)

        return (
          <article className="beemun-dashboard-card beemun-product-list-card" key={id}>
            <p className="beemun-eyebrow">Product</p>
            <h2>{productTitle(item)}</h2>
            <p>{item.product?.subtitle || item.product?.handle || "BEEMUN maker product"}</p>
            <div className="beemun-product-card-meta">
              <span className="beemun-dashboard-chip">
                {reviewStatusLabel(review?.status)}
              </span>
              <span>{editable ? "Editable" : "Read-only"}</span>
            </div>
            <Link
              className="beemun-btn-secondary"
              href={`/${countryCode}/maker-dashboard/products/${id}`}
            >
              Open product
            </Link>
          </article>
        )
      })}
    </div>
  )
}
