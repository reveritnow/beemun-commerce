import { defineRouteConfig } from "@medusajs/admin-sdk"
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react"

type ReviewStatus =
  | "draft"
  | "submitted"
  | "automatic_checks"
  | "pending_zps_review"
  | "needs_changes"
  | "approved"
  | "published"
  | "hidden"
  | "rejected"
  | "archived"

type WorkspaceTab =
  | "overview"
  | "product"
  | "media"
  | "variants"
  | "review"
  | "messages"
  | "timeline"
  | "history"

type ReviewItem = {
  product_review: Record<string, any>
  vendor_product: Record<string, any> | null
  vendor: Record<string, any> | null
  product: Record<string, any> | null
  events: Array<Record<string, any>>
  quality_signals: Array<Record<string, any>>
}

const statusFilters: Array<{ key: string; label: string }> = [
  { key: "submitted,automatic_checks,pending_zps_review,needs_changes", label: "Needs Review" },
  { key: "approved", label: "Approved" },
  { key: "published", label: "Published" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
]

const workspaceTabs: Array<{ key: WorkspaceTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "product", label: "Product Information" },
  { key: "media", label: "Media" },
  { key: "variants", label: "Variants & Pricing" },
  { key: "review", label: "BEEMUN Review" },
  { key: "messages", label: "Messages" },
  { key: "timeline", label: "Timeline" },
  { key: "history", label: "History" },
]

const statusClasses: Record<string, string> = {
  draft: "border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted",
  submitted: "border-blue-200 bg-blue-50 text-blue-700",
  automatic_checks: "border-purple-200 bg-purple-50 text-purple-700",
  pending_zps_review: "border-orange-200 bg-orange-50 text-orange-700",
  needs_changes: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-green-200 bg-green-50 text-green-700",
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  hidden: "border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle",
  rejected: "border-red-200 bg-red-50 text-red-700",
  archived: "border-ui-border-base bg-ui-bg-subtle text-ui-fg-muted",
}

const statusLabel = (status?: string | null) =>
  String(status || "unknown").replace(/_/g, " ")

const statusClass = (status?: string | null) =>
  statusClasses[String(status || "")] ||
  "border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle"

