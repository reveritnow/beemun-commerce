"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { formatDashboardDate, reviewStatusLabel } from "./dashboard-ui"

type Option = {
  id: string
  name?: string
  title?: string
  handle?: string
}

type ProductReviewEditorProps = {
  countryCode: string
  productId: string
  categories: Option[]
  collections: Option[]
}

type ProductPayload = Record<string, any>

const editableStatuses = ["draft", "needs_changes"]

const emptyForm = {
  title: "",
  brand: "",
  short_description: "",
  long_description: "",
  category_id: "",
  collection_id: "",
  product_type: "",
  tags: "",
  cover_image_url: "",
  gallery_image_urls: [""],
  ingredients: "",
  materials: "",
  packaging: "",
  usage: "",
  care_instructions: "",
  certifications: "",
  claims: "",
  warnings: "",
}

const trimList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)

const joinList = (value: unknown) =>
  Array.isArray(value) ? value.filter(Boolean).join(", ") : ""

const fieldErrorFor = (form: typeof emptyForm) => {
  if (!form.title.trim()) return "Product name is required."
  if (!form.short_description.trim()) return "Short description is required."
  if (!form.ingredients.trim() && !form.materials.trim()) {
    return "Add ingredients or materials for BEEMUN ZPS review."
  }
  if (!form.packaging.trim()) return "Packaging disclosure is required."
  return ""
}

const buildForm = (data: ProductPayload) => {
  const product = data.product || {}
  const review = data.product_review || {}
  const metadata = review.metadata || {}
  const basic = metadata.basic_information || {}
  const taxonomy = metadata.taxonomy || {}
  const media = metadata.media || {}
  const beemun = metadata.beemun_product_information || {}
  const categories = Array.isArray(product.categories) ? product.categories : []
  const images = Array.isArray(product.images) ? product.images : []
  const gallery =
    Array.isArray(media.gallery_image_urls) && media.gallery_image_urls.length
      ? media.gallery_image_urls
      : images.map((image: Record<string, any>) => image.url).filter(Boolean)

  return {
    title: product.title || "",
    brand: basic.brand || product.subtitle || product.metadata?.maker_brand || "",
    short_description: basic.short_description || "",
    long_description: basic.long_description || product.description || "",
    category_id: taxonomy.category_ids?.[0] || categories[0]?.id || "",
    collection_id: taxonomy.collection_id || product.collection_id || product.collection?.id || "",
    product_type: taxonomy.product_type || "",
    tags: joinList(taxonomy.tags),
    cover_image_url: media.cover_image_url || product.thumbnail || "",
    gallery_image_urls: gallery.length ? gallery : [""],
    ingredients: beemun.ingredients || "",
    materials: beemun.materials || "",
    packaging: beemun.packaging || "",
    usage: beemun.usage || "",
    care_instructions: beemun.care_instructions || "",
    certifications: beemun.certifications || "",
    claims: beemun.claims || "",
    warnings: beemun.warnings || "",
  }
}

const variantPrice = (variant: Record<string, any>) => {
  const price = Array.isArray(variant.prices) ? variant.prices[0] : null
  if (!price) return "Price not set"
  const amount = typeof price.amount === "number" ? price.amount : Number(price.amount)
  const currency = String(price.currency_code || "").toUpperCase()
  return Number.isFinite(amount) ? `${currency} ${amount}` : "Price not set"
}

