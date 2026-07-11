import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"
import { MakerDashboardEmpty, formatDashboardDate } from "../_components/dashboard-ui"

export default async function MakerDashboardMessagesPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const context = await getApprovedMakerDashboardContext(countryCode)
  const messages = context.messages || []

  if (!messages.length) {
    return (
      <MakerDashboardEmpty
        title="No dashboard messages yet"
        body="BEEMUN messages related to maker approval and future product onboarding will appear here. Product-specific conversations come in the next Stage 3 milestone."
      />
    )
  }

  return (
    <article className="beemun-dashboard-card beemun-dashboard-card-wide">
      <p className="beemun-eyebrow">Messages</p>
      <h2>BEEMUN conversation</h2>
      <div className="beemun-dashboard-thread">
        {messages.map((message) => (
          <div
            className={
              message.author_type === "applicant"
                ? "beemun-message-bubble maker"
                : "beemun-message-bubble admin"
            }
            key={message.id || `${message.created_at}-${message.body}`}
          >
            <span>
              {message.author_type === "applicant" ? "Maker" : "BEEMUN"} ·{" "}
              {formatDashboardDate(message.created_at)}
            </span>
            <p>{message.body || message.text || "Message recorded."}</p>
          </div>
        ))}
      </div>
    </article>
  )
}
