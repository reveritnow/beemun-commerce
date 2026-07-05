import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

type VendorStatus = "submitted" | "under_review" | "approved" | "rejected"

type VendorMetadata = {
  legal_business_name?: string | null
  brand_public_name?: string | null
  business_type?: string | null
  gstin?: string | null
  application_country?: string | null
  country_name?: string | null
  contact_name?: string | null
  website_or_instagram?: string | null
  product_categories?: string[] | string | null
  products_to_list?: string | null
  ingredient_philosophy?: string | null
  packaging_philosophy?: string | null
  zps_fit?: string | null
  notes?: string | null
  address?: Record<string, string | null>
  agreement_accepted?: boolean
  agreement_accepted_at?: string | null
  agreement_version?: string | null
  review_notes?: Array<Record<string, any>>
}

type Vendor = {
  id: string
  name: string
  handle: string
  email: string
  phone?: string | null
  website_url?: string | null
  country_code?: string | null
  description?: string | null
  status: VendorStatus | string
  status_reason?: string | null
  submitted_at?: string | null
  created_at?: string | null
  metadata?: VendorMetadata | null
  documents?: Array<Record<string, any>>
  application_tasks?: Array<Record<string, any>>
  application_messages?: Array<Record<string, any>>
  review_events?: Array<Record<string, any>>
}

const reviewStatuses: VendorStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
]

const statusLabels: Record<VendorStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
}

const statusClasses: Record<VendorStatus, string> = {
  submitted: "bg-blue-50 text-blue-700 border-blue-200",
  under_review: "bg-orange-50 text-orange-700 border-orange-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
}

const statusLabel = (status: string) => {
  return statusLabels[status as VendorStatus] || status
}

const statusClass = (status: string) => {
  return (
    statusClasses[status as VendorStatus] ||
    "bg-ui-bg-subtle text-ui-fg-subtle border-ui-border-base"
  )
}

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Not recorded"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

const categoriesText = (value?: string[] | string | null) => {
  if (Array.isArray(value)) {
    return value.join(", ")
  }

  return value || "Not provided"
}

const documentFileLabel = (document: Record<string, any>) => {
  return (
    document.metadata?.file_name ||
    document.file_name ||
    (document.file_url ? "Uploaded file" : "No file uploaded")
  )
}

const normalizeError = async (response: Response) => {
  const data = await response.json().catch(() => null)

  return (
    data?.message ||
    data?.error ||
    "The maker application could not be updated."
  )
}

const DetailRow = ({
  label,
  value,
}: {
  label: string
  value?: string | null
}) => (
  <div className="flex flex-col gap-y-1">
    <span className="text-xs font-medium text-ui-fg-muted">{label}</span>
    <span className="whitespace-pre-wrap text-sm text-ui-fg-base">
      {value || "Not provided"}
    </span>
  </div>
)

const Panel = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => (
  <section className="flex flex-col gap-y-4 rounded-lg border border-ui-border-base p-4">
    <h3 className="text-base font-semibold text-ui-fg-base">{title}</h3>
    {children}
  </section>
)

