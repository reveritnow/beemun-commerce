import Link from "next/link"

import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"
import { MakerDashboardEmpty, reviewStatusLabel } from "../_components/dashboard-ui"

const productTitle = (item: Record<string, any>) =>
  item.product?.title || item.product_review?.product_id || item.vendor_product?.product_id

const productId = (item: Record<string, any>) =>
  item.product?.id || item.product_review?.product_id || item.vendor_product?.product_id

export default async function MakerDashboardDraftsPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const context = await getApprovedMakerDashboardContext(countryCode)
  const drafts = (context.product_items || []).filter((item) =>
    ["draft", "needs_changes"].includes(item.product_review?.status)
  )

  if (!drafts.length) {
    return (
      <MakerDashboardEmpty
        title="No editable product drafts"
        body="Drafts and products with requested changes will appear here. Submitted, approved, and published products stay read-only."
      />
    )
  }

  return (
    <div className="beemun-dashboard-grid">
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Editable Products</p>
        <h2>Drafts and requested changes</h2>
        <p>
          These products can still be edited by your maker team before they are
          resubmitted to BEEMUN.
        </p>
      </article>
      {drafts.map((item) => {
        const review = item.product_review
        const id = productId(item)

        return (
          <article className="beemun-dashboard-card beemun-product-list-card" key={id}>
            <p className="beemun-eyebrow">{reviewStatusLabel(review?.status)}</p>
            <h2>{productTitle(item)}</h2>
            <p>
              {review?.change_request ||
                "This product is still being prepared for BEEMUN review."}
            </p>
            <span className="beemun-dashboard-chip">
              {reviewStatusLabel(review?.status)}
            </span>
            <Link
              className="beemun-btn-secondary"
              href={`/${countryCode}/maker-dashboard/products/${id}`}
            >
              Edit product
            </Link>
          </article>
        )
      })}
    </div>
  )
}
