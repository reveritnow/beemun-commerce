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

const tabs = ["Overview", "Timeline", "Messages", "Tasks", "Documents", "Settings"]

const timeline = [
  { key: "submitted", label: "Application Submitted" },
  { key: "initial_review", label: "Initial Review" },
  { key: "under_review", label: "Under Review" },
  { key: "additional_information", label: "Additional Information" },
  { key: "approved", label: "Approved" },
  { key: "maker_portal", label: "Maker Portal Activated" },
]

const completeStep = (key: string, status?: string | null) => {
  if (!status) {
    return false
  }

  if (key === "submitted") {
    return ["submitted", "under_review", "approved", "rejected"].includes(status)
  }

  if (key === "initial_review") {
    return ["under_review", "approved", "rejected"].includes(status)
  }

  if (key === "under_review") {
    return ["under_review", "approved", "rejected"].includes(status)
  }

  if (key === "additional_information") {
    return status === "rejected"
  }

  if (key === "approved" || key === "maker_portal") {
    return status === "approved"
  }

  return false
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

export default function MakerPortalClient({
  countryCode,
}: {
  countryCode: string
}) {
  const [activeTab, setActiveTab] = useState(tabs[0])
  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const isApproved = data?.vendor?.status === "approved"
  const portalTitle = isApproved ? "Maker Dashboard" : "My Application"

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

  const status = data?.vendor?.status
  const applicationTasks = useMemo(() => data?.tasks || [], [data?.tasks])

  return (
    <section className="beemun-section beemun-application-section">
      <div className="beemun-section-head">
        <p className="beemun-eyebrow">BEEMUN Maker Portal</p>
        <h1>{portalTitle}</h1>
        <p>
          {isApproved
            ? "Your BEEMUN maker account is approved. Product onboarding will unlock separately."
            : "Track your application, reply to BEEMUN, complete tasks, and manage review documents."}
        </p>
      </div>

      {loading ? (
        <p>Loading your application...</p>
      ) : error ? (
        <p className="beemun-application-error">{error}</p>
      ) : !data?.vendor ? (
        <div className="beemun-application-success">
          <h2>No active maker application yet.</h2>
          <p>Start your BEEMUN maker application when you are ready.</p>
          <Link className="beemun-btn-primary" href={`/${countryCode}/become-a-maker`}>
            Start Maker Application
          </Link>
        </div>
      ) : (
        <>
          <div className="beemun-radio-row">
            {tabs.map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}>
                {tab}
              </button>
            ))}
          </div>

          {message && <p className="beemun-application-success">{message}</p>}

          {activeTab === "Overview" && (
            <div className="beemun-application-success">
              <h2>{data.vendor.name}</h2>
              <p>Status: {data.vendor.status.replace("_", " ")}</p>
              <p>
                Products, orders, analytics, payouts, and shipping remain locked
                until BEEMUN approves the maker profile.
              </p>
              {data.vendor.status_reason && <p>{data.vendor.status_reason}</p>}
            </div>
          )}

          {activeTab === "Timeline" && (
            <div className="beemun-application-form">
              {timeline.map((item) => (
                <div key={item.key} className="beemun-application-success">
                  <h3>{item.label}</h3>
                  <p>{completeStep(item.key, status) ? "Complete" : "Waiting"}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Messages" && (
            <div className="beemun-application-form">
              {(data.messages || []).map((item) => (
                <div key={item.id} className="beemun-application-success">
                  <p>{item.text}</p>
                  <small>{item.author_type}</small>
                </div>
              ))}
              <form onSubmit={submitMessage}>
                <label>
                  <span>Reply to BEEMUN</span>
                  <textarea name="message" rows={4} required />
                </label>
                <button className="beemun-btn-primary" type="submit">
                  Send message
                </button>
              </form>
            </div>
          )}

          {activeTab === "Tasks" && (
            <div className="beemun-application-form">
              {applicationTasks.length ? (
                applicationTasks.map((task) => (
                  <div key={task.id} className="beemun-application-success">
                    <h3>{task.title}</h3>
                    <p>{task.status || "pending"}</p>
                    {task.status !== "completed" && (
                      <button
                        className="beemun-btn-primary"
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
                ))
              ) : (
                <p>No open tasks from BEEMUN yet.</p>
              )}
            </div>
          )}

          {activeTab === "Documents" && (
            <div className="beemun-application-form">
              {(data.documents || []).map((document) => (
                <div key={document.id} className="beemun-application-success">
                  <h3>{document.title}</h3>
                  <p>{documentStatus(document.status)}</p>
                </div>
              ))}
              <form onSubmit={submitDocument}>
                <label>
                  <span>Document title</span>
                  <input name="title" required />
                </label>
                <label>
                  <span>File URL</span>
                  <input name="file_url" placeholder="Paste a secure file link" />
                </label>
                <label>
                  <span>Note</span>
                  <textarea name="note" rows={3} />
                </label>
                <button className="beemun-btn-primary" type="submit">
                  Add document
                </button>
              </form>
            </div>
          )}

          {activeTab === "Settings" && (
            <div className="beemun-application-success">
              <h2>Account settings</h2>
              <p>
                Authentication, password reset, and session management are
                handled by the single BEEMUN account system.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
