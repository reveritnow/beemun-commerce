"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"

type Vendor = {
  id: string
  name: string
  status: string
  status_reason?: string | null
  submitted_at?: string | null
  approved_at?: string | null
  metadata?: Record<string, any> | null
}

type PortalData = {
  vendor: Vendor | null
  review_events: Array<Record<string, any>>
  documents: Array<Record<string, any>>
  tasks: Array<Record<string, any>>
  messages: Array<Record<string, any>>
}

const stages = [
  {
    key: "submitted",
    title: "Submitted",
    copy: "Your maker profile has reached BEEMUN.",
  },
  {
    key: "initial_review",
    title: "Initial Review",
    copy: "BEEMUN checks completeness and maker fit.",
  },
  {
    key: "zps_review",
    title: "ZPS Review",
    copy: "Sourcing, materials, packaging, and claims are reviewed.",
  },
  {
    key: "final_decision",
    title: "Final Decision",
    copy: "BEEMUN approves, rejects, or requests changes.",
  },
  {
    key: "unlocked",
    title: "Maker Dashboard Unlocked",
    copy: "Product onboarding becomes available after approval.",
  },
]

const stageIndexFor = (status?: string | null) => {
  if (status === "approved") {
    return 4
  }

  if (status === "rejected") {
    return 3
  }

  if (status === "under_review") {
    return 2
  }

  if (status === "submitted") {
    return 1
  }

  return 0
}

const statusCopy = (status?: string | null) => {
  if (status === "approved") {
    return {
      label: "Maker Dashboard unlocked",
      headline: "Approved maker profile",
      body: "BEEMUN approved your maker profile. Product onboarding is the next controlled phase.",
      next: "Next: BEEMUN will open product onboarding.",
    }
  }

  if (status === "rejected") {
    return {
      label: "Decision recorded",
      headline: "Application needs a new path",
      body: "BEEMUN has recorded a decision on this maker profile. Review notes will explain the next option.",
      next: "Next: review BEEMUN notes or contact the review team.",
    }
  }

  if (status === "under_review") {
    return {
      label: "Application under review",
      headline: "BEEMUN is reviewing your maker profile",
      body: "Your profile is being checked against maker accountability, ZPS 100 fit, and disclosure expectations.",
      next: "Next: BEEMUN may ask for documents, clarification, or packaging evidence.",
    }
  }

  return {
    label: "Application submitted",
    headline: "Your application is in the review queue",
    body: "BEEMUN received your maker profile. Product tools remain locked while the review begins.",
    next: "Next: initial completeness review.",
  }
}

const documentStatus = (status: string) => {
  if (status === "approved") {
    return "Approved"
  }

  if (status === "needs_changes") {
    return "Needs replacement"
  }

  return "Pending"
}

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Not recorded"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value))
}

