import Link from "next/link"
import { getApprovedMakerDashboardContext } from "../../../../lib/data/maker-dashboard"
import {
  formatDashboardDate,
  MakerDashboardMetric,
  reviewStatusLabel,
  shellMetrics,
} from "./_components/dashboard-ui"

export default async function MakerDashboardOverviewPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const context = await getApprovedMakerDashboardContext(countryCode)
  const metrics = shellMetrics(context)
  const latestReview = context.product_reviews[context.product_reviews.length - 1]
  const latestMessage = context.messages[context.messages.length - 1]

  return (
    <div className="beemun-dashboard-grid">
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Overview</p>
        <h2>Maker workspace unlocked</h2>
        <p>
          Stage 3 begins with your approved maker workspace. Product onboarding
          will create controlled drafts, link them to your maker profile, and
          submit them through BEEMUN ZPS review before anything can become
          public.
        </p>
      </article>

      <article className="beemun-dashboard-card">
        <p className="beemun-eyebrow">Today</p>
        <h2>Workspace summary</h2>
        <div className="beemun-dashboard-mini-metrics">
          <MakerDashboardMetric label="Products" value={metrics.products} />
          <MakerDashboardMetric label="Reviews" value={metrics.openReviews} />
          <MakerDashboardMetric label="Messages" value={metrics.messages} />
        </div>
      </article>

      <article className="beemun-dashboard-card">
        <p className="beemun-eyebrow">Next recommended action</p>
        <h2>Manage your product catalog</h2>
        <p>
          Product creation is intentionally staged. The next milestone will add
          draft creation using Medusa products plus BEEMUN ZPS disclosure data.
        </p>
        <Link
          className="beemun-btn-secondary"
          href={`/${countryCode}/maker-dashboard/product-onboarding`}
        >
          Start product onboarding
        </Link>
      </article>

      <article className="beemun-dashboard-card">
        <p className="beemun-eyebrow">Latest product review</p>
        <h2>{reviewStatusLabel(latestReview?.status)}</h2>
        <p>
          {latestReview
            ? `Product ${latestReview.product_id} was last recorded as ${reviewStatusLabel(
                latestReview.status
              )}.`
            : "No product reviews have started yet."}
        </p>
      </article>

      <article className="beemun-dashboard-card">
        <p className="beemun-eyebrow">Latest message</p>
        <h2>{latestMessage ? "Conversation active" : "No new messages"}</h2>
        <p>
          {latestMessage
            ? latestMessage.body || latestMessage.text || "A BEEMUN message is available."
            : "Messages from BEEMUN will appear here as product onboarding opens."}
        </p>
      </article>

      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Approval record</p>
        <h2>Approved on {formatDashboardDate(context.vendor?.approved_at)}</h2>
        <p>
          Your maker approval remains separate from product approval. Every
          product still needs BEEMUN review before public listing.
        </p>
      </article>
    </div>
  )
}

