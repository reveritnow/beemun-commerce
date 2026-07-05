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
  ["submitted", "Submitted", "Your India maker application has reached BEEMUN."],
  ["initial_review", "Initial Review", "Business details, address, and agreement are checked."],
  ["zps_review", "ZPS Review", "Maker philosophy, ingredients, packaging, and documents are reviewed."],
  ["final_decision", "Final Decision", "BEEMUN approves, rejects, or requests changes."],
  ["unlocked", "Maker Dashboard Unlocked", "Product onboarding comes only after approval."],
]

const stageIndexFor = (status?: string | null) => {
  if (status === "approved") return 4
  if (status === "rejected") return 3
  if (status === "under_review") return 2
  if (status === "submitted") return 1
  return 0
}

const statusCopy = (status?: string | null) => {
  if (status === "approved") {
    return {
      label: "Maker approved",
      headline: "Maker Dashboard unlocked",
      body: "BEEMUN approved your maker profile. Product onboarding is still a separate controlled phase.",
      next: "Next: product onboarding will open in a later phase.",
    }
  }

  if (status === "rejected") {
    return {
      label: "Decision recorded",
      headline: "Application rejected",
      body: "BEEMUN has recorded a decision. Review notes explain the reason and any possible next steps.",
      next: "Next: review notes and messages from BEEMUN.",
    }
  }

  if (status === "under_review") {
    return {
      label: "Application under review",
      headline: "BEEMUN is reviewing your maker profile",
      body: "Your business identity, documents, maker philosophy, packaging, and ZPS 100 fit are being reviewed.",
      next: "Next: BEEMUN may send messages or tasks if clarification is needed.",
    }
  }

  return {
    label: "Application submitted",
    headline: "Your application is in the review queue",
    body: "BEEMUN received your India maker application. Product tools remain locked during review.",
    next: "Next: initial completeness review.",
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
  return "Pending"
}

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]

