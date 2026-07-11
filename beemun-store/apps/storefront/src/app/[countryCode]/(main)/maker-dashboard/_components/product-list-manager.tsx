"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { formatDashboardDate, reviewStatusLabel } from "./dashboard-ui"

type Props = {
  countryCode: string
  items: Array<Record<string, any>>
}

const statuses = [
  "all",
  "draft",
  "needs_changes",
  "submitted",
  "automatic_checks",
  "pending_zps_review",
  "approved",
  "published",
  "rejected",
  "archived",
]

const titleFor = (item: Record<string, any>) =>
  item.product?.title || item.product_review?.product_id || item.vendor_product?.product_id

const idFor = (item: Record<string, any>) =>
  item.product?.id || item.product_review?.product_id || item.vendor_product?.product_id

const statusFor = (item: Record<string, any>) => item.product_review?.status || "draft"

const imageFor = (item: Record<string, any>) => {
  const product = item.product || {}
  const images = Array.isArray(product.images) ? product.images : []
  return product.thumbnail || images[0]?.url || ""
}

const variantCount = (item: Record<string, any>) =>
  Array.isArray(item.product?.variants) ? item.product.variants.length : 0

const priceRange = (item: Record<string, any>) => {
  const variants = Array.isArray(item.product?.variants) ? item.product.variants : []
  const prices = variants
    .map((variant: Record<string, any>) => {
      const price = Array.isArray(variant.prices) ? variant.prices[0] : null
      const amount = Number(price?.amount)
      return Number.isFinite(amount) ? amount : null
    })
    .filter((amount: number | null): amount is number => amount !== null)

  if (!prices.length) return "Price not set"
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? `${min}` : `${min}-${max}`
}

export default function ProductListManager({ countryCode, items }: Props) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState("updated_desc")

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const next = items.filter((item) => {
      const matchesStatus = status === "all" || statusFor(item) === status
      const haystack = [
        titleFor(item),
        item.product?.handle,
        item.product?.subtitle,
        item.product_review?.change_request,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery))
    })

    return next.sort((a, b) => {
      if (sort === "title_asc") return titleFor(a).localeCompare(titleFor(b))
      if (sort === "status_asc") return statusFor(a).localeCompare(statusFor(b))
      const aDate = new Date(a.product_review?.updated_at || a.product?.updated_at || 0).getTime()
      const bDate = new Date(b.product_review?.updated_at || b.product?.updated_at || 0).getTime()
      return sort === "updated_asc" ? aDate - bDate : bDate - aDate
    })
  }, [items, query, sort, status])

  return (
    <div className="beemun-dashboard-grid">
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Products</p>
        <h2>Maker product management</h2>
        <p>
          Search, filter, and open Medusa draft products connected to your BEEMUN maker profile.
        </p>
        <div className="beemun-product-toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
            {statuses.map((item) => <option value={item} key={item}>{item === "all" ? "All statuses" : reviewStatusLabel(item)}</option>)}
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort products">
            <option value="updated_desc">Recently updated</option>
            <option value="updated_asc">Oldest updated</option>
            <option value="title_asc">Product name</option>
            <option value="status_asc">Status</option>
          </select>
        </div>
      </article>

      {filtered.map((item) => {
        const id = idFor(item)
        const status = statusFor(item)
        const editable = ["draft", "needs_changes"].includes(status)
        const image = imageFor(item)

        return (
          <article className="beemun-dashboard-card beemun-product-list-card" key={id}>
            <div className="beemun-product-list-image">
              {image ? <img src={image} alt="" /> : <span>ZPS 100</span>}
            </div>
            <p className="beemun-eyebrow">{reviewStatusLabel(status)}</p>
            <h2>{titleFor(item)}</h2>
            <p>{item.product?.subtitle || item.product?.handle || "BEEMUN maker product"}</p>
            <div className="beemun-product-card-meta">
              <span className="beemun-dashboard-chip">{reviewStatusLabel(status)}</span>
              <span>{editable ? "Editable" : "Read-only"}</span>
              <span>{variantCount(item)} variant(s)</span>
              <span>{priceRange(item)}</span>
            </div>
            <p>Updated: {formatDashboardDate(item.product_review?.updated_at || item.product?.updated_at)}</p>
            <Link className="beemun-btn-secondary" href={`/${countryCode}/maker-dashboard/products/${id}`}>Open product</Link>
          </article>
        )
      })}

      {!filtered.length && (
        <article className="beemun-dashboard-card beemun-dashboard-card-wide">
          <p className="beemun-eyebrow">No matches</p>
          <h2>No products match this view</h2>
          <p>Adjust the search or status filter to find another product.</p>
        </article>
      )}
    </div>
  )
}
