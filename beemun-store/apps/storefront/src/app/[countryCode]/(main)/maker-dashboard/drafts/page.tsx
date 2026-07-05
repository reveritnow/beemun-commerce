import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"
import { MakerDashboardEmpty, reviewStatusLabel } from "../_components/dashboard-ui"

export default async function MakerDashboardDraftsPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const context = await getApprovedMakerDashboardContext(countryCode)
  const drafts = context.product_reviews.filter((review) =>
    ["draft", "needs_changes"].includes(review.status)
  )

  if (!drafts.length) {
    return (
      <MakerDashboardEmpty
        title="No product drafts yet"
        body="Drafts will appear here after approved makers can create Medusa draft products through the BEEMUN product onboarding flow."
      />
    )
  }

  return (
    <div className="beemun-dashboard-grid">
      {drafts.map((review) => (
        <article className="beemun-dashboard-card" key={review.id}>
          <p className="beemun-eyebrow">Draft</p>
          <h2>{review.product_id}</h2>
          <p>{review.change_request || "This product is still being prepared."}</p>
          <span className="beemun-dashboard-chip">
            {reviewStatusLabel(review.status)}
          </span>
        </article>
      ))}
    </div>
  )
}
