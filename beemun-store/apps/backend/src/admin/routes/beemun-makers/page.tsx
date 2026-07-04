import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChangeEvent, useEffect, useMemo, useState } from "react"

type VendorStatus = "submitted" | "under_review" | "approved" | "rejected"

type VendorMetadata = {
  application_country?: string | null
  contact_name?: string | null
  website_or_instagram?: string | null
  product_categories?: string[] | string | null
  products_to_list?: string | null
  ingredient_philosophy?: string | null
  packaging_philosophy?: string | null
  zps_fit?: string | null
  notes?: string | null
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

const MakerReviewPage = () => {
  const [activeStatus, setActiveStatus] = useState<VendorStatus>("submitted")
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
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

    setMessage("")
    setError("")

    if (action === "reject" && !reason) {
      setError("Add a rejection reason before rejecting this maker.")
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/admin/beemun/vendors/${vendor.id}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          status_reason: reason,
          event_metadata: {
            source: "beemun_admin_maker_review_mvp",
          },
        }),
      })

      if (!response.ok) {
        throw new Error(await normalizeError(response))
      }

      setMessage("Maker application updated.")
      setRejectReason("")
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

  const handleReasonChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setRejectReason(event.target.value)
  }

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
              Review submitted makers before they can list products on BEEMUN.
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

      <div className="grid gap-6 px-6 pb-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
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
                          {vendor.name}
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
            <div className="flex flex-col gap-y-6 p-6">
              <div className="flex flex-col gap-y-2">
                <span className="text-xs font-medium text-ui-fg-muted">
                  Application detail
                </span>
                <div className="flex flex-col gap-y-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-ui-fg-base">
                      {selectedVendor.name}
                    </h2>
                    <p className="text-sm text-ui-fg-subtle">
                      {selectedVendor.metadata?.contact_name ||
                        "Contact name not provided"}
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

              <div className="grid gap-4 md:grid-cols-2">
                <DetailRow label="Email" value={selectedVendor.email} />
                <DetailRow label="Phone" value={selectedVendor.phone} />
                <DetailRow
                  label="Country"
                  value={
                    selectedVendor.metadata?.application_country ||
                    selectedVendor.country_code?.toUpperCase()
                  }
                />
                <DetailRow
                  label="Website / Instagram"
                  value={
                    selectedVendor.metadata?.website_or_instagram ||
                    selectedVendor.website_url
                  }
                />
                <DetailRow
                  label="Product categories"
                  value={categoriesText(
                    selectedVendor.metadata?.product_categories
                  )}
                />
                <DetailRow
                  label="ZPS fit"
                  value={selectedVendor.metadata?.zps_fit}
                />
              </div>

              <div className="grid gap-5">
                <DetailRow
                  label="Maker story"
                  value={selectedVendor.description}
                />
                <DetailRow
                  label="Products they want to list"
                  value={selectedVendor.metadata?.products_to_list}
                />
                <DetailRow
                  label="Ingredient/material philosophy"
                  value={selectedVendor.metadata?.ingredient_philosophy}
                />
                <DetailRow
                  label="Packaging philosophy"
                  value={selectedVendor.metadata?.packaging_philosophy}
                />
                <DetailRow label="Notes" value={selectedVendor.metadata?.notes} />
                <DetailRow
                  label="Submitted"
                  value={formatDate(
                    selectedVendor.submitted_at || selectedVendor.created_at
                  )}
                />
                {selectedVendor.status_reason && (
                  <DetailRow
                    label="Status reason"
                    value={selectedVendor.status_reason}
                  />
                )}
              </div>

              <div className="flex flex-col gap-y-3 border-t border-ui-border-base pt-5">
                <span className="text-sm font-medium text-ui-fg-base">
                  Review actions
                </span>
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
              </div>
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
