import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"
import { formatDashboardDate } from "../_components/dashboard-ui"

export default async function MakerDashboardSettingsPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const context = await getApprovedMakerDashboardContext(countryCode)
  const vendor = context.vendor || {}
  const metadata = vendor.metadata || {}

  return (
    <div className="beemun-dashboard-grid">
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Settings</p>
        <h2>Maker profile settings</h2>
        <p>
          Public profile editing will open in a later milestone. For launch
          safety, this page shows the approved maker record without enabling
          unreviewed public profile changes.
        </p>
      </article>
      <article className="beemun-dashboard-card">
        <p className="beemun-eyebrow">Maker</p>
        <h2>{vendor.name}</h2>
        <p>Email: {vendor.email || "Not recorded"}</p>
        <p>Country: {metadata.country_name || vendor.country_code || "Not recorded"}</p>
      </article>
      <article className="beemun-dashboard-card">
        <p className="beemun-eyebrow">Approval</p>
        <h2>{vendor.status}</h2>
        <p>Approved: {formatDashboardDate(vendor.approved_at)}</p>
        <p>Member role: {context.member?.role || "owner"}</p>
      </article>
    </div>
  )
}
