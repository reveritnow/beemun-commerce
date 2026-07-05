import { defineRouteConfig } from "@medusajs/admin-sdk"
import { FormEvent, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"

type VendorStatus = "submitted" | "under_review" | "approved" | "rejected"
type WorkspaceTab =
  | "overview"
  | "application"
  | "documents"
  | "messages"
  | "tasks"
  | "timeline"
  | "notes"
  | "history"

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

const workspaceTabs: Array<{ key: WorkspaceTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "application", label: "Application" },
  { key: "documents", label: "Documents" },
  { key: "messages", label: "Messages" },
  { key: "tasks", label: "Tasks" },
  { key: "timeline", label: "Timeline" },
  { key: "notes", label: "Review Notes" },
  { key: "history", label: "History" },
]

const statusLabels: Record<VendorStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
}

const statusClasses: Record<VendorStatus, string> = {
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  under_review: "border-orange-200 bg-orange-50 text-orange-700",
  approved: "border-green-200 bg-green-50 text-green-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
}

const documentStatusClasses: Record<string, string> = {
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  under_review: "border-orange-200 bg-orange-50 text-orange-700",
  approved: "border-green-200 bg-green-50 text-green-700",
  needs_changes: "border-amber-200 bg-amber-50 text-amber-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  draft: "border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted",
}

const statusLabel = (status: string) =>
  statusLabels[status as VendorStatus] || status.replace(/_/g, " ")

const statusClass = (status: string) =>
  statusClasses[status as VendorStatus] ||
  "border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle"

const documentStatusClass = (status: string) =>
  documentStatusClasses[status] ||
  "border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle"

const formatDate = (value?: string | null) => {
  if (!value) return "Not recorded"

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

const formatSize = (value?: any) => {
  const raw = typeof value === "object" && value ? value.value || value.numeric : value
  const size = Number(raw || 0)
  if (!Number.isFinite(size) || size <= 0) return "Size not recorded"
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

const categoriesText = (value?: string[] | string | null) => {
  if (Array.isArray(value)) return value.join(", ")
  return value || "Not provided"
}

const documentTypeLabel = (value?: string | null) =>
  String(value || "application")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())

const documentFile = (document: Record<string, any>) => document.file || null

const documentFileLabel = (document: Record<string, any>) =>
  documentFile(document)?.original_filename ||
  document.metadata?.original_filename ||
  document.metadata?.file_name ||
  (document.file_url ? "Uploaded document" : "No file uploaded")

const documentFileSize = (document: Record<string, any>) =>
  documentFile(document)?.file_size || document.metadata?.file_size

const documentMime = (document: Record<string, any>) =>
  documentFile(document)?.mime_type || document.metadata?.mime_type || "File"

const hasStoredFile = (document: Record<string, any>) =>
  Boolean(documentFile(document) || document.metadata?.storage_status === "stored")

const completionFor = (vendor?: Vendor | null) => {
  if (!vendor) return 0
  const metadata = vendor.metadata || {}
  const documents = vendor.documents || []
  const requiredDocuments = documents.filter((document) => document.metadata?.required)
  const uploadedRequired = requiredDocuments.filter(hasStoredFile)
  const checks = [
    metadata.legal_business_name || vendor.name,
    metadata.contact_name,
    vendor.email,
    metadata.address?.city,
    metadata.address?.state,
    metadata.products_to_list,
    metadata.ingredient_philosophy,
    metadata.packaging_philosophy,
    metadata.agreement_accepted,
    requiredDocuments.length ? uploadedRequired.length === requiredDocuments.length : true,
  ]

  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

const normalizeError = async (response: Response) => {
  const data = await response.json().catch(() => null)
  return data?.message || data?.error || "The maker application could not be updated."
}

const Badge = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <span className={`inline-flex w-fit items-center rounded-full border px-2 py-1 text-xs font-medium capitalize ${className}`}>
    {children}
  </span>
)

const DetailRow = ({ label, value }: { label: string; value?: ReactNode }) => (
  <div className="flex flex-col gap-y-1">
    <dt className="text-xs font-medium text-ui-fg-muted">{label}</dt>
    <dd className="whitespace-pre-wrap text-sm text-ui-fg-base">
      {value || "Not provided"}
    </dd>
  </div>
)

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <details className="rounded-lg border border-ui-border-base bg-ui-bg-base p-4" open>
    <summary className="cursor-pointer text-base font-semibold text-ui-fg-base">
      {title}
    </summary>
    <div className="mt-4 grid gap-4">{children}</div>
  </details>
)

