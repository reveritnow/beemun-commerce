import { Metadata } from "next"
import Link from "next/link"
import { getApprovedMakerDashboardContext } from "../../../../lib/data/maker-dashboard"
import { MakerDashboardNav, shellMetrics } from "./_components/dashboard-ui"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "BEEMUN Maker Dashboard",
  description:
    "Approved BEEMUN makers can access their controlled marketplace workspace.",
}

export default async function MakerDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const context = await getApprovedMakerDashboardContext(countryCode)
  const metrics = shellMetrics(context)

  return (
    <section className="beemun-section beemun-dashboard-shell">
      <div className="beemun-dashboard-hero">
        <div>
          <p className="beemun-eyebrow">Approved Maker Workspace</p>
          <h1>{context.vendor?.name || "BEEMUN Maker Dashboard"}</h1>
          <p>
            Your maker profile is approved. Product tools are now being opened
            in controlled stages, with BEEMUN review protecting every public
            product.
          </p>
          <div className="beemun-dashboard-actions">
            <Link
              className="beemun-btn-primary"
              href={`/${countryCode}/maker-dashboard/product-onboarding`}
            >
              Product onboarding
            </Link>
            <Link
              className="beemun-btn-secondary"
              href={`/${countryCode}/maker-dashboard/reviews`}
            >
              Review status
            </Link>
          </div>
        </div>
        <div className="beemun-dashboard-status">
          <span>ZPS 100 Maker</span>
          <strong>Approved</strong>
          <p>Commerce tools unlock through BEEMUN-controlled product review.</p>
        </div>
      </div>

      <div className="beemun-dashboard-metrics">
        <div>
          <span>Linked products</span>
          <strong>{metrics.products}</strong>
        </div>
        <div>
          <span>Open reviews</span>
          <strong>{metrics.openReviews}</strong>
        </div>
        <div>
          <span>Published after ZPS</span>
          <strong>{metrics.published}</strong>
        </div>
      </div>

      <div className="beemun-dashboard-layout">
        <MakerDashboardNav countryCode={countryCode} />
        <div className="beemun-dashboard-main">{children}</div>
      </div>
    </section>
  )
}