const formatDate = (value?: string | null) => {
  if (!value) return "Not recorded"

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

const readMetadata = (item?: ReviewItem | null) =>
  item?.product_review?.metadata || {}

const beemunInfo = (item?: ReviewItem | null) =>
  readMetadata(item).beemun_product_information || {}

const taxonomy = (item?: ReviewItem | null) => readMetadata(item).taxonomy || {}

const basicInfo = (item?: ReviewItem | null) =>
  readMetadata(item).basic_information || {}

const imagesFor = (product?: Record<string, any> | null) => {
  const images = Array.isArray(product?.images) ? product?.images : []
  const urls = images.map((image: Record<string, any>) => image.url).filter(Boolean)

  if (product?.thumbnail && !urls.includes(product.thumbnail)) {
    return [product.thumbnail, ...urls]
  }

  return urls
}

const pricesFor = (variant: Record<string, any>) => {
  const prices = variant.prices || variant.calculated_price || []
  if (Array.isArray(prices)) {
    return prices
      .map((price) => `${price.currency_code || ""} ${price.amount ?? ""}`.trim())
      .filter(Boolean)
      .join(", ")
  }

  if (variant.calculated_price?.calculated_amount) {
    return `${variant.calculated_price.currency_code || ""} ${variant.calculated_price.calculated_amount}`.trim()
  }

  return "Price not recorded"
}

const isMissing = (value: ReactNode) =>
  value === null ||
  value === undefined ||
  value === "" ||
  value === "Not recorded" ||
  value === "Not provided"

const DetailRow = ({ label, value }: { label: string; value?: ReactNode }) => (
  <div
    className={`rounded-lg border p-3 ${
      isMissing(value)
        ? "border-amber-200 bg-amber-50"
        : "border-ui-border-base bg-ui-bg-subtle"
    }`}
  >
    <dt className="text-xs font-medium text-ui-fg-muted">{label}</dt>
    <dd className="mt-1 text-sm text-ui-fg-base">{value || "Not provided"}</dd>
  </div>
)

const Card = ({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow?: string
  children: ReactNode
}) => (
  <section className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 shadow-elevation-card-rest">
    {eyebrow && <p className="text-xs font-semibold uppercase text-ui-fg-muted">{eyebrow}</p>}
    <h2 className="mt-1 text-xl font-semibold text-ui-fg-base">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
)

const normalizeError = async (response: Response) => {
  const data = await response.json().catch(() => null)
  return data?.message || `BEEMUN product review action failed with status ${response.status}.`
}

const latestActivity = (item?: ReviewItem | null) => {
  const events = item?.events || []
  const latest = events[events.length - 1]
  if (!latest) return "No activity recorded"
  return `${statusLabel(latest.to_status)} - ${formatDate(latest.created_at)}`
}

const riskFlagsFor = (item?: ReviewItem | null) => {
  const info = beemunInfo(item)
  const product = item?.product
  const images = imagesFor(product)
  const variants = Array.isArray(product?.variants) ? product?.variants : []
  const flags: string[] = []

  if (!info.ingredients && !info.materials) flags.push("Missing ingredients/materials")
  if (!info.packaging) flags.push("Missing packaging disclosure")
  if (!images.length) flags.push("No media")
  if (!variants.length) flags.push("No variants")
  if (item?.product_review?.status === "needs_changes") flags.push("Changes requested")

  return flags
}

function ProductReviewWorkspace() {
  const [items, setItems] = useState<ReviewItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState(statusFilters[0].key)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const selected = useMemo(
    () => items.find((item) => item.product_review.id === selectedId) || items[0] || null,
    [items, selectedId]
  )

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/admin/beemun/products?status=${activeFilter}`, {
        credentials: "include",
      })
      if (!response.ok) throw new Error(await normalizeError(response))
      const data = await response.json()
      const nextItems = data.product_reviews || []
      setItems(nextItems)
      setSelectedId((current) =>
        current && nextItems.some((item: ReviewItem) => item.product_review.id === current)
          ? current
          : nextItems[0]?.product_review?.id || null
      )
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load product reviews.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [activeFilter])

  const runAction = async (path: string, body: Record<string, any> = {}) => {
    if (!selected) return
    setSaving(true)
    setMessage("")
    setError("")
    try {
      const response = await fetch(
        `/admin/beemun/products/${selected.product_review.product_id}/${path}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      if (!response.ok) throw new Error(await normalizeError(response))
      setMessage("Product review updated.")
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Product review action failed.")
    } finally {
      setSaving(false)
    }
  }

  const requestChanges = () => {
    const reason = window.prompt("What changes should the maker make before BEEMUN can continue review?")
    if (!reason?.trim()) return
    runAction("request-changes", { change_request: reason, reason })
  }

  const reject = () => {
    const reason = window.prompt("Rejection reason required")
    if (!reason?.trim()) return
    runAction("reject", { rejection_reason: reason, reason })
  }

  const approve = () => {
    if (!window.confirm("Approve this product for BEEMUN ZPS review? This does not publish it.")) return
    runAction("approve")
  }

  const publish = () => {
    if (!window.confirm("Publish this approved product publicly? This requires the product to already be approved.")) return
    runAction("publish")
  }

  const product = selected?.product
  const review = selected?.product_review
  const metadata = readMetadata(selected)
  const info = beemunInfo(selected)
  const variants = Array.isArray(product?.variants) ? product?.variants : []
  const images = imagesFor(product)
  const riskFlags = riskFlagsFor(selected)

  const renderOverview = () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Review summary" eyebrow="Overview">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Current review status" value={statusLabel(review?.status)} />
          <DetailRow label="Maker" value={selected?.vendor?.name} />
          <DetailRow label="Brand" value={basicInfo(selected).brand || product?.subtitle} />
          <DetailRow label="Category" value={product?.categories?.[0]?.name || taxonomy(selected).category_ids?.join(", ")} />
          <DetailRow label="Variants" value={variants.length || "Not recorded"} />
          <DetailRow label="Media count" value={images.length || "Not recorded"} />
        </div>
      </Card>
      <Card title="Risk flags" eyebrow="Review focus">
        {riskFlags.length ? (
          <ul className="grid gap-2">
            {riskFlags.map((flag) => (
              <li className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" key={flag}>
                {flag}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ui-fg-subtle">No obvious missing review inputs.</p>
        )}
      </Card>
      <Card title="Latest activity" eyebrow="Timeline">
        <p className="text-sm text-ui-fg-base">{latestActivity(selected)}</p>
      </Card>
      <Card title="Quick actions" eyebrow="Actions">
        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-ui-border-base px-3 py-2 text-sm font-medium" disabled={saving} onClick={() => runAction("automatic-checks")}>Run automatic checks</button>
          <button className="rounded-lg border border-ui-border-base px-3 py-2 text-sm font-medium" disabled={saving} onClick={() => runAction("pending-zps-review")}>Move to ZPS review</button>
          <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800" disabled={saving} onClick={requestChanges}>Request changes</button>
          <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" disabled={saving} onClick={reject}>Reject</button>
          <button className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700" disabled={saving} onClick={approve}>Approve</button>
          <button className="rounded-lg bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color" disabled={saving || review?.status !== "approved"} onClick={publish}>Publish</button>
        </div>
      </Card>
    </div>
  )

  const renderProduct = () => (
    <div className="grid gap-4">
      <Card title="Core Medusa product data" eyebrow="Product Information">
        <div className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Title" value={product?.title} />
          <DetailRow label="Handle" value={product?.handle} />
          <DetailRow label="Short description" value={basicInfo(selected).short_description} />
          <DetailRow label="Long description" value={product?.description || basicInfo(selected).long_description} />
          <DetailRow label="Collection" value={product?.collection?.title || taxonomy(selected).collection_id} />
          <DetailRow label="Product type" value={taxonomy(selected).product_type} />
          <DetailRow label="Tags" value={Array.isArray(taxonomy(selected).tags) ? taxonomy(selected).tags.join(", ") : taxonomy(selected).tags} />
          <DetailRow label="Medusa status" value={product?.status} />
        </div>
      </Card>
    </div>
  )

  const renderMedia = () => (
    <div className="grid gap-4">
      {!images.length && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Missing media. Request replacement or clarification before approval.
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {images.map((url, index) => (
          <article className="overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base" key={`${url}-${index}`}>
            <img className="aspect-square w-full object-cover" src={url} alt={`Product media ${index + 1}`} />
            <div className="p-3">
              <p className="text-sm font-medium text-ui-fg-base">Image {index + 1}</p>
              <a className="text-sm text-ui-fg-interactive" href={url} target="_blank" rel="noreferrer">View full image</a>
            </div>
          </article>
        ))}
      </div>
      <button className="w-fit rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800" onClick={requestChanges} type="button">
        Request media replacement
      </button>
    </div>
  )

  const renderVariants = () => (
    <Card title="Medusa variants and pricing" eyebrow="Variants & Pricing">
      {variants.length ? (
        <div className="overflow-hidden rounded-xl border border-ui-border-base">
          <table className="w-full text-left text-sm">
            <thead className="bg-ui-bg-subtle text-ui-fg-muted">
              <tr>
                <th className="px-3 py-2">Variant</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Weight</th>
                <th className="px-3 py-2">Dimensions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr className="border-t border-ui-border-base" key={variant.id || variant.title}>
                  <td className="px-3 py-2">{variant.title}</td>
                  <td className="px-3 py-2">{variant.sku || "Not recorded"}</td>
                  <td className="px-3 py-2">{pricesFor(variant)}</td>
                  <td className="px-3 py-2">{variant.weight || "Not recorded"}</td>
                  <td className="px-3 py-2">{[variant.length, variant.width, variant.height].filter(Boolean).join(" x ") || "Not recorded"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-ui-fg-subtle">No variants recorded.</p>
      )}
    </Card>
  )

  const renderReview = () => (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="BEEMUN product information" eyebrow="ZPS review">
        <div className="grid gap-3">
          <DetailRow label="Ingredients" value={info.ingredients} />
          <DetailRow label="Materials" value={info.materials} />
          <DetailRow label="Packaging" value={info.packaging} />
          <DetailRow label="Usage" value={info.usage} />
          <DetailRow label="Care instructions" value={info.care_instructions} />
          <DetailRow label="Certifications" value={info.certifications} />
          <DetailRow label="Claims" value={info.claims} />
          <DetailRow label="Warnings" value={info.warnings} />
        </div>
      </Card>
      <Card title="Quality signals" eyebrow="Automatic checks">
        {selected?.quality_signals?.length ? (
          <div className="grid gap-2">
            {selected.quality_signals.map((signal) => (
              <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3" key={signal.id}>
                <p className="font-medium text-ui-fg-base">{statusLabel(signal.signal_type || signal.type)}</p>
                <p className="text-sm text-ui-fg-subtle">Score: {signal.score ?? "Not recorded"}</p>
                <p className="text-sm text-ui-fg-subtle">{signal.notes || signal.message || "No notes"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ui-fg-subtle">No quality signals recorded yet. Run automatic checks to start the review trail.</p>
        )}
      </Card>
    </div>
  )

  const renderMessages = () => (
    <Card title="Reviewer and maker conversation" eyebrow="Messages">
      <div className="grid gap-3">
        {(selected?.events || []).filter((event) => event.notes || event.reason).length ? (
          selected?.events
            .filter((event) => event.notes || event.reason)
            .map((event) => (
              <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-3" key={event.id}>
                <p className="text-xs font-medium uppercase text-ui-fg-muted">{event.actor_type || "reviewer"} - {formatDate(event.created_at)}</p>
                <p className="mt-1 text-sm text-ui-fg-base">{event.notes || event.reason}</p>
              </div>
            ))
        ) : (
          <p className="text-sm text-ui-fg-subtle">No product-specific conversation yet. Request changes or reject with notes to create reviewer feedback.</p>
        )}
      </div>
    </Card>
  )

  const renderTimeline = () => (
    <Card title="Product review timeline" eyebrow="Timeline">
      {selected?.events?.length ? (
        <ol className="grid gap-3">
          {[...(selected.events || [])].reverse().map((event) => (
            <li className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-3" key={event.id}>
              <p className="font-medium text-ui-fg-base">{statusLabel(event.from_status)} to {statusLabel(event.to_status)}</p>
              <p className="text-sm text-ui-fg-subtle">{formatDate(event.created_at)} by {event.actor_type || "system"}</p>
              {(event.reason || event.notes) && <p className="mt-1 text-sm text-ui-fg-base">{event.reason || event.notes}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ui-fg-subtle">No timeline events recorded.</p>
      )}
    </Card>
  )

  const renderHistory = () => (
    <Card title="Audit history" eyebrow="History">
      <pre className="max-h-[520px] overflow-auto rounded-lg bg-ui-bg-subtle p-3 text-xs text-ui-fg-subtle">
        {JSON.stringify({ review, vendor_product: selected?.vendor_product, metadata }, null, 2)}
      </pre>
    </Card>
  )

  const renderWorkspace = () => {
    if (!selected) {
      return (
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-8 text-center">
          <h2 className="text-xl font-semibold text-ui-fg-base">No submitted products found</h2>
          <p className="mt-2 text-sm text-ui-fg-subtle">Submitted maker products will appear here for BEEMUN review.</p>
        </div>
      )
    }

    if (activeTab === "overview") return renderOverview()
    if (activeTab === "product") return renderProduct()
    if (activeTab === "media") return renderMedia()
    if (activeTab === "variants") return renderVariants()
    if (activeTab === "review") return renderReview()
    if (activeTab === "messages") return renderMessages()
    if (activeTab === "timeline") return renderTimeline()
    return renderHistory()
  }

  return (
    <div className="p-6">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-ui-fg-muted">BEEMUN Product Review</p>
          <h1 className="text-2xl font-semibold text-ui-fg-base">Product Review Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm text-ui-fg-subtle">
            Review submitted maker products before they can become public. Medusa remains the product, variant, pricing and media source of truth; BEEMUN review controls ZPS approval and publishing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <button
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${activeFilter === filter.key ? "border-ui-border-interactive bg-ui-bg-interactive text-ui-fg-on-color" : "border-ui-border-base bg-ui-bg-base text-ui-fg-subtle"}`}
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      {message && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base">
          <div className="border-b border-ui-border-base px-4 py-3">
            <h2 className="font-semibold text-ui-fg-base">Products</h2>
            <p className="text-xs text-ui-fg-muted">{loading ? "Loading..." : `${items.length} product review(s)`}</p>
          </div>
          <div className="max-h-[calc(100vh-230px)] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-ui-fg-subtle">Loading product reviews...</p>
            ) : items.length ? (
              items.map((item) => (
                <button
                  className={`flex w-full flex-col gap-2 border-b border-ui-border-base px-4 py-4 text-left last:border-b-0 ${selected?.product_review.id === item.product_review.id ? "bg-ui-bg-subtle" : "bg-ui-bg-base"}`}
                  key={item.product_review.id}
                  onClick={() => {
                    setSelectedId(item.product_review.id)
                    setActiveTab("overview")
                  }}
                  type="button"
                >
                  <span className="font-medium text-ui-fg-base">{item.product?.title || item.product_review.product_id}</span>
                  <span className="text-xs text-ui-fg-muted">{item.vendor?.name || "Unknown maker"}</span>
                  <span className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${statusClass(item.product_review.status)}`}>
                    {statusLabel(item.product_review.status)}
                  </span>
                </button>
              ))
            ) : (
              <p className="p-4 text-sm text-ui-fg-subtle">No product reviews in this filter.</p>
            )}
          </div>
        </aside>

        <main className="min-w-0">
          {selected && (
            <>
              <nav className="mb-4 flex gap-2 overflow-x-auto rounded-xl border border-ui-border-base bg-ui-bg-base p-2" aria-label="Product review workspace">
                {workspaceTabs.map((tab) => (
                  <button
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ui-border-interactive ${activeTab === tab.key ? "bg-ui-bg-interactive text-ui-fg-on-color" : "text-ui-fg-subtle hover:bg-ui-bg-subtle hover:text-ui-fg-base"}`}
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
              <div className="sticky top-0 z-10 mb-4 flex flex-wrap gap-2 rounded-xl border border-ui-border-base bg-ui-bg-base/95 p-3 shadow-elevation-card-rest backdrop-blur">
                <span className={`rounded-full border px-3 py-2 text-sm font-medium ${statusClass(review?.status)}`}>{statusLabel(review?.status)}</span>
                <button className="rounded-lg border border-ui-border-base px-3 py-2 text-sm font-medium" disabled={saving} onClick={() => runAction("automatic-checks")}>Run automatic checks</button>
                <button className="rounded-lg border border-ui-border-base px-3 py-2 text-sm font-medium" disabled={saving} onClick={() => runAction("pending-zps-review")}>ZPS review</button>
                <button className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800" disabled={saving} onClick={requestChanges}>Request changes</button>
                <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" disabled={saving} onClick={reject}>Reject</button>
                <button className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700" disabled={saving} onClick={approve}>Approve</button>
                <button className="rounded-lg bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color" disabled={saving || review?.status !== "approved"} onClick={publish}>Publish</button>
              </div>
            </>
          )}
          {renderWorkspace()}
        </main>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "BEEMUN Products",
  rank: 91,
})

export default ProductReviewWorkspace

