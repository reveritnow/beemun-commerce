import Link from "next/link"
import { MakerDashboardContext } from "../../../../../lib/data/maker-dashboard"

export const dashboardLinks = [
  { href: "", label: "Overview", detail: "Today" },
  { href: "/products", label: "Products", detail: "Catalog" },
  { href: "/product-onboarding", label: "Product Onboarding", detail: "Next" },
  { href: "/drafts", label: "Drafts", detail: "Work" },
  { href: "/reviews", label: "Review Status", detail: "ZPS" },
  { href: "/messages", label: "Messages", detail: "BEEMUN" },
  { href: "/settings", label: "Settings", detail: "Profile" },
]

export const formatDashboardDate = (value?: string | null) => {
  if (!value) {
    return "Not recorded"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value))
}

export const reviewStatusLabel = (status?: string | null) => {
  if (!status) {
    return "No review yet"
  }

  return status.replace(/_/g, " ")
}

export const shellMetrics = (context: MakerDashboardContext) => {
  const reviews = context.product_reviews || []
  const products = context.vendor_products || []
  const openReviews = reviews.filter((review) =>
    ["submitted", "automatic_checks", "pending_zps_review", "needs_changes"].includes(
      review.status
    )
  )
  const publishedReviews = reviews.filter((review) => review.status === "published")
  const drafts = reviews.filter((review) => review.status === "draft")
  const needsChanges = reviews.filter((review) => review.status === "needs_changes")

  return {
    products: products.length,
    drafts: drafts.length,
    openReviews: openReviews.length,
    needsChanges: needsChanges.length,
    published: publishedReviews.length,
    messages: (context.messages || []).length,
  }
}

export function MakerDashboardNav({
  countryCode,
}: {
  countryCode: string
}) {
  return (
    <nav className="beemun-dashboard-nav" aria-label="Maker dashboard">
      {dashboardLinks.map((item) => (
        <Link
          href={`/${countryCode}/maker-dashboard${item.href}`}
          key={item.label}
        >
          <span>{item.detail}</span>
          <strong>{item.label}</strong>
        </Link>
      ))}
    </nav>
  )
}

export function MakerDashboardMetric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function MakerDashboardEmpty({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: { href: string; label: string }
}) {
  return (
    <article className="beemun-dashboard-card beemun-dashboard-card-wide">
      <p className="beemun-eyebrow">Nothing to show yet</p>
      <h2>{title}</h2>
      <p>{body}</p>
      {action && (
        <Link className="beemun-btn-secondary" href={action.href}>
          {action.label}
        </Link>
      )}
    </article>
  )
}