export default function ProductReviewEditor({
  countryCode,
  productId,
  categories,
  collections,
}: ProductReviewEditorProps) {
  const router = useRouter()
  const [data, setData] = useState<ProductPayload | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resubmitting, setResubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const review = data?.product_review || null
  const product = data?.product || null
  const events = Array.isArray(data?.events) ? data?.events : []
  const editable = review ? editableStatuses.includes(review.status) : false
  const fieldError = useMemo(() => fieldErrorFor(form), [form])

  useEffect(() => {
    let mounted = true

    const loadProduct = async () => {
      setLoading(true)
      setError("")
      try {
        const response = await fetch(`/api/beemun/maker-dashboard/products/${productId}`, {
          cache: "no-store",
        })
        const payload = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(payload?.message || "This product could not be loaded.")
        }

        if (!mounted) return
        setData(payload)
        setForm(buildForm(payload))
      } catch (loadError) {
        if (!mounted) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "This product could not be loaded."
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadProduct()

    return () => {
      mounted = false
    }
  }, [productId])

  const update = (key: keyof typeof emptyForm, value: string | string[]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const updateGallery = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      gallery_image_urls: current.gallery_image_urls.map((item, itemIndex) =>
        itemIndex === index ? value : item
      ),
    }))
  }

  const payload = () => ({
    title: form.title,
    brand: form.brand,
    short_description: form.short_description,
    long_description: form.long_description,
    category_ids: form.category_id ? [form.category_id] : [],
    collection_id: form.collection_id || null,
    product_type: form.product_type,
    tags: trimList(form.tags),
    cover_image_url: form.cover_image_url,
    gallery_image_urls: form.gallery_image_urls.filter((url) => url.trim()),
    ingredients: form.ingredients,
    materials: form.materials,
    packaging: form.packaging,
    usage: form.usage,
    care_instructions: form.care_instructions,
    certifications: form.certifications,
    claims: form.claims,
    warnings: form.warnings,
  })

  const saveChanges = async ({ quiet = false } = {}) => {
    if (!editable) {
      throw new Error("This product is locked while BEEMUN is reviewing it.")
    }

    if (fieldError) {
      throw new Error(fieldError)
    }

    const response = await fetch(`/api/beemun/maker-dashboard/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    })
    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(result?.message || "BEEMUN could not save this product.")
    }

    setData((current) => ({ ...(current || {}), ...result }))
    if (!quiet) {
      setSuccess("Product changes saved.")
    }
    router.refresh()
  }

  const save = async (event?: FormEvent) => {
    event?.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      await saveChanges()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "BEEMUN could not save this product."
      )
    } finally {
      setSaving(false)
    }
  }

  const resubmit = async () => {
    setError("")
    setSuccess("")

    if (!editable) {
      setError("This product is locked while BEEMUN is reviewing it.")
      return
    }

    if (fieldError) {
      setError(fieldError)
      return
    }

    setResubmitting(true)
    try {
      await saveChanges({ quiet: true })
      const response = await fetch(
        `/api/beemun/maker-dashboard/products/${productId}/resubmit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: "Maker resubmitted product for BEEMUN review",
          }),
        }
      )
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          result?.message || "BEEMUN could not resubmit this product."
        )
      }

      setData((current) => ({ ...(current || {}), ...result }))
      setSuccess("Product resubmitted for BEEMUN review.")
      router.refresh()
      router.push(`/${countryCode}/maker-dashboard/reviews`)
    } catch (resubmitError) {
      setError(
        resubmitError instanceof Error
          ? resubmitError.message
          : "BEEMUN could not resubmit this product."
      )
    } finally {
      setResubmitting(false)
    }
  }

  if (loading) {
    return (
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Product</p>
        <h2>Loading product workspace</h2>
        <p>BEEMUN is opening the maker-owned product record.</p>
      </article>
    )
  }

  if (error && !data) {
    return (
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Product unavailable</p>
        <h2>This product could not be opened</h2>
        <p>{error}</p>
      </article>
    )
  }

  const variants = Array.isArray(product?.variants) ? product.variants : []

  return (
    <form className="beemun-product-editor" onSubmit={save}>
      <article className="beemun-dashboard-card beemun-dashboard-card-wide beemun-product-editor-hero">
        <div>
          <p className="beemun-eyebrow">Product Review Loop</p>
          <h2>{product?.title || form.title || "BEEMUN product"}</h2>
          <p>
            {editable
              ? "Update the requested fields and resubmit when the product is ready for BEEMUN review."
              : "This product is read-only while BEEMUN review is in progress or complete."}
          </p>
        </div>
        <span className="beemun-dashboard-chip">
          {reviewStatusLabel(review?.status)}
        </span>
      </article>

      {review?.change_request && (
        <article className="beemun-dashboard-card beemun-dashboard-card-wide beemun-change-request-card">
          <p className="beemun-eyebrow">BEEMUN Requested Changes</p>
          <h2>Review these notes before resubmitting</h2>
          <p>{review.change_request}</p>
        </article>
      )}

      {review?.rejection_reason && (
        <article className="beemun-dashboard-card beemun-dashboard-card-wide beemun-change-request-card">
          <p className="beemun-eyebrow">Review Decision</p>
          <h2>This product was rejected</h2>
          <p>{review.rejection_reason}</p>
        </article>
      )}

      <div className="beemun-product-editor-grid">
        <article className="beemun-dashboard-card beemun-dashboard-card-wide">
          <p className="beemun-eyebrow">Product Information</p>
          <div className="beemun-dashboard-form-grid">
            <label>
              <span>Product Name</span>
              <input
                value={form.title}
                disabled={!editable}
                onChange={(event) => update("title", event.target.value)}
                required
              />
            </label>
            <label>
              <span>Brand</span>
              <input
                value={form.brand}
                disabled={!editable}
                onChange={(event) => update("brand", event.target.value)}
              />
            </label>
            <label>
              <span>Short Description</span>
              <textarea
                value={form.short_description}
                disabled={!editable}
                onChange={(event) => update("short_description", event.target.value)}
                rows={3}
                required
              />
            </label>
            <label>
              <span>Long Description</span>
              <textarea
                value={form.long_description}
                disabled={!editable}
                onChange={(event) => update("long_description", event.target.value)}
                rows={5}
              />
            </label>
            <label>
              <span>Medusa Category</span>
              <select
                value={form.category_id}
                disabled={!editable}
                onChange={(event) => update("category_id", event.target.value)}
              >
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name || category.title || category.handle}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Collection</span>
              <select
                value={form.collection_id}
                disabled={!editable}
                onChange={(event) => update("collection_id", event.target.value)}
              >
                <option value="">No collection yet</option>
                {collections.map((collection) => (
                  <option value={collection.id} key={collection.id}>
                    {collection.title || collection.name || collection.handle}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Product Type</span>
              <input
                value={form.product_type}
                disabled={!editable}
                onChange={(event) => update("product_type", event.target.value)}
              />
            </label>
            <label>
              <span>Tags</span>
              <input
                value={form.tags}
                disabled={!editable}
                onChange={(event) => update("tags", event.target.value)}
                placeholder="Comma separated"
              />
            </label>
          </div>
        </article>

        <article className="beemun-dashboard-card beemun-dashboard-card-wide">
          <p className="beemun-eyebrow">BEEMUN Product Information</p>
          <div className="beemun-dashboard-form-grid">
            {[
              ["ingredients", "Ingredients"],
              ["materials", "Materials"],
              ["packaging", "Packaging"],
              ["usage", "Usage"],
              ["care_instructions", "Care Instructions"],
              ["certifications", "Certifications"],
              ["claims", "Claims"],
              ["warnings", "Warnings"],
            ].map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <textarea
                  value={form[key as keyof typeof emptyForm] as string}
                  disabled={!editable}
                  onChange={(event) =>
                    update(key as keyof typeof emptyForm, event.target.value)
                  }
                  rows={4}
                />
              </label>
            ))}
          </div>
        </article>

        <article className="beemun-dashboard-card beemun-dashboard-card-wide">
          <p className="beemun-eyebrow">Media</p>
          <div className="beemun-dashboard-form-grid">
            <label>
              <span>Cover Image URL</span>
              <input
                value={form.cover_image_url}
                disabled={!editable}
                onChange={(event) => update("cover_image_url", event.target.value)}
              />
            </label>
            <div className="beemun-media-list">
              {form.gallery_image_urls.map((url, index) => (
                <div className="beemun-media-row" key={`${index}-${url}`}>
                  <label>
                    <span>Gallery image {index + 1}</span>
                    <input
                      value={url}
                      disabled={!editable}
                      onChange={(event) => updateGallery(index, event.target.value)}
                    />
                  </label>
                  {editable && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          gallery_image_urls: current.gallery_image_urls.filter(
                            (_, itemIndex) => itemIndex !== index
                          ),
                        }))
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {editable && (
                <button
                  className="beemun-btn-secondary"
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      gallery_image_urls: [...current.gallery_image_urls, ""],
                    }))
                  }
                >
                  Add gallery image
                </button>
              )}
            </div>
          </div>
        </article>

        <article className="beemun-dashboard-card">
          <p className="beemun-eyebrow">Variants & Pricing</p>
          <h2>Medusa variants</h2>
          <p>
            Variants and prices are reused from Medusa. Deeper variant editing
            stays separate from this review loop milestone.
          </p>
          <div className="beemun-product-variant-stack">
            {variants.length ? (
              variants.map((variant: Record<string, any>) => (
                <div key={variant.id || variant.title}>
                  <strong>{variant.title || "Variant"}</strong>
                  <span>{variant.sku || "No SKU"}</span>
                  <span>{variantPrice(variant)}</span>
                </div>
              ))
            ) : (
              <p>No variants recorded.</p>
            )}
          </div>
        </article>

        <article className="beemun-dashboard-card">
          <p className="beemun-eyebrow">Review Timeline</p>
          <h2>BEEMUN review events</h2>
          <div className="beemun-product-event-list">
            {events.length ? (
              events.map((event: Record<string, any>) => (
                <div key={event.id}>
                  <strong>{reviewStatusLabel(event.to_status)}</strong>
                  <span>{formatDashboardDate(event.created_at)}</span>
                  {event.reason && <p>{event.reason}</p>}
                </div>
              ))
            ) : (
              <p>No review events yet.</p>
            )}
          </div>
        </article>
      </div>

      {error && <p className="beemun-application-error">{error}</p>}
      {success && <p className="beemun-application-success">{success}</p>}

      <div className="beemun-product-editor-actions">
        <button
          className="beemun-btn-secondary"
          type="submit"
          disabled={!editable || saving || resubmitting}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button
          className="beemun-btn-primary"
          type="button"
          disabled={!editable || saving || resubmitting}
          onClick={resubmit}
        >
          {resubmitting ? "Resubmitting..." : "Resubmit for Review"}
        </button>
      </div>
    </form>
  )
}


