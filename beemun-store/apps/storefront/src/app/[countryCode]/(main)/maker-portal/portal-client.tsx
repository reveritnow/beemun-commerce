"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useState } from "react"

type Vendor = {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  website_url?: string | null
  country_code?: string | null
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
  ["submitted", "Application received", "Your India maker application is safely recorded."],
  ["initial_review", "Completeness review", "Business identity, address, agreement, and documents are checked."],
  ["zps_review", "ZPS review", "Maker philosophy, ingredients, packaging, and standards fit are reviewed."],
  ["final_decision", "Final decision", "BEEMUN approves, rejects, or requests additional clarification."],
  ["unlocked", "Maker workspace unlocked", "Product onboarding becomes available only after approval."],
]

const stageIndexFor = (status?: string | null) => {
  if (status === "approved") return 4
  if (status === "rejected") return 3
  if (status === "under_review") return 2
  if (status === "submitted") return 1
  return 0
}

const statusCopy = (status?: string | null) => {
  if (status === "draft") {
    return {
      label: "Application draft",
      headline: "Your application is not submitted yet",
      body: "Finish the guided application when you are ready. BEEMUN can only review submitted maker applications.",
      next: "Complete and submit the application to start review.",
    }
  }

  if (status === "approved") {
    return {
      label: "Maker approved",
      headline: "Your maker workspace is approved",
      body: "BEEMUN approved your maker profile. Product onboarding remains a separate controlled phase and will open when the next stage is ready.",
      next: "Maker workspace unlocked. Product onboarding is coming next.",
    }
  }

  if (status === "rejected") {
    return {
      label: "Decision recorded",
      headline: "BEEMUN has recorded a decision",
      body: "Your application was not approved in this review cycle. Review notes and messages explain the reason and any possible next steps.",
      next: "Review the decision notes and messages from BEEMUN.",
    }
  }

  if (status === "under_review") {
    return {
      label: "Business review in progress",
      headline: "BEEMUN is reviewing your business",
      body: "Your business identity, uploaded documents, maker philosophy, packaging, and ZPS 100 fit are being reviewed by BEEMUN.",
      next: "BEEMUN will request anything else here.",
    }
  }

  return {
    label: "Application received",
    headline: "Your application is safely submitted",
    body: "BEEMUN received your India maker application. Your maker workspace stays protected until the business review is complete.",
    next: "Initial completeness review is next.",
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return "Not recorded"

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

const documentStatus = (status?: string | null) => {
  if (status === "approved") return "Approved"
  if (status === "needs_changes") return "Needs replacement"
  if (status === "rejected") return "Rejected"
  if (status === "submitted") return "Submitted"
  return "Not yet reviewed"
}

const messageText = (item: Record<string, any>) => item.body || item.text || ""

const documentFileLabel = (document: Record<string, any>) => {
  return (
    document.metadata?.file_name ||
    document.file_name ||
    (document.file_url ? "Uploaded file" : "No file uploaded")
  )
}

const documentTone = (status?: string | null) => {
  if (status === "approved") return "good"
  if (status === "needs_changes" || status === "rejected") return "attention"
  if (status === "submitted" || status === "under_review") return "active"
  return "muted"
}

const taskLabel = (status?: string | null) => {
  if (status === "completed") return "Completed"
  return "Action requested"
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
  const [actionBusy, setActionBusy] = useState("")

  const vendor = data?.vendor
  const metadata = vendor?.metadata || {}
  const address = metadata.address || {}
  const isApproved = vendor?.status === "approved"
  const stageIndex = stageIndexFor(vendor?.status)
  const status = statusCopy(vendor?.status)
  const tasks = useMemo(() => data?.tasks || [], [data?.tasks])
  const messages = useMemo(() => data?.messages || [], [data?.messages])
  const documents = useMemo(() => data?.documents || [], [data?.documents])
  const reviewNotes = Array.isArray(metadata.review_notes)
    ? metadata.review_notes
    : []
  const openTasks = tasks.filter((task) => task.status !== "completed")
  const uploadedDocuments = documents.filter((document) => document.file_url)
  const missingDocuments = documents.filter((document) => !document.file_url)
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

  const sendPortalAction = async (
    payload: Record<string, any>,
    busyLabel = "portal-action"
  ) => {
    setError("")
    setMessage("")
    setActionBusy(busyLabel)

    try {
      const response = await fetch("/api/beemun/maker-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result?.message || "Portal action failed.")
      }

      setMessage("Saved. Your application portal is up to date.")
      await load()
    } finally {
      setActionBusy("")
    }
  }

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const text = String(formData.get("message") || "").trim()

    if (!text) return

    try {
      await sendPortalAction({ action: "message", text }, "message")
      form.reset()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Message failed.")
    }
  }

  const submitDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const title = String(formData.get("title") || "").trim()
    const fileUrl = String(formData.get("file_url") || "").trim()

    if (!title) return

    try {
      await sendPortalAction({
        action: "document",
        document_type: String(formData.get("document_type") || "application"),
        title,
        file_url: fileUrl || null,
        note: String(formData.get("note") || ""),
      }, "document")
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
          <h1>Loading your application review...</h1>
        </div>
      ) : error ? (
        <p className="beemun-application-error">{error}</p>
      ) : !vendor ? (
        <div className="beemun-portal-empty">
          <p className="beemun-eyebrow">My Application</p>
          <h1>No active maker application yet.</h1>
          <p>
            Start the guided India maker application. Product tools remain
            locked until BEEMUN approval.
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
              <div className="beemun-portal-hero-facts">
                <span>Submitted: {formatDate(vendor.submitted_at)}</span>
                <span>{openTasks.length ? `${openTasks.length} action requested` : "No open tasks"}</span>
                <span>{uploadedDocuments.length} document{uploadedDocuments.length === 1 ? "" : "s"} received</span>
              </div>
            </div>
            <div className="beemun-lock-visual" aria-hidden="true">
              <span>{isApproved ? "APPROVED" : "PROTECTED"}</span>
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
                {stages.map(([key, title, copy], index) => (
                  <li
                    key={key}
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
                      <strong>{title}</strong>
                      <p>{copy}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>

            <article className="beemun-portal-card beemun-portal-card-wide beemun-next-step-card">
              <p className="beemun-eyebrow">What happens now</p>
              <h2>
                {openTasks.length
                  ? "BEEMUN needs a response from you."
                  : vendor.status === "draft"
                  ? "Submit your application when it is ready."
                  : vendor.status === "rejected"
                  ? "Review the decision before taking next steps."
                  : isApproved
                  ? "Your maker status is approved."
                  : "BEEMUN is reviewing your business."}
              </h2>
              <p>
                {openTasks.length
                  ? "Complete the requested tasks below so the review can continue without email chains."
                  : vendor.status === "draft"
                  ? "Your details are not in BEEMUN review yet. Return to the application flow to complete and submit."
                  : vendor.status === "rejected"
                  ? "Use the notes and messages below to understand the decision. Product tools remain unavailable."
                  : isApproved
                  ? "Your maker profile is approved. Product tools are intentionally not part of this Stage 2 release."
                  : "You do not need to resubmit. We will request anything else here in the portal."}
              </p>
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Business identity</p>
              <h2>{metadata.brand_public_name || vendor.name}</h2>
              <dl className="beemun-summary-list">
                <div>
                  <dt>Legal name</dt>
                  <dd>{metadata.legal_business_name || vendor.name}</dd>
                </div>
                <div>
                  <dt>Business type</dt>
                  <dd>{metadata.business_type || "Not provided"}</dd>
                </div>
                <div>
                  <dt>GSTIN</dt>
                  <dd>{metadata.gstin || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Country</dt>
                  <dd>{metadata.country_name || "India"}</dd>
                </div>
              </dl>
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Contact and address</p>
              <h2>{metadata.contact_name || "Primary contact"}</h2>
              <dl className="beemun-summary-list">
                <div>
                  <dt>Email</dt>
                  <dd>{vendor.email || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{vendor.phone || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>
                    {[address.line_1, address.line_2, address.city, address.state, address.pin_code]
                      .filter(Boolean)
                      .join(", ") || "Not provided"}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Application summary</p>
              <h2>Maker philosophy</h2>
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
              <p className="beemun-eyebrow">Agreement</p>
              <h2>Maker terms</h2>
              <dl className="beemun-summary-list">
                <div>
                  <dt>Status</dt>
                  <dd>
                    {metadata.agreement_accepted
                      ? "Accepted"
                      : "Not recorded"}
                  </dd>
                </div>
                <div>
                  <dt>Accepted at</dt>
                  <dd>{formatDate(metadata.agreement_accepted_at)}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{metadata.agreement_version || "maker-application-v1"}</dd>
                </div>
              </dl>
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Review notes</p>
              <h2>BEEMUN reviewer context</h2>
              {reviewNotes.length ? (
                <div className="beemun-mini-list">
                  {reviewNotes.slice(-3).map((note) => (
                    <div key={note.id || note.created_at || note.note}>
                      <span>{formatDate(note.created_at)}</span>
                      <p>{note.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>
                  {vendor.status_reason ||
                    latestReviewEvent?.notes ||
                    latestReviewEvent?.reason ||
                    "No reviewer notes yet. BEEMUN will add notes if clarification or a decision is needed."}
                </p>
              )}
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Messages</p>
              <h2>Review conversation</h2>
              {messages.length ? (
                <div className="beemun-mini-list">
                  {messages.slice(-5).map((item) => (
                    <div key={item.id}>
                      <span>{item.author_type === "admin" ? "BEEMUN" : "You"}</span>
                      <p>{messageText(item)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="beemun-empty-state">No messages yet. BEEMUN will keep review communication here, not in scattered email threads.</p>
              )}
              <form onSubmit={submitMessage}>
                <textarea name="message" rows={3} placeholder="Reply to BEEMUN" />
                <button
                  className="beemun-btn-secondary"
                  type="submit"
                  disabled={actionBusy === "message"}
                >
                  {actionBusy === "message" ? "Sending..." : "Send message"}
                </button>
              </form>
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Tasks</p>
              <h2>Clarifications</h2>
              {tasks.length ? (
                <div className="beemun-mini-list">
                  {tasks.map((task) => (
                    <div key={task.id}>
                      <strong>{task.title}</strong>
                      <p>{task.description || "No extra detail provided."}</p>
                      <span>{taskLabel(task.status)}</span>
                      {task.status !== "completed" && (
                        <button
                          type="button"
                          disabled={actionBusy === task.id}
                          onClick={async () => {
                            try {
                              await sendPortalAction(
                                {
                                  action: "complete_task",
                                  task_id: task.id,
                                },
                                task.id
                              )
                            } catch (taskError) {
                              setError(
                                taskError instanceof Error
                                  ? taskError.message
                                  : "Task could not be updated."
                              )
                            }
                          }}
                        >
                          {actionBusy === task.id ? "Saving..." : "Mark completed"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="beemun-empty-state">No open tasks. If BEEMUN needs certificates, packaging images, or clarification, it will appear here.</p>
              )}
            </article>

            <article className="beemun-portal-card">
              <p className="beemun-eyebrow">Documents</p>
              <h2>Evidence and uploads</h2>
              {documents.length ? (
                <div className="beemun-mini-list">
                  {documents.map((document) => (
                    <div key={document.id} className={`beemun-document-row ${documentTone(document.status)}`}>
                      <strong>{document.title}</strong>
                      <span>{documentStatus(document.status)}</span>
                      <p>
                        {document.file_url
                          ? documentFileLabel(document)
                          : "No uploaded file yet. BEEMUN may request this as a task."}
                      </p>
                      {document.file_url && (
                        <a
                          className="beemun-btn-secondary"
                          href={document.file_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          View document
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="beemun-empty-state">No documents are attached yet. BEEMUN will request anything missing as a task.</p>
              )}
              <form onSubmit={submitDocument}>
                <input name="title" placeholder="Document title" required />
                <input name="file_url" placeholder="Secure document link if BEEMUN requested one" />
                <textarea name="note" rows={2} placeholder="Optional note" />
                <button
                  className="beemun-btn-secondary"
                  type="submit"
                  disabled={actionBusy === "document"}
                >
                  {actionBusy === "document" ? "Saving..." : "Add document link/note"}
                </button>
              </form>
            </article>

            <article className="beemun-portal-card beemun-portal-card-wide">
              <p className="beemun-eyebrow">
                {isApproved ? "Unlocked status" : "Locked product tools"}
              </p>
              <h2>
                {isApproved
                  ? "Maker workspace unlocked"
                  : "Maker workspace unlocks after approval."}
              </h2>
              <p>
                {isApproved
                  ? "Your maker profile is approved. Product onboarding, uploads, orders, inventory, payouts, and analytics are intentionally outside this Stage 2 release."
                  : "Product uploads, orders, analytics, payouts, shipping, and inventory tools stay hidden while BEEMUN reviews your application."}
              </p>
              <button className="beemun-disabled-cta" type="button" disabled>
                Add your first product - coming in Stage 3
              </button>
            </article>
          </div>
        </div>
      )}
    </section>
  )
}