export default function MakerPortalClient({
  countryCode,
}: {
  countryCode: string
}) {
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const vendor = data?.vendor
  const isApproved = vendor?.status === "approved"
  const stageIndex = stageIndexFor(vendor?.status)
  const status = statusCopy(vendor?.status)
  const metadata = vendor?.metadata || {}
  const tasks = useMemo(() => data?.tasks || [], [data?.tasks])
  const latestReviewEvent = data?.review_events?.[data.review_events.length - 1]

  const load = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/beemun/maker-portal", {
        cache: "no-store",
      })
      const next = await response.json()

      if (!response.ok) {
        throw new Error(next?.message || "Application portal could not load.")
      }

      setData(next)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Application portal could not load."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const sendPortalAction = async (payload: Record<string, any>) => {
    setError("")
    setMessage("")

    const response = await fetch("/api/beemun/maker-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(result?.message || "Portal action failed.")
    }

    setMessage("Saved.")
    await load()
  }

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const text = String(formData.get("message") || "").trim()

    if (!text) {
      return
    }

    try {
      await sendPortalAction({ action: "message", text })
      form.reset()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Message failed.")
    }
  }

  const submitDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      await sendPortalAction({
        action: "document",
        title: String(formData.get("title") || ""),
        file_url: String(formData.get("file_url") || ""),
        note: String(formData.get("note") || ""),
      })
      form.reset()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Document failed.")
    }
  }

  return (
    <section className="beemun-section beemun-application-section">
      {loading ? (
        <div className="beemun-portal-status-card">
          <p className="beemun-eyebrow">BEEMUN Maker Portal</p>
          <h1>Loading your application...</h1>
        </div>
      ) : error ? (
        <p className="beemun-application-error">{error}</p>
      ) : !vendor ? (
        <div className="beemun-portal-empty">
          <p className="beemun-eyebrow">My Application</p>
          <h1>No active maker application yet.</h1>
          <p>
            Start the guided BEEMUN maker application. Product tools remain
            locked until approval.
          </p>
          <Link
            className="beemun-btn-primary"
            href={`/${countryCode}/maker-portal/apply`}
          >
            Start Maker Application
          </Link>
        </div>
      ) : (
        <div className="beemun-portal-shell">
          <div className={isApproved ? "beemun-portal-status-card unlocked" : "beemun-portal-status-card"}>
            <div>
              <p className="beemun-eyebrow">{status.label}</p>
              <h1>{status.headline}</h1>
              <p>{status.body}</p>
            </div>
            <div className="beemun-lock-visual" aria-hidden="true">
              <span>{isApproved ? "UNLOCKED" : "LOCKED"}</span>
              <strong>{isApproved ? "OPEN" : "REVIEW"}</strong>
            </div>
          </div>

          {message && <p className="beemun-application-success">{message}</p>}

          <div className="beemun-portal-grid">
            <article className="beemun-portal-card beemun-portal-card-wide">
              <div className="beemun-portal-card-head">
                <div>
                  <p className="beemun-eyebrow">Review timeline</p>
                  <h2>{status.next}</h2>
                </div>
                <span>{vendor.status.replace("_", " ")}</span>
              </div>
              <ol className="beemun-review-timeline">
                {stages.map((item, index) => (
                  <li
                    key={item.key}
                    className={
                      index < stageIndex
                        ? "complete"
                        : index === stageIndex
                        ? "current"
                        : "locked"
                    }
                  >
                    <span>{index + 1}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Application summary</p>
              <h2>{vendor.name}</h2>
              <dl className="beemun-summary-list">
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDate(vendor.submitted_at)}</dd>
                </div>
                <div>
                  <dt>Categories</dt>
                  <dd>
                    {Array.isArray(metadata.product_categories)
                      ? metadata.product_categories.join(", ")
                      : "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt>ZPS 100 fit</dt>
                  <dd>{metadata.zps_fit || "Not provided"}</dd>
                </div>
              </dl>
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Review notes</p>
              <h2>BEEMUN reviewer context</h2>
              <p>
                {vendor.status_reason ||
                  latestReviewEvent?.notes ||
                  latestReviewEvent?.reason ||
                  "No reviewer notes yet. BEEMUN will add notes if clarification or a decision is needed."}
              </p>
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Messages</p>
              <h2>Review conversation</h2>
              {(data?.messages || []).length ? (
                <div className="beemun-mini-list">
                  {(data?.messages || []).slice(-3).map((item) => (
                    <p key={item.id}>{item.text}</p>
                  ))}
                </div>
              ) : (
                <p>No messages yet. BEEMUN will keep review communication here.</p>
              )}
              <form onSubmit={submitMessage}>
                <textarea name="message" rows={3} placeholder="Reply to BEEMUN" />
                <button className="beemun-btn-secondary" type="submit">
                  Send message
                </button>
              </form>
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Tasks</p>
              <h2>Applicant tasks</h2>
              {tasks.length ? (
                <div className="beemun-mini-list">
                  {tasks.map((task) => (
                    <div key={task.id}>
                      <strong>{task.title}</strong>
                      <span>{task.status || "pending"}</span>
                      {task.status !== "completed" && (
                        <button
                          type="button"
                          onClick={() =>
                            sendPortalAction({
                              action: "complete_task",
                              task_id: task.id,
                            })
                          }
                        >
                          Mark completed
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No open tasks. BEEMUN may add tasks if more detail is needed.</p>
              )}
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Documents</p>
              <h2>Certificates and evidence</h2>
              {(data?.documents || []).length ? (
                <div className="beemun-mini-list">
                  {(data?.documents || []).map((document) => (
                    <div key={document.id}>
                      <strong>{document.title}</strong>
                      <span>{documentStatus(document.status)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No documents uploaded yet.</p>
              )}
              <form onSubmit={submitDocument}>
                <input name="title" placeholder="Document title" required />
                <input name="file_url" placeholder="Secure file link" />
                <textarea name="note" rows={2} placeholder="Optional note" />
                <button className="beemun-btn-secondary" type="submit">
                  Add document
                </button>
              </form>
            </article>

            <article className="beemun-portal-card beemun-portal-card-wide">
              <p className="beemun-eyebrow">
                {isApproved ? "Unlocked state" : "Locked product tools"}
              </p>
              <h2>
                {isApproved
                  ? "Maker Dashboard unlocked"
                  : "Product tools unlock after approval."}
              </h2>
              <p>
                {isApproved
                  ? "Your maker profile is approved. The next phase will be product onboarding and ZPS product review."
                  : "No product uploads, orders, analytics, payouts, shipping, or inventory tools are available during application review."}
              </p>
              <button className="beemun-disabled-cta" type="button" disabled>
                Add your first product - coming next
              </button>
            </article>
          </div>
        </div>
      )}
    </section>
  )
}
