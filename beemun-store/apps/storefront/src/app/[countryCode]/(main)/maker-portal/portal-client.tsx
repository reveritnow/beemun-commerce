"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"

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

type PortalTab =
  | "overview"
  | "application"
  | "documents"
  | "tasks"
  | "messages"
  | "timeline"

const stages = [
  ["submitted", "Application received", "Your India maker application has reached BEEMUN."],
  ["initial_review", "Initial review", "Business details, address, agreement, and completeness are checked."],
  ["zps_review", "ZPS review", "Maker philosophy, ingredients, packaging, and documents are reviewed."],
  ["final_decision", "Final decision", "BEEMUN approves, rejects, or requests changes."],
  ["unlocked", "Maker workspace unlocked", "Product onboarding comes only after approval."],
]

const portalTabs: Array<{ key: PortalTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "application", label: "Application Details" },
  { key: "documents", label: "Documents" },
  { key: "tasks", label: "Tasks" },
  { key: "messages", label: "Messages" },
  { key: "timeline", label: "Review Timeline" },
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
      headline: "Maker workspace unlocked",
      body: "BEEMUN approved your maker profile. Product onboarding remains a separate controlled stage.",
      next: "Product onboarding will open in a later phase.",
    }
  }

  if (status === "rejected") {
    return {
      label: "Decision recorded",
      headline: "Application decision recorded",
      body: "BEEMUN has reviewed your application. Review notes explain the reason and any possible next steps.",
      next: "Read BEEMUN's notes and reply in Messages if requested.",
    }
  }

  if (status === "under_review") {
    return {
      label: "Business review in progress",
      headline: "BEEMUN is reviewing your maker profile",
      body: "Your business identity, documents, maker philosophy, packaging, and ZPS 100 fit are being reviewed.",
      next: "BEEMUN may send messages or tasks if clarification is needed.",
    }
  }

  return {
    label: "Application received",
    headline: "Your application is safely submitted",
    body: "BEEMUN received your India maker application. Product tools remain locked during review.",
    next: "Initial completeness review comes next.",
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return "Not recorded"

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

const formatSize = (value?: number | string | null) => {
  const size = Number(value || 0)
  if (!Number.isFinite(size) || size <= 0) return "Size not recorded"
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

const documentStatus = (status?: string | null) => {
  if (status === "approved") return "Approved"
  if (status === "needs_changes") return "Needs replacement"
  if (status === "rejected") return "Rejected"
  if (status === "submitted") return "Submitted"
  return "Missing"
}

const documentStatusTone = (status?: string | null) => {
  if (status === "approved") return "verified"
  if (status === "needs_changes") return "action"
  if (status === "rejected") return "rejected"
  if (status === "submitted") return "submitted"
  return "missing"
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
    document.file?.original_filename ||
    document.metadata?.original_filename ||
    document.metadata?.file_name ||
    document.file_name ||
    (document.file_url ? "Uploaded document" : "No file uploaded")
  )
}

const hasStoredFile = (document: Record<string, any>) =>
  Boolean(document.file || document.metadata?.storage_status === "stored")

export default function MakerPortalClient({
  countryCode,
}: {
  countryCode: string
}) {
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<PortalTab>("overview")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [documentFile, setDocumentFile] = useState<File | null>(null)
  const [documentFileError, setDocumentFileError] = useState("")
  const [documentSubmitting, setDocumentSubmitting] = useState(false)
  const [messageSubmitting, setMessageSubmitting] = useState(false)
  const [taskSubmitting, setTaskSubmitting] = useState<string | null>(null)
  const messageThreadRef = useRef<HTMLDivElement | null>(null)

  const vendor = data?.vendor
  const metadata = vendor?.metadata || {}
  const address = metadata.address || {}
  const isApproved = vendor?.status === "approved"
  const stageIndex = stageIndexFor(vendor?.status)
  const status = statusCopy(vendor?.status)
  const tasks = useMemo(() => data?.tasks || [], [data?.tasks])
  const messages = useMemo(() => data?.messages || [], [data?.messages])
  const documents = useMemo(() => data?.documents || [], [data?.documents])
  const reviewEvents = useMemo(
    () => data?.review_events || [],
    [data?.review_events]
  )
  const latestReviewEvent = reviewEvents[reviewEvents.length - 1]
  const openTasks = tasks.filter((task) => task.status !== "completed")
  const uploadedDocuments = documents.filter(hasStoredFile)
  const missingDocuments = documents.filter(
    (document) => document.metadata?.required === true && !hasStoredFile(document)
  )
  const latestMessage = messages[messages.length - 1]

  useEffect(() => {
    if (activeTab === "messages" && messageThreadRef.current) {
      messageThreadRef.current.scrollTop = messageThreadRef.current.scrollHeight
    }
  }, [activeTab, messages.length])

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

    if (!text || messageSubmitting) return

    try {
      setMessageSubmitting(true)
      await sendPortalAction({ action: "message", text })
      setMessage("Message sent to BEEMUN.")
      form.reset()
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Message failed.")
    } finally {
      setMessageSubmitting(false)
    }
  }

  const completeTask = async (taskId: string) => {
    if (taskSubmitting) return

    try {
      setTaskSubmitting(taskId)
      await sendPortalAction({ action: "complete_task", task_id: taskId })
      setMessage("Task marked complete.")
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "Task update failed.")
    } finally {
      setTaskSubmitting(null)
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
      setMessage("Document uploaded for BEEMUN review.")
      form.reset()
      setDocumentFile(null)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Document failed.")
    } finally {
      setDocumentSubmitting(false)
    }
  }

  const renderOverview = () => (
    <div className="beemun-portal-dashboard-grid">
      <article className="beemun-portal-card beemun-portal-card-wide">
        <div className="beemun-portal-card-head">
          <div>
            <p className="beemun-eyebrow">Approval workspace</p>
            <h2>{status.next}</h2>
          </div>
          <span>{vendor?.status.replace("_", " ")}</span>
        </div>
        <div className="beemun-portal-metrics">
          <div>
            <span>Open tasks</span>
            <strong>{openTasks.length}</strong>
          </div>
          <div>
            <span>Documents received</span>
            <strong>{uploadedDocuments.length}</strong>
          </div>
          <div>
            <span>Required missing</span>
            <strong>{missingDocuments.length}</strong>
          </div>
        </div>
      </article>

      <article className="beemun-portal-card">
        <p className="beemun-eyebrow">Next step</p>
        <h2>{openTasks.length ? "Action requested" : "BEEMUN review continues"}</h2>
        <p>
          {openTasks.length
            ? "BEEMUN has requested information from you. Open Tasks to respond."
            : "We will request anything else here. Product tools stay closed until approval."}
        </p>
        <button className="beemun-btn-secondary" type="button" onClick={() => setActiveTab(openTasks.length ? "tasks" : "timeline")}>
          {openTasks.length ? "Open tasks" : "View timeline"}
        </button>
      </article>

      <article className="beemun-portal-card">
        <p className="beemun-eyebrow">Latest message</p>
        <h2>{latestMessage ? "Conversation updated" : "No messages yet"}</h2>
        <p>
          {latestMessage
            ? messageText(latestMessage)
            : "BEEMUN review communication will appear in Messages."}
        </p>
        <button className="beemun-btn-secondary" type="button" onClick={() => setActiveTab("messages")}>
          Open messages
        </button>
      </article>

      <article className="beemun-portal-card beemun-portal-lock-card">
        <p className="beemun-eyebrow">
          {isApproved ? "Unlocked status" : "Locked maker workspace"}
        </p>
        <h2>
          {isApproved
            ? "Maker workspace unlocked"
            : "Maker workspace unlocks after approval."}
        </h2>
        <p>
          {isApproved
            ? "Your maker profile is approved. Product onboarding, uploads, orders, inventory, payouts, and analytics are still not part of this stage."
            : "No product uploads, orders, analytics, payouts, shipping, or inventory tools are available during application review."}
        </p>
        <button className="beemun-disabled-cta" type="button" disabled>
          Product tools unavailable during application review
        </button>
      </article>
    </div>
  )

  const renderApplication = () => (
    <div className="beemun-portal-dashboard-grid">
      <article className="beemun-portal-card">
        <p className="beemun-eyebrow">Business identity</p>
        <h2>{metadata.brand_public_name || vendor?.name}</h2>
        <dl className="beemun-summary-list">
          <div>
            <dt>Legal name</dt>
            <dd>{metadata.legal_business_name || vendor?.name}</dd>
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
            <dd>{vendor?.email || "Not provided"}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{vendor?.phone || "Not provided"}</dd>
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
        <p className="beemun-eyebrow">Maker philosophy</p>
        <h2>Application summary</h2>
        <dl className="beemun-summary-list">
          <div>
            <dt>Submitted</dt>
            <dd>{formatDate(vendor?.submitted_at)}</dd>
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
            <dd>{metadata.agreement_accepted ? "Accepted" : "Not recorded"}</dd>
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
    </div>
  )

  const renderDocuments = () => (
    <div className="beemun-portal-dashboard-grid">
      <article className="beemun-portal-card beemun-portal-card-wide">
        <div className="beemun-portal-card-head">
          <div>
            <p className="beemun-eyebrow">Documents</p>
            <h2>Upload documents for review</h2>
            <p>
              Upload or replace requested files here. BEEMUN may ask for a clearer
              copy if anything is incomplete.
            </p>
          </div>
          <span>{uploadedDocuments.length} received</span>
        </div>
        {documents.length ? (
          <div className="beemun-document-list">
            {documents.map((document) => (
              <div className="beemun-document-row" key={document.id}>
                <div>
                  <strong>{document.title}</strong>
                  <p>
                    {hasStoredFile(document)
                      ? `${documentFileLabel(document)} / ${document.file?.mime_type || document.metadata?.mime_type || "File"} / ${formatSize(document.file?.file_size || document.metadata?.file_size)}`
                      : document.status === "needs_changes"
                      ? "BEEMUN requested a replacement."
                      : "No uploaded file yet."}
                  </p>
                  <p>
                    {document.metadata?.required ? "Required" : "Optional"} / Uploaded {formatDate(document.file?.created_at || document.updated_at)}
                  </p>
                </div>
                <div>
                  <span className={`beemun-document-status ${documentStatusTone(document.status)}`}>
                    {documentStatus(document.status)}
                  </span>
                  {hasStoredFile(document) && (
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
              </div>
            ))}
          </div>
        ) : (
          <p>No documents recorded yet. BEEMUN will request anything missing here.</p>
        )}
      </article>

      <article className="beemun-portal-card beemun-portal-card-wide">
        <p className="beemun-eyebrow">Upload center</p>
        <h2>Send a document to BEEMUN</h2>
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
            <option value="business_registration">Business registration proof</option>
            <option value="brand_logo">Brand logo</option>
            <option value="certifications">Certifications</option>
            <option value="supporting_documents">Supporting document</option>
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
                <span>{documentFile.type || "File"} / {formatSize(documentFile.size)}</span>
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
    </div>
  )

  const renderTasks = () => (
    <article className="beemun-portal-card beemun-portal-card-wide">
      <p className="beemun-eyebrow">Tasks</p>
      <h2>Review checklist</h2>
      {tasks.length ? (
        <div className="beemun-task-list">
          {tasks.map((task) => (
            <div className="beemun-task-card" key={task.id}>
              <div>
                <span>{task.status === "completed" ? "Completed" : "Requested"}</span>
                <strong>{task.title}</strong>
                <p>{task.description || "No extra detail provided."}</p>
                <p>Requested {formatDate(task.created_at)}</p>
              </div>
              {task.status !== "completed" && (
                <button
                  className="beemun-btn-secondary"
                  disabled={taskSubmitting === task.id}
                  type="button"
                  onClick={() => completeTask(task.id)}
                >
                  {taskSubmitting === task.id ? "Saving..." : "Mark completed"}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p>No open tasks. BEEMUN will request anything else here.</p>
      )}
    </article>
  )

  const renderMessages = () => (
    <article className="beemun-portal-card beemun-portal-card-wide">
      <p className="beemun-eyebrow">Messages</p>
      <h2>Review conversation</h2>
      {messages.length ? (
        <div className="beemun-message-thread" ref={messageThreadRef}>
          {messages.map((item) => {
            const isApplicant = item.author_type === "applicant"
            return (
              <div
                className={isApplicant ? "beemun-message-bubble maker" : "beemun-message-bubble admin"}
                key={item.id}
              >
                <span>{isApplicant ? "You" : "BEEMUN Review"} / {formatDate(item.created_at)}</span>
                <p>{messageText(item)}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <p>No messages yet. BEEMUN review communication will appear here.</p>
      )}
      <form onSubmit={submitMessage}>
        <textarea name="message" rows={3} placeholder="Reply to BEEMUN" />
        <button
          className="beemun-btn-secondary"
          disabled={messageSubmitting}
          type="submit"
        >
          {messageSubmitting ? "Sending..." : "Send message"}
        </button>
      </form>
    </article>
  )

  const renderTimeline = () => (
    <div className="beemun-portal-dashboard-grid">
      <article className="beemun-portal-card beemun-portal-card-wide">
        <div className="beemun-portal-card-head">
          <div>
            <p className="beemun-eyebrow">Review timeline</p>
            <h2>{status.next}</h2>
          </div>
          <span>{vendor?.status.replace("_", " ")}</span>
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

      <article className="beemun-portal-card beemun-portal-card-wide">
        <p className="beemun-eyebrow">Review notes</p>
        <h2>BEEMUN reviewer context</h2>
        <p>
          {vendor?.status_reason ||
            latestReviewEvent?.notes ||
            latestReviewEvent?.reason ||
            "No reviewer notes yet. BEEMUN will add notes if clarification or a decision is needed."}
        </p>
      </article>
    </div>
  )

  return (
    <section className="beemun-section beemun-application-section">
      {loading ? (
        <div className="beemun-portal-status-card">
          <p className="beemun-eyebrow">BEEMUN Maker Portal</p>
          <h1>Loading your application...</h1>
        </div>
      ) : error && !vendor ? (
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
          {error && <p className="beemun-application-error">{error}</p>}

          <nav className="beemun-portal-tabs" aria-label="Maker approval workspace">
            {portalTabs.map((tab) => (
              <button
                key={tab.key}
                className={activeTab === tab.key ? "active" : ""}
                type="button"
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === "overview" && renderOverview()}
          {activeTab === "application" && renderApplication()}
          {activeTab === "documents" && renderDocuments()}
          {activeTab === "tasks" && renderTasks()}
          {activeTab === "messages" && renderMessages()}
          {activeTab === "timeline" && renderTimeline()}
        </div>
      )}
    </section>
  )
}