const MakerReviewPage = () => {
  const [activeStatus, setActiveStatus] = useState<VendorStatus>("submitted")
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [reviewNote, setReviewNote] = useState("")
  const [adminMessage, setAdminMessage] = useState("")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const selectedVendor = useMemo(() => {
    return vendors.find((vendor) => vendor.id === selectedId) || vendors[0]
  }, [selectedId, vendors])

  const loadVendors = async (status: VendorStatus) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/admin/beemun/vendors?status=${status}`, {
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(await normalizeError(response))
      }

      const data = await response.json()
      const nextVendors = (data.vendors || []) as Vendor[]
      setVendors(nextVendors)
      setSelectedId((current) =>
        current && nextVendors.some((vendor) => vendor.id === current)
          ? current
          : nextVendors[0]?.id || null
      )
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Maker applications could not be loaded."
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVendors(activeStatus)
  }, [activeStatus])

  const postAction = async (
    vendor: Vendor,
    path: string,
    payload: Record<string, any>
  ) => {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch(`/admin/beemun/vendors/${vendor.id}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(await normalizeError(response))
      }

      setMessage("Maker application updated.")
      await loadVendors(activeStatus)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Maker application could not be updated."
      )
    } finally {
      setSaving(false)
    }
  }

  const transitionVendor = async (
    vendor: Vendor,
    action: "under-review" | "approve" | "reject"
  ) => {
    const reason =
      action === "reject"
        ? rejectReason.trim()
        : action === "approve"
        ? "Maker approved by BEEMUN admin"
        : "Maker moved to BEEMUN review"

    if (action === "reject" && !reason) {
      setError("Add a rejection reason before rejecting this maker.")
      return
    }

    await postAction(vendor, action, {
      reason,
      status_reason: reason,
      event_metadata: {
        source: "beemun_admin_maker_review",
      },
    })
    setRejectReason("")
  }

  const submitNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedVendor || !reviewNote.trim()) return
    await postAction(selectedVendor, "note", { note: reviewNote.trim() })
    setReviewNote("")
  }

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedVendor || !adminMessage.trim()) return
    await postAction(selectedVendor, "message", { text: adminMessage.trim() })
    setAdminMessage("")
  }

  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedVendor || !taskTitle.trim()) return
    await postAction(selectedVendor, "task", {
      title: taskTitle.trim(),
      description: taskDescription.trim() || null,
      message: taskDescription.trim()
        ? `BEEMUN requested clarification: ${taskTitle.trim()}`
        : null,
    })
    setTaskTitle("")
    setTaskDescription("")
  }

  const handleReasonChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setRejectReason(event.target.value)
  }

  const metadata = selectedVendor?.metadata || {}
  const address = metadata.address || {}

  return (
    <div className="flex flex-col gap-y-6 bg-ui-bg-base">
      <div className="flex flex-col gap-y-2 border-b border-ui-border-base px-6 py-5">
        <span className="text-xs font-medium text-ui-fg-muted">
          BEEMUN Marketplace
        </span>
        <div className="flex flex-col gap-y-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ui-fg-base">
              Maker applications
            </h1>
            <p className="text-sm text-ui-fg-subtle">
              Review India maker applications before marketplace access unlocks.
            </p>
          </div>
          {selectedVendor && (
            <span
              className={`inline-flex w-fit rounded-full border px-2 py-1 text-xs font-medium ${statusClass(
                selectedVendor.status
              )}`}
            >
              {statusLabel(selectedVendor.status)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-6">
        {reviewStatuses.map((status) => (
          <button
            key={status}
            type="button"
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              activeStatus === status
                ? "border-ui-border-interactive bg-ui-bg-interactive text-ui-fg-on-color"
                : "border-ui-border-base bg-ui-bg-base text-ui-fg-base"
            }`}
            onClick={() => setActiveStatus(status)}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>

      {(message || error) && (
        <div className="px-6">
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {error || message}
          </div>
        </div>
      )}

      <div className="grid gap-6 px-6 pb-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]">
        <div className="overflow-hidden rounded-lg border border-ui-border-base">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="border-b border-ui-border-base bg-ui-bg-subtle">
              <tr>
                <th className="px-4 py-3 font-medium text-ui-fg-muted">Maker</th>
                <th className="px-4 py-3 font-medium text-ui-fg-muted">Email</th>
                <th className="px-4 py-3 font-medium text-ui-fg-muted">
                  Submitted
                </th>
                <th className="px-4 py-3 font-medium text-ui-fg-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-ui-fg-subtle" colSpan={4}>
                    Loading maker applications...
                  </td>
                </tr>
              ) : vendors.length ? (
                vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className={`cursor-pointer border-b border-ui-border-base last:border-b-0 ${
                      selectedVendor?.id === vendor.id ? "bg-ui-bg-subtle" : ""
                    }`}
                    onClick={() => setSelectedId(vendor.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-ui-fg-base">
                          {vendor.metadata?.brand_public_name || vendor.name}
                        </span>
                        <span className="text-xs text-ui-fg-muted">
                          {vendor.handle}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ui-fg-subtle">
                      {vendor.email}
                    </td>
                    <td className="px-4 py-3 text-ui-fg-subtle">
                      {formatDate(vendor.submitted_at || vendor.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${statusClass(
                          vendor.status
                        )}`}
                      >
                        {statusLabel(vendor.status)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-4 text-ui-fg-subtle" colSpan={4}>
                    No maker applications with this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-ui-border-base bg-ui-bg-base">
          {selectedVendor ? (
            <div className="flex flex-col gap-y-5 p-6">
              <div className="flex flex-col gap-y-2">
                <span className="text-xs font-medium text-ui-fg-muted">
                  Application detail
                </span>
                <div className="flex flex-col gap-y-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-ui-fg-base">
                      {metadata.brand_public_name || selectedVendor.name}
                    </h2>
                    <p className="text-sm text-ui-fg-subtle">
                      {metadata.legal_business_name || selectedVendor.name}
                    </p>
                  </div>
                  <span
                    className={`inline-flex w-fit rounded-full border px-2 py-1 text-xs font-medium ${statusClass(
                      selectedVendor.status
                    )}`}
                  >
                    {statusLabel(selectedVendor.status)}
                  </span>
                </div>
              </div>

              <Panel title="Business identity">
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailRow label="Legal business name" value={metadata.legal_business_name} />
                  <DetailRow label="Brand/public name" value={metadata.brand_public_name || selectedVendor.name} />
                  <DetailRow label="Business type" value={metadata.business_type} />
                  <DetailRow label="GSTIN" value={metadata.gstin} />
                  <DetailRow label="Primary contact" value={metadata.contact_name} />
                  <DetailRow label="Email" value={selectedVendor.email} />
                  <DetailRow label="Phone" value={selectedVendor.phone} />
                  <DetailRow label="Website / Instagram" value={metadata.website_or_instagram || selectedVendor.website_url} />
                </div>
              </Panel>

              <Panel title="Address">
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailRow label="Address line 1" value={address.line_1} />
                  <DetailRow label="Address line 2" value={address.line_2} />
                  <DetailRow label="City" value={address.city} />
                  <DetailRow label="State" value={address.state} />
                  <DetailRow label="PIN code" value={address.pin_code} />
                  <DetailRow label="Country" value={metadata.country_name || selectedVendor.country_code} />
                </div>
              </Panel>

              <Panel title="Maker philosophy">
                <div className="grid gap-4">
                  <DetailRow label="Product categories" value={categoriesText(metadata.product_categories)} />
                  <DetailRow label="Maker story" value={selectedVendor.description} />
                  <DetailRow label="Products they want to list" value={metadata.products_to_list} />
                  <DetailRow label="Ingredient/material philosophy" value={metadata.ingredient_philosophy} />
                  <DetailRow label="Packaging philosophy" value={metadata.packaging_philosophy} />
                  <DetailRow label="ZPS 100 fit" value={metadata.zps_fit} />
                  <DetailRow label="Applicant notes" value={metadata.notes} />
                </div>
              </Panel>

              <Panel title="Documents">
                {(selectedVendor.documents || []).length ? (
                  <div className="grid gap-3">
                    {(selectedVendor.documents || []).map((document) => (
                      <div
                        key={document.id}
                        className="rounded-md border border-ui-border-base p-3 text-sm"
                      >
                        <div className="flex justify-between gap-3">
                          <span className="font-medium text-ui-fg-base">
                            {document.title}
                          </span>
                          <span className="text-ui-fg-muted">
                            {document.status}
                          </span>
                        </div>
                        <p className="mt-1 text-ui-fg-subtle">
                          {document.file_url
                            ? documentFileLabel(document)
                            : "No uploaded file yet. Create a task if BEEMUN needs this document."}
                        </p>
                        {document.file_url && (
                          <a
                            className="mt-2 inline-flex text-sm font-medium text-ui-fg-interactive"
                            href={document.file_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View document
                          </a>
                        )}
                        {document.metadata?.applicant_note && (
                          <p className="mt-1 text-ui-fg-subtle">
                            Note: {document.metadata.applicant_note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ui-fg-subtle">
                    No document placeholders submitted.
                  </p>
                )}
              </Panel>

              <Panel title="Agreement">
                <div className="grid gap-4 md:grid-cols-3">
                  <DetailRow
                    label="Accepted"
                    value={metadata.agreement_accepted ? "Yes" : "No"}
                  />
                  <DetailRow
                    label="Accepted at"
                    value={formatDate(metadata.agreement_accepted_at)}
                  />
                  <DetailRow
                    label="Version"
                    value={metadata.agreement_version || "maker-application-v1"}
                  />
                </div>
              </Panel>

              <Panel title="Messages">
                {(selectedVendor.application_messages || []).length ? (
                  <div className="grid gap-3">
                    {(selectedVendor.application_messages || []).slice(-5).map((item) => (
                      <div key={item.id} className="rounded-md bg-ui-bg-subtle p-3">
                        <span className="text-xs font-medium text-ui-fg-muted">
                          {item.author_type}
                        </span>
                        <p className="text-sm text-ui-fg-base">{item.body}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ui-fg-subtle">No messages yet.</p>
                )}
                <form className="grid gap-2" onSubmit={submitMessage}>
                  <textarea
                    className="min-h-20 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                    value={adminMessage}
                    onChange={(event) => setAdminMessage(event.target.value)}
                    placeholder="Send message or clarification to applicant"
                  />
                  <button
                    type="submit"
                    className="w-fit rounded-md bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50"
                    disabled={saving || !adminMessage.trim()}
                  >
                    Send message
                  </button>
                </form>
              </Panel>

              <Panel title="Tasks/request changes">
                {(selectedVendor.application_tasks || []).length ? (
                  <div className="grid gap-3">
                    {(selectedVendor.application_tasks || []).map((task) => (
                      <div key={task.id} className="rounded-md border border-ui-border-base p-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="font-medium text-ui-fg-base">
                            {task.title}
                          </span>
                          <span className="text-ui-fg-muted">{task.status}</span>
                        </div>
                        <p className="mt-1 text-ui-fg-subtle">
                          {task.description || "No description."}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ui-fg-subtle">No tasks yet.</p>
                )}
                <form className="grid gap-2" onSubmit={submitTask}>
                  <input
                    className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                    value={taskTitle}
                    onChange={(event) => setTaskTitle(event.target.value)}
                    placeholder="Task title"
                  />
                  <textarea
                    className="min-h-20 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                    value={taskDescription}
                    onChange={(event) => setTaskDescription(event.target.value)}
                    placeholder="What should the applicant clarify or provide?"
                  />
                  <button
                    type="submit"
                    className="w-fit rounded-md bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50"
                    disabled={saving || !taskTitle.trim()}
                  >
                    Create task
                  </button>
                </form>
              </Panel>

              <Panel title="Review notes and decision">
                <form className="grid gap-2" onSubmit={submitNote}>
                  <textarea
                    className="min-h-20 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Internal/admin-visible review note"
                  />
                  <button
                    type="submit"
                    className="w-fit rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm font-medium text-ui-fg-base disabled:opacity-50"
                    disabled={saving || !reviewNote.trim()}
                  >
                    Add review note
                  </button>
                </form>

                <textarea
                  className="min-h-20 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm text-ui-fg-base"
                  value={rejectReason}
                  onChange={handleReasonChange}
                  placeholder="Reason for rejection"
                  rows={3}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm font-medium text-ui-fg-base disabled:opacity-50"
                    disabled={saving || selectedVendor.status === "under_review"}
                    onClick={() => transitionVendor(selectedVendor, "under-review")}
                  >
                    Mark under review
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50"
                    disabled={saving || selectedVendor.status === "approved"}
                    onClick={() => transitionVendor(selectedVendor, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={saving || selectedVendor.status === "rejected"}
                    onClick={() => transitionVendor(selectedVendor, "reject")}
                  >
                    Reject
                  </button>
                </div>
              </Panel>
            </div>
          ) : (
            <div className="p-6 text-sm text-ui-fg-subtle">
              No maker application selected.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "BEEMUN Makers",
  rank: 90,
})

export default MakerReviewPage