const messageText = (item: Record<string, any>) => item.body || item.text || ""
const documentFileLabel = (document: Record<string, any>) => {
  return (
    document.metadata?.original_filename ||
    document.metadata?.file_name ||
    document.file_name ||
    (document.file_url ? "Uploaded document" : "No file uploaded")
  )
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
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentFileError, setDocumentFileError] = useState("")
  const [documentSubmitting, setDocumentSubmitting] = useState(false)

  const vendor = data?.vendor
  const metadata = vendor?.metadata || {}
  const address = metadata.address || {}
  const isApproved = vendor?.status === "approved"
  const stageIndex = stageIndexFor(vendor?.status)
  const status = statusCopy(vendor?.status)
  const tasks = useMemo(() => data?.tasks || [], [data?.tasks])
  const messages = useMemo(() => data?.messages || [], [data?.messages])
  const documents = useMemo(() => data?.documents || [], [data?.documents])
  const latestReviewEvent = data?.review_events?.[data.review_events.length - 1]

  const documentPayloadFromFile = (file: File) => {
    return new Promise<{
      content_base64: string
      file_size: number
      mime_type: string
      original_filename: string
    }>((resolve, reject) => {
      if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
        reject(new Error("Upload a PDF, JPG, PNG, or WEBP file."))
        return
      }

      if (file.size > MAX_DOCUMENT_BYTES) {
        reject(new Error("Each document must be 2 MB or smaller."))
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result || "")
        resolve({
          content_base64: result.includes(",") ? result.split(",")[1] : result,
          file_size: file.size,
          mime_type: file.type,
          original_filename: file.name,
        })
      }
      reader.onerror = () => reject(new Error("This file could not be read."))
      reader.readAsDataURL(file)
    })
  }

  const handleDocumentFile = (file: File | null) => {
    setDocumentFileError("")

    if (!file) {
      setDocumentFile(null)
      return
    }

    if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
      setDocumentFile(null)
      setDocumentFileError("Upload a PDF, JPG, PNG, or WEBP file.")
      return
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      setDocumentFile(null)
      setDocumentFileError("Each document must be 2 MB or smaller.")
      return
    }

    setDocumentFile(file)
  }

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

    if (!text) return

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
    const documentId = String(formData.get("document_id") || "").trim()
    const existingDocument = documents.find((item) => item.id === documentId)
    const title = String(formData.get("title") || "").trim()

    if (!title && !existingDocument) {
      setDocumentFileError("Add a title or choose an existing document request.")
      return
    }
    if (!documentFile) {
      setDocumentFileError("Choose a document file before saving.")
      return
    }

    try {
      setDocumentSubmitting(true)
      const upload = await documentPayloadFromFile(documentFile)
      await sendPortalAction({
        action: "document",
        document_id: documentId || null,
        document_type: String(formData.get("document_type") || "application"),
        title: title || existingDocument?.title,
        upload,
        note: String(formData.get("note") || ""),
      })
      form.reset()
      setDocumentFile(null)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Document failed.")
    } finally {
      setDocumentSubmitting(false)
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
              {messages.length ? (
                <div className="beemun-mini-list">
                  {messages.slice(-5).map((item) => (
                    <div key={item.id}>
                      <span>{item.author_type || "message"}</span>
                      <p>{messageText(item)}</p>
                    </div>
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
              <h2>Clarifications</h2>
              {tasks.length ? (
                <div className="beemun-mini-list">
                  {tasks.map((task) => (
                    <div key={task.id}>
                      <strong>{task.title}</strong>
                      <p>{task.description || "No extra detail provided."}</p>
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
              <h2>Evidence and uploads</h2>
              {documents.length ? (
                <div className="beemun-mini-list">
                  {documents.map((document) => (
                    <div key={document.id}>
                      <strong>{document.title}</strong>
                      <span>{documentStatus(document.status)}</span>
                      <p>
                        {document.file_url
                          ? `${documentFileLabel(document)}${
                              document.metadata?.file_size
                                ? ` / ${Math.max(
                                    1,
                                    Math.round(
                                      Number(document.metadata.file_size) / 1024
                                    )
                                  )} KB`
                                : ""
                            }`
                          : "No uploaded file yet. BEEMUN may request this as a task."}
                      </p>
                      {document.file_url && (
                        <a
                          className="beemun-btn-secondary"
                          href={`/api/beemun/maker-portal/documents/${document.id}/file`}
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
                <p>No documents recorded yet. BEEMUN will request anything missing here.</p>
              )}
              <form onSubmit={submitDocument}>
                <select name="document_id" defaultValue="">
                  <option value="">Upload a new document</option>
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      Replace or complete: {document.title}
                    </option>
                  ))}
                </select>
                <input name="title" placeholder="Document title" />
                <select name="document_type" defaultValue="application">
                  <option value="application">Application document</option>
                  <option value="gst_certificate">GST certificate</option>
                  <option value="business_registration">
                    Business registration proof
                  </option>
                  <option value="brand_logo">Brand logo</option>
                  <option value="certifications">Certifications</option>
                  <option value="supporting_documents">
                    Supporting document
                  </option>
                </select>
                <label className="beemun-file-drop">
                  <input
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    type="file"
                    onChange={(event) =>
                      handleDocumentFile(event.currentTarget.files?.[0] || null)
                    }
                  />
                  <span>{documentFile ? "Replace file" : "Choose file"}</span>
                </label>
                {documentFile && (
                  <div className="beemun-upload-status">
                    <div>
                      <strong>{documentFile.name}</strong>
                      <span>
                        {documentFile.type || "File"} /{" "}
                        {Math.max(1, Math.round(documentFile.size / 1024))} KB
                      </span>
                    </div>
                    <button type="button" onClick={() => setDocumentFile(null)}>
                      Remove
                    </button>
                  </div>
                )}
                {documentFileError && (
                  <p className="beemun-upload-error">{documentFileError}</p>
                )}
                <textarea name="note" rows={2} placeholder="Optional note" />
                <button
                  className="beemun-btn-secondary"
                  disabled={documentSubmitting}
                  type="submit"
                >
                  {documentSubmitting ? "Uploading..." : "Upload document"}
                </button>
              </form>
            </article>

            <article className="beemun-portal-card beemun-portal-card-wide">
              <p className="beemun-eyebrow">
                {isApproved ? "Unlocked status" : "Locked product tools"}
              </p>
              <h2>
                {isApproved
                  ? "Maker Dashboard unlocked"
                  : "Product tools unlock after approval."}
              </h2>
              <p>
                {isApproved
                  ? "Your maker profile is approved. Product onboarding, uploads, orders, inventory, payouts, and analytics are still not built in this phase."
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
