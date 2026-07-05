import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"
import {
  formatDashboardDate,
  MakerDashboardEmpty,
  reviewStatusLabel,
} from "../_components/dashboard-ui"

export default async function MakerDashboardReviewsPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const context = await getApprovedMakerDashboardContext(countryCode)
  const reviews = context.product_reviews || []

  if (!reviews.length) {
    return (
      <MakerDashboardEmpty
        title="No product reviews yet"
        body="Once product onboarding opens, submitted products will appear here with their BEEMUN ZPS review stage and decision history."
      />
    )
  }

  return (
    <div className="beemun-dashboard-grid">
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Product Review Status</p>
        <h2>ZPS review queue</h2>
        <p>
          Makers can track status here, but only BEEMUN can approve and publish
          products.
        </p>
      </article>
      {reviews.map((review) => (
        <article className="beemun-dashboard-card" key={review.id}>
          <p className="beemun-eyebrow">Review</p>
          <h2>{review.product_id}</h2>
          <p>Status: {reviewStatusLabel(review.status)}</p>
          <p>Submitted: {formatDashboardDate(review.submitted_at)}</p>
          {review.change_request && <p>Changes: {review.change_request}</p>}
          {review.rejection_reason && <p>Reason: {review.rejection_reason}</p>}
        </article>
      ))}
    </div>
  )
}