const MakerReviewPage = () => {
  const [activeStatus, setActiveStatus] = useState<VendorStatus>("submitted")
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>("overview")
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [reviewNote, setReviewNote] = useState("")
  const [adminMessage, setAdminMessage] = useState("")
  const [taskTitle, setTaskTitle] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [documentNote, setDocumentNote] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.id === selectedId) || vendors[0],
    [selectedId, vendors]
  )
  const metadata = selectedVendor?.metadata || {}
  const address = metadata.address || {}
  const documents = selectedVendor?.documents || []
  const tasks = selectedVendor?.application_tasks || []
  const messages = selectedVendor?.application_messages || []
  const reviewEvents = selectedVendor?.review_events || []
  const openTasks = tasks.filter((task) => task.status !== "completed")
  const storedDocuments = documents.filter(hasStoredFile)
  const missingRequiredDocuments = documents.filter(
    (document) => document.metadata?.required && !hasStoredFile(document)
  )
  const latestActivity =
    [...reviewEvents, ...messages, ...tasks, ...documents].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || b.submitted_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || a.submitted_at || 0).getTime()
    )[0] || null

  const loadVendors = async (status: VendorStatus) => {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/admin/beemun/vendors?status=${status}`, {
        credentials: "include",
      })

      if (!response.ok) throw new Error(await normalizeError(response))

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
    payload: Record<string, any>,
    success = "Maker application updated."
  ) => {
    setSaving(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch(`/admin/beemun/vendors/${vendor.id}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error(await normalizeError(response))

      setMessage(success)
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
      setActiveWorkspaceTab("notes")
      return
    }

    await postAction(
      vendor,
      action,
      {
        reason,
        status_reason: reason,
        event_metadata: { source: "beemun_admin_maker_review" },
      },
      action === "approve"
        ? "Maker approved."
        : action === "reject"
        ? "Maker rejected."
        : "Maker moved under review."
    )
    setRejectReason("")
  }

  const submitNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedVendor || !reviewNote.trim()) return
    await postAction(selectedVendor, "note", { note: reviewNote.trim() }, "Private review note saved.")
    setReviewNote("")
  }

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedVendor || !adminMessage.trim()) return
    await postAction(selectedVendor, "message", { text: adminMessage.trim() }, "Message sent to maker.")
    setAdminMessage("")
  }

  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedVendor || !taskTitle.trim()) return
    await postAction(
      selectedVendor,
      "task",
      {
        title: taskTitle.trim(),
        description: taskDescription.trim() || null,
        message: taskDescription.trim()
          ? `BEEMUN requested clarification: ${taskTitle.trim()}`
          : null,
      },
      "Task sent to maker."
    )
    setTaskTitle("")
    setTaskDescription("")
  }

  const actOnDocument = async (
    document: Record<string, any>,
    action: "verify" | "reject" | "request_replacement"
  ) => {
    if (!selectedVendor) return
    await postAction(
      selectedVendor,
      `documents/${document.id}`,
      {
        action,
        note: documentNote[document.id] || "",
      },
      action === "verify"
        ? "Document marked verified."
        : action === "reject"
        ? "Document rejected."
        : "Replacement requested from maker."
    )
  }

  const renderOverview = () => (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 lg:col-span-2">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ui-fg-muted">
              Application status
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-ui-fg-base">
              {metadata.brand_public_name || selectedVendor?.name}
            </h2>
            <p className="mt-1 text-sm text-ui-fg-subtle">
              {metadata.legal_business_name || selectedVendor?.name} / {selectedVendor?.email}
            </p>
          </div>
          {selectedVendor && (
            <Badge className={statusClass(selectedVendor.status)}>
              {statusLabel(selectedVendor.status)}
            </Badge>
          )}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg bg-ui-bg-subtle p-4">
            <span className="text-xs text-ui-fg-muted">Completion</span>
            <strong className="mt-1 block text-xl text-ui-fg-base">
              {completionFor(selectedVendor)}%
            </strong>
          </div>
          <div className="rounded-lg bg-ui-bg-subtle p-4">
            <span className="text-xs text-ui-fg-muted">Documents</span>
            <strong className="mt-1 block text-xl text-ui-fg-base">
              {storedDocuments.length}/{documents.length}
            </strong>
          </div>
          <div className="rounded-lg bg-ui-bg-subtle p-4">
            <span className="text-xs text-ui-fg-muted">Open tasks</span>
            <strong className="mt-1 block text-xl text-ui-fg-base">
              {openTasks.length}
            </strong>
          </div>
          <div className="rounded-lg bg-ui-bg-subtle p-4">
            <span className="text-xs text-ui-fg-muted">Messages</span>
            <strong className="mt-1 block text-xl text-ui-fg-base">
              {messages.length}
            </strong>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-ui-fg-muted">
          Quick actions
        </p>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm font-medium text-ui-fg-base disabled:opacity-50"
            disabled={saving || selectedVendor?.status === "under_review"}
            onClick={() => selectedVendor && transitionVendor(selectedVendor, "under-review")}
          >
            Mark under review
          </button>
          <button
            type="button"
            className="rounded-md bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50"
            disabled={saving || selectedVendor?.status === "approved"}
            onClick={() => selectedVendor && transitionVendor(selectedVendor, "approve")}
          >
            Approve
          </button>
          <button
            type="button"
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={saving || selectedVendor?.status === "rejected"}
            onClick={() => selectedVendor && transitionVendor(selectedVendor, "reject")}
          >
            Reject
          </button>
        </div>
        <textarea
          className="mt-3 min-h-20 w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
          value={rejectReason}
          onChange={(event) => setRejectReason(event.target.value)}
          placeholder="Reason for rejection, if needed"
        />
      </div>

      <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 lg:col-span-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ui-fg-muted">
          Latest activity
        </p>
        <p className="mt-2 text-sm text-ui-fg-base">
          {latestActivity
            ? `${latestActivity.reason || latestActivity.title || latestActivity.body || latestActivity.status || "Activity"} - ${formatDate(latestActivity.updated_at || latestActivity.created_at)}`
            : "No activity has been recorded yet."}
        </p>
        {missingRequiredDocuments.length > 0 && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {missingRequiredDocuments.length} required document(s) still need an uploaded file.
          </p>
        )}
      </div>
    </div>
  )

  const renderApplication = () => (
    <div className="grid gap-4">
      <Section title="Business">
        <div className="grid gap-4 md:grid-cols-2">
          <DetailRow label="Legal business name" value={metadata.legal_business_name} />
          <DetailRow label="Brand/public name" value={metadata.brand_public_name || selectedVendor?.name} />
          <DetailRow label="Business type" value={metadata.business_type} />
          <DetailRow label="GSTIN" value={metadata.gstin} />
          <DetailRow label="Website / Instagram" value={metadata.website_or_instagram || selectedVendor?.website_url} />
          <DetailRow label="Country" value={metadata.country_name || selectedVendor?.country_code} />
        </div>
      </Section>
      <Section title="Owner">
        <div className="grid gap-4 md:grid-cols-2">
          <DetailRow label="Primary contact" value={metadata.contact_name} />
          <DetailRow label="Email" value={selectedVendor?.email} />
          <DetailRow label="Phone" value={selectedVendor?.phone} />
          <DetailRow label="Submitted" value={formatDate(selectedVendor?.submitted_at || selectedVendor?.created_at)} />
        </div>
      </Section>
      <Section title="Address">
        <div className="grid gap-4 md:grid-cols-2">
          <DetailRow label="Address line 1" value={address.line_1} />
          <DetailRow label="Address line 2" value={address.line_2} />
          <DetailRow label="City" value={address.city} />
          <DetailRow label="State" value={address.state} />
          <DetailRow label="PIN code" value={address.pin_code} />
          <DetailRow label="Country" value={metadata.country_name || "India"} />
        </div>
      </Section>
      <Section title="Policies and ZPS fit">
        <div className="grid gap-4">
          <DetailRow label="Product categories" value={categoriesText(metadata.product_categories)} />
          <DetailRow label="Maker story" value={selectedVendor?.description} />
          <DetailRow label="Products they want to list" value={metadata.products_to_list} />
          <DetailRow label="Ingredient/material philosophy" value={metadata.ingredient_philosophy} />
          <DetailRow label="Packaging philosophy" value={metadata.packaging_philosophy} />
          <DetailRow label="ZPS 100 fit" value={metadata.zps_fit} />
          <DetailRow label="Applicant notes" value={metadata.notes} />
        </div>
      </Section>
      <Section title="Agreement">
        <div className="grid gap-4 md:grid-cols-3">
          <DetailRow label="Accepted" value={metadata.agreement_accepted ? "Yes" : "No"} />
          <DetailRow label="Accepted at" value={formatDate(metadata.agreement_accepted_at)} />
          <DetailRow label="Version" value={metadata.agreement_version || "maker-application-v1"} />
        </div>
      </Section>
    </div>
  )

  const renderDocuments = () => (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base">
      <div className="border-b border-ui-border-base px-5 py-4">
        <h3 className="text-lg font-semibold text-ui-fg-base">Document review</h3>
        <p className="text-sm text-ui-fg-subtle">
          Verify, reject, or request replacement for uploaded maker documents.
        </p>
      </div>
      {documents.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead className="bg-ui-bg-subtle text-xs uppercase tracking-wide text-ui-fg-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="border-t border-ui-border-base align-top">
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <span className="font-medium text-ui-fg-base">{document.title}</span>
                      <span className="text-xs text-ui-fg-muted">
                        {documentTypeLabel(document.document_type)}
                      </span>
                      <Badge
                        className={
                          document.metadata?.required
                            ? "border-orange-200 bg-orange-50 text-orange-700"
                            : "border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle"
                        }
                      >
                        {document.metadata?.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {hasStoredFile(document) ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-ui-fg-base">
                          {documentFileLabel(document)}
                        </span>
                        <span className="text-xs text-ui-fg-muted">
                          {documentMime(document)} / {formatSize(documentFileSize(document))}
                        </span>
                        {document.metadata?.applicant_note && (
                          <span className="text-xs text-ui-fg-subtle">
                            Note: {document.metadata.applicant_note}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-ui-fg-subtle">No file uploaded</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-ui-fg-subtle">
                    {formatDate(documentFile(document)?.created_at || document.updated_at)}
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={documentStatusClass(document.status)}>
                      {document.status?.replace(/_/g, " ") || "missing"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex min-w-[260px] flex-col gap-2">
                      {hasStoredFile(document) ? (
                        <div className="flex flex-wrap gap-2">
                          <a
                            className="rounded-md border border-ui-border-base px-3 py-2 text-xs font-medium text-ui-fg-base"
                            href={`/admin/beemun/vendors/${selectedVendor?.id}/documents/${document.id}/file`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View
                          </a>
                          <a
                            className="rounded-md border border-ui-border-base px-3 py-2 text-xs font-medium text-ui-fg-base"
                            href={`/admin/beemun/vendors/${selectedVendor?.id}/documents/${document.id}/file?download=1`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Download
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-ui-fg-muted">
                          Request upload through a replacement task.
                        </span>
                      )}
                      <textarea
                        className="min-h-16 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-xs"
                        value={documentNote[document.id] || ""}
                        onChange={(event) =>
                          setDocumentNote((current) => ({
                            ...current,
                            [document.id]: event.target.value,
                          }))
                        }
                        placeholder="Optional note for this document"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md bg-green-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          disabled={saving || !hasStoredFile(document)}
                          onClick={() => actOnDocument(document, "verify")}
                        >
                          Mark verified
                        </button>
                        <button
                          type="button"
                          className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                          disabled={saving || !hasStoredFile(document)}
                          onClick={() => actOnDocument(document, "reject")}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-ui-border-base px-3 py-2 text-xs font-medium text-ui-fg-base disabled:opacity-50"
                          disabled={saving}
                          onClick={() => actOnDocument(document, "request_replacement")}
                        >
                          Request replacement
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-5 text-sm text-ui-fg-subtle">
          No document records exist for this application yet.
        </p>
      )}
    </div>
  )

  const renderMessages = () => (
    <div className="flex min-h-[560px] flex-col rounded-xl border border-ui-border-base bg-ui-bg-base">
      <div className="border-b border-ui-border-base px-5 py-4">
        <h3 className="text-lg font-semibold text-ui-fg-base">Conversation</h3>
        <p className="text-sm text-ui-fg-subtle">
          Applicant-visible messages only. Private notes stay in Review Notes.
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length ? (
          messages.map((item) => {
            const isAdmin = item.author_type === "admin"
            return (
              <div
                key={item.id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                    isAdmin
                      ? "bg-ui-bg-interactive text-ui-fg-on-color"
                      : "bg-ui-bg-subtle text-ui-fg-base"
                  }`}
                >
                  <div className="mb-1 text-xs opacity-80">
                    {isAdmin ? "BEEMUN Review" : "Maker"} / {formatDate(item.created_at)}
                  </div>
                  <p className="whitespace-pre-wrap">{item.body}</p>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-lg bg-ui-bg-subtle p-4 text-sm text-ui-fg-subtle">
            No messages yet. Send a clear request if the maker needs to clarify anything.
          </div>
        )}
      </div>
      <form className="sticky bottom-0 grid gap-2 border-t border-ui-border-base bg-ui-bg-base p-4" onSubmit={submitMessage}>
        <textarea
          className="min-h-20 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
          value={adminMessage}
          onChange={(event) => setAdminMessage(event.target.value)}
          placeholder="Send a message to the maker"
        />
        <button
          type="submit"
          className="w-fit rounded-md bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50"
          disabled={saving || !adminMessage.trim()}
        >
          {saving ? "Sending..." : "Send message"}
        </button>
      </form>
    </div>
  )

  const renderTasks = () => (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
        <h3 className="text-lg font-semibold text-ui-fg-base">Applicant tasks</h3>
        <div className="mt-4 grid gap-3">
          {tasks.length ? (
            tasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-ui-border-base p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Badge
                      className={
                        task.status === "completed"
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-orange-200 bg-orange-50 text-orange-700"
                      }
                    >
                      {task.status === "completed" ? "Completed" : "Requested"}
                    </Badge>
                    <h4 className="mt-2 font-semibold text-ui-fg-base">{task.title}</h4>
                    <p className="mt-1 text-sm text-ui-fg-subtle">
                      {task.description || "No extra detail provided."}
                    </p>
                  </div>
                  <span className="text-xs text-ui-fg-muted">
                    {formatDate(task.created_at)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-ui-bg-subtle p-4 text-sm text-ui-fg-subtle">
              No tasks have been requested.
            </p>
          )}
        </div>
      </div>
      <form className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5" onSubmit={submitTask}>
        <h3 className="text-lg font-semibold text-ui-fg-base">Create task</h3>
        <input
          className="mt-4 w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
          value={taskTitle}
          onChange={(event) => setTaskTitle(event.target.value)}
          placeholder="Task title"
        />
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
          value={taskDescription}
          onChange={(event) => setTaskDescription(event.target.value)}
          placeholder="What should the maker clarify or provide?"
        />
        <button
          type="submit"
          className="mt-3 rounded-md bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color disabled:opacity-50"
          disabled={saving || !taskTitle.trim()}
        >
          {saving ? "Creating..." : "Create task"}
        </button>
      </form>
    </div>
  )

  const renderTimeline = () => {
    const events = [
      ...reviewEvents.map((event) => ({
        id: event.id,
        title: event.reason || `Status: ${event.to_status}`,
        body: event.notes,
        date: event.created_at,
        source: "Review",
      })),
      ...documents.map((document) => ({
        id: `doc-${document.id}`,
        title: `${document.title} ${hasStoredFile(document) ? "uploaded" : "recorded"}`,
        body: document.status?.replace(/_/g, " "),
        date: document.updated_at || document.created_at,
        source: "Document",
      })),
      ...tasks.map((task) => ({
        id: `task-${task.id}`,
        title: task.title,
        body: task.status,
        date: task.updated_at || task.created_at,
        source: "Task",
      })),
      ...messages.map((item) => ({
        id: `msg-${item.id}`,
        title: item.author_type === "admin" ? "BEEMUN message" : "Maker reply",
        body: item.body,
        date: item.created_at,
        source: "Message",
      })),
    ].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())

    return (
      <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
        <h3 className="text-lg font-semibold text-ui-fg-base">Review timeline</h3>
        <div className="mt-5 grid gap-4">
          {events.length ? (
            events.map((event) => (
              <div key={event.id} className="grid gap-3 border-l-2 border-ui-border-base pl-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                  <div>
                    <Badge className="border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle">
                      {event.source}
                    </Badge>
                    <h4 className="mt-2 font-semibold text-ui-fg-base">{event.title}</h4>
                    {event.body && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ui-fg-subtle">
                        {event.body}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-ui-fg-muted">{formatDate(event.date)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-ui-bg-subtle p-4 text-sm text-ui-fg-subtle">
              No timeline events yet.
            </p>
          )}
        </div>
      </div>
    )
  }

  const renderNotes = () => (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
        <h3 className="text-lg font-semibold text-ui-fg-base">Private review notes</h3>
        <div className="mt-4 grid gap-3">
          {(metadata.review_notes || []).length ? (
            (metadata.review_notes || []).map((note) => (
              <div key={note.id || note.created_at} className="rounded-lg bg-ui-bg-subtle p-4">
                <p className="whitespace-pre-wrap text-sm text-ui-fg-base">{note.note}</p>
                <p className="mt-2 text-xs text-ui-fg-muted">{formatDate(note.created_at)}</p>
              </div>
            ))
          ) : (
            <p className="rounded-lg bg-ui-bg-subtle p-4 text-sm text-ui-fg-subtle">
              No private notes yet.
            </p>
          )}
        </div>
      </div>
      <form className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5" onSubmit={submitNote}>
        <h3 className="text-lg font-semibold text-ui-fg-base">Add note</h3>
        <textarea
          className="mt-4 min-h-32 w-full rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm"
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          placeholder="Internal note. The maker will not see this."
        />
        <button
          type="submit"
          className="mt-3 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-2 text-sm font-medium text-ui-fg-base disabled:opacity-50"
          disabled={saving || !reviewNote.trim()}
        >
          Save private note
        </button>
      </form>
    </div>
  )

  const renderHistory = () => (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
      <h3 className="text-lg font-semibold text-ui-fg-base">Audit history</h3>
      <div className="mt-4 grid gap-3">
        {reviewEvents.length ? (
          reviewEvents.map((event) => (
            <div key={event.id} className="rounded-lg border border-ui-border-base p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-medium text-ui-fg-base">
                    {event.reason || `${event.from_status || "new"} to ${event.to_status}`}
                  </p>
                  <p className="mt-1 text-sm text-ui-fg-subtle">
                    {event.notes || "No notes recorded."}
                  </p>
                </div>
                <span className="text-xs text-ui-fg-muted">
                  {event.actor_type} / {formatDate(event.created_at)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-ui-bg-subtle p-4 text-sm text-ui-fg-subtle">
            No audit events yet.
          </p>
        )}
      </div>
    </div>
  )

  const renderWorkspace = () => {
    if (!selectedVendor) {
      return (
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-6 text-sm text-ui-fg-subtle">
          No maker application selected.
        </div>
      )
    }

    if (activeWorkspaceTab === "overview") return renderOverview()
    if (activeWorkspaceTab === "application") return renderApplication()
    if (activeWorkspaceTab === "documents") return renderDocuments()
    if (activeWorkspaceTab === "messages") return renderMessages()
    if (activeWorkspaceTab === "tasks") return renderTasks()
    if (activeWorkspaceTab === "timeline") return renderTimeline()
    if (activeWorkspaceTab === "notes") return renderNotes()
    return renderHistory()
  }

  return (
    <div className="flex min-h-screen flex-col bg-ui-bg-subtle">
      <div className="sticky top-0 z-10 border-b border-ui-border-base bg-ui-bg-base px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ui-fg-muted">
              BEEMUN Marketplace
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-ui-fg-base">
              Maker review workspace
            </h1>
            <p className="text-sm text-ui-fg-subtle">
              Review maker applications, documents, tasks, messages, and private decisions.
            </p>
          </div>
          {selectedVendor && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusClass(selectedVendor.status)}>
                {statusLabel(selectedVendor.status)}
              </Badge>
              <span className="text-sm text-ui-fg-muted">
                {metadata.brand_public_name || selectedVendor.name}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-6 py-4">
        {reviewStatuses.map((status) => (
          <button
            key={status}
            type="button"
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              activeStatus === status
                ? "border-ui-border-interactive bg-ui-bg-interactive text-ui-fg-on-color"
                : "border-ui-border-base bg-ui-bg-base text-ui-fg-base"
            }`}
            onClick={() => {
              setActiveStatus(status)
              setActiveWorkspaceTab("overview")
            }}
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

      <div className="grid gap-6 px-6 pb-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base">
          <div className="border-b border-ui-border-base px-4 py-3">
            <h2 className="font-semibold text-ui-fg-base">Applications</h2>
            <p className="text-xs text-ui-fg-muted">
              {loading ? "Loading..." : `${vendors.length} ${statusLabels[activeStatus].toLowerCase()}`}
            </p>
          </div>
          <div className="max-h-[calc(100vh-230px)] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-ui-fg-subtle">Loading maker applications...</p>
            ) : vendors.length ? (
              vendors.map((vendor) => (
                <button
                  key={vendor.id}
                  type="button"
                  className={`flex w-full flex-col gap-2 border-b border-ui-border-base px-4 py-4 text-left last:border-b-0 ${
                    selectedVendor?.id === vendor.id ? "bg-ui-bg-subtle" : "bg-ui-bg-base"
                  }`}
                  onClick={() => {
                    setSelectedId(vendor.id)
                    setActiveWorkspaceTab("overview")
                  }}
                >
                  <span className="font-medium text-ui-fg-base">
                    {vendor.metadata?.brand_public_name || vendor.name}
                  </span>
                  <span className="text-xs text-ui-fg-muted">{vendor.email}</span>
                  <span className="text-xs text-ui-fg-subtle">
                    Submitted {formatDate(vendor.submitted_at || vendor.created_at)}
                  </span>
                </button>
              ))
            ) : (
              <p className="p-4 text-sm text-ui-fg-subtle">
                No maker applications with this status.
              </p>
            )}
          </div>
        </aside>

        <main className="min-w-0">
          {selectedVendor && (
            <nav
              className="mb-4 flex gap-2 overflow-x-auto rounded-xl border border-ui-border-base bg-ui-bg-base p-2"
              aria-label="Maker review workspace"
            >
              {workspaceTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                    activeWorkspaceTab === tab.key
                      ? "bg-ui-bg-interactive text-ui-fg-on-color"
                      : "text-ui-fg-subtle hover:bg-ui-bg-subtle hover:text-ui-fg-base"
                  }`}
                  onClick={() => setActiveWorkspaceTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          )}

          {renderWorkspace()}
        </main>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "BEEMUN Makers",
  rank: 90,
})

export default MakerReviewPage
