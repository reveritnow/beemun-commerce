import Link from "next/link"

import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"
import {
  formatDashboardDate,
  MakerDashboardEmpty,
  reviewStatusLabel,
} from "../_components/dashboard-ui"

const productTitle = (item: Record<string, any>) =>
  item.product?.title || item.product_review?.product_id || item.vendor_product?.product_id

const productId = (item: Record<string, any>) =>
  item.product?.id || item.product_review?.product_id || item.vendor_product?.product_id

export default async function MakerDashboardReviewsPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const context = await getApprovedMakerDashboardContext(countryCode)
  const reviewItems = context.product_items || []

  if (!reviewItems.length) {
    return (
      <MakerDashboardEmpty
        title="No product reviews yet"
        body="Submitted products will appear here with their BEEMUN ZPS review stage and decision history."
      />
    )
  }

  return (
    <div className="beemun-dashboard-grid">
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Product Review Status</p>
        <h2>ZPS review queue</h2>
        <p>
          Makers can track review status here. Only BEEMUN can approve, reject,
          or publish products.
        </p>
      </article>
      {reviewItems.map((item) => {
        const review = item.product_review
        const id = productId(item)

        return (
          <article className="beemun-dashboard-card beemun-product-list-card" key={id}>
            <p className="beemun-eyebrow">Review</p>
            <h2>{productTitle(item)}</h2>
            <p>Status: {reviewStatusLabel(review?.status)}</p>
            <p>Submitted: {formatDashboardDate(review?.submitted_at)}</p>
            {review?.change_request && <p>Changes: {review.change_request}</p>}
            {review?.rejection_reason && <p>Reason: {review.rejection_reason}</p>}
            <Link
              className="beemun-btn-secondary"
              href={`/${countryCode}/maker-dashboard/products/${id}`}
            >
              View product
            </Link>
          </article>
        )
      })}
    </div>
  )
}
