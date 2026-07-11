"use client"

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { formatDashboardDate, reviewStatusLabel } from "./dashboard-ui"

type Option = { id: string; name?: string; title?: string; handle?: string }
type ProductPayload = Record<string, any>
type VariantForm = {
  id?: string
  title: string
  sku: string
  price: string
  currency_code: string
  weight: string
  length: string
  width: string
  height: string
  inventory_quantity: string
  manage_inventory: boolean
  allow_backorder: boolean
}

type ProductReviewEditorProps = {
  countryCode: string
  productId: string
  categories: Option[]
  collections: Option[]
}

const tabs = [
  "Overview",
  "Media",
  "Variants",
  "Pricing",
  "ZPS Information",
  "Review",
  "Timeline",
]
const editableStatuses = ["draft", "needs_changes"]
const mediaTypes = ["image/jpeg", "image/png", "image/webp"]
const maxMediaSize = 4 * 1024 * 1024

const emptyVariant = (): VariantForm => ({
  title: "Default",
  sku: "",
  price: "",
  currency_code: "gbp",
  weight: "",
  length: "",
  width: "",
  height: "",
  inventory_quantity: "",
  manage_inventory: false,
  allow_backorder: false,
})

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
  value.split(",").map((item) => item.trim()).filter(Boolean)

const joinList = (value: unknown) =>
  Array.isArray(value) ? value.filter(Boolean).join(", ") : ""

const stringValue = (value: unknown) =>
  value === null || value === undefined ? "" : String(value)

const firstPrice = (variant: Record<string, any>) => {
  const prices = Array.isArray(variant.prices) ? variant.prices : []
  return prices[0] || null
}

const fieldErrorFor = (form: typeof emptyForm, variants: VariantForm[]) => {
  if (!form.title.trim()) return "Product name is required."
  if (!form.short_description.trim()) return "Short description is required."
  if (!form.ingredients.trim() && !form.materials.trim()) {
    return "Add ingredients or materials for BEEMUN ZPS review."
  }
  if (!form.packaging.trim()) return "Packaging disclosure is required."
  if (!variants.length) return "At least one Medusa variant is required."
  if (variants.some((variant) => !variant.title.trim())) {
    return "Every variant needs a title."
  }
  if (variants.some((variant) => variant.price && Number(variant.price) < 0)) {
    return "Variant prices cannot be negative."
  }
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

const buildVariants = (data: ProductPayload): VariantForm[] => {
  const variants = Array.isArray(data.product?.variants) ? data.product.variants : []
  const reviewInventory = data.product_review?.metadata?.inventory?.variants || []

  if (!variants.length) return [emptyVariant()]

  return variants.map((variant: Record<string, any>) => {
    const price = firstPrice(variant)
    const inventory = reviewInventory.find(
      (item: Record<string, any>) => item.id && item.id === variant.id
    )
    return {
      id: variant.id,
      title: variant.title || "Default",
      sku: variant.sku || "",
      price: stringValue(price?.amount),
      currency_code: String(price?.currency_code || "gbp").toLowerCase(),
      weight: stringValue(variant.weight),
      length: stringValue(variant.length),
      width: stringValue(variant.width),
      height: stringValue(variant.height),
      inventory_quantity: stringValue(
        variant.metadata?.inventory_quantity ?? inventory?.inventory_quantity
      ),
      manage_inventory: Boolean(variant.manage_inventory || inventory?.manage_inventory),
      allow_backorder: Boolean(variant.allow_backorder || inventory?.allow_backorder),
    }
  })
}

const priceLabel = (variant: VariantForm) =>
  variant.price ? `${variant.currency_code.toUpperCase()} ${variant.price}` : "Price not set"

const documentPayloadFromFile = (file: File) =>
  new Promise<Record<string, any>>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("The image could not be read."))
    reader.onload = () => {
      const result = String(reader.result || "")
      const content = result.includes(",") ? result.split(",").pop() : result
      resolve({
        original_filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        content_base64: content,
      })
    }
    reader.readAsDataURL(file)
  })

export default function ProductReviewEditor({
  countryCode,
  productId,
  categories,
  collections,
}: ProductReviewEditorProps) {
  const router = useRouter()
  const [data, setData] = useState<ProductPayload | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [variants, setVariants] = useState<VariantForm[]>([emptyVariant()])
  const [activeTab, setActiveTab] = useState(tabs[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resubmitting, setResubmitting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const review = data?.product_review || null
  const product = data?.product || null
  const events = Array.isArray(data?.events) ? data?.events : []
  const editable = review ? editableStatuses.includes(review.status) : false
  const fieldError = useMemo(() => fieldErrorFor(form, variants), [form, variants])

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
        if (!response.ok) throw new Error(payload?.message || "This product could not be loaded.")
        if (!mounted) return
        setData(payload)
        setForm(buildForm(payload))
        setVariants(buildVariants(payload))
      } catch (loadError) {
        if (!mounted) return
        setError(loadError instanceof Error ? loadError.message : "This product could not be loaded.")
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

  const moveGallery = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const next = [...current.gallery_image_urls]
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return { ...current, gallery_image_urls: next }
    })
  }

  const updateVariant = (index: number, key: keyof VariantForm, value: string | boolean) => {
    setVariants((current) =>
      current.map((variant, itemIndex) =>
        itemIndex === index ? { ...variant, [key]: value } : variant
      )
    )
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
    variants: variants.map((variant) => ({
      ...variant,
      price: variant.price ? Number(variant.price) : undefined,
      weight: variant.weight ? Number(variant.weight) : undefined,
      length: variant.length ? Number(variant.length) : undefined,
      width: variant.width ? Number(variant.width) : undefined,
      height: variant.height ? Number(variant.height) : undefined,
      inventory_quantity: variant.inventory_quantity
        ? Number(variant.inventory_quantity)
        : undefined,
    })),
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
    if (!editable) throw new Error("This product is locked while BEEMUN is reviewing it.")
    if (fieldError) throw new Error(fieldError)
    const response = await fetch(`/api/beemun/maker-dashboard/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result?.message || "BEEMUN could not save this product.")
    setData((current) => ({ ...(current || {}), ...result }))
    if (!quiet) setSuccess("Product changes saved.")
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
      setError(saveError instanceof Error ? saveError.message : "BEEMUN could not save this product.")
    } finally {
      setSaving(false)
    }
  }

  const resubmit = async () => {
    setError("")
    setSuccess("")
    setResubmitting(true)
    try {
      await saveChanges({ quiet: true })
      const response = await fetch(`/api/beemun/maker-dashboard/products/${productId}/resubmit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Maker resubmitted product for BEEMUN review" }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.message || "BEEMUN could not resubmit this product.")
      setData((current) => ({ ...(current || {}), ...result }))
      setSuccess("Product resubmitted for BEEMUN review.")
      router.refresh()
      router.push(`/${countryCode}/maker-dashboard/reviews`)
    } catch (resubmitError) {
      setError(resubmitError instanceof Error ? resubmitError.message : "BEEMUN could not resubmit this product.")
    } finally {
      setResubmitting(false)
    }
  }

  const archive = async () => {
    setError("")
    setSuccess("")
    if (!window.confirm("Archive this product? It will remain private and leave the active review queue.")) return
    setArchiving(true)
    try {
      const response = await fetch(`/api/beemun/maker-dashboard/products/${productId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Maker archived product" }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.message || "BEEMUN could not archive this product.")
      setData((current) => ({ ...(current || {}), ...result }))
      setSuccess("Product archived.")
      router.refresh()
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "BEEMUN could not archive this product.")
    } finally {
      setArchiving(false)
    }
  }

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    setError("")
    setSuccess("")
    if (!file) return
    if (!mediaTypes.includes(file.type)) {
      setError("Product images must be JPG, PNG, or WEBP.")
      return
    }
    if (file.size > maxMediaSize) {
      setError("Product images must be 4 MB or smaller.")
      return
    }
    setUploading(true)
    try {
      const upload = await documentPayloadFromFile(file)
      const response = await fetch(`/api/beemun/maker-dashboard/products/${productId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.message || "BEEMUN could not upload this image.")
      const url = result.file?.url
      if (!url) throw new Error("The upload did not return an image URL.")
      setForm((current) => ({
        ...current,
        cover_image_url: current.cover_image_url || url,
        gallery_image_urls: [...current.gallery_image_urls.filter(Boolean), url],
      }))
      setSuccess("Image uploaded. Save changes to attach it to the Medusa product.")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "BEEMUN could not upload this image.")
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return <article className="beemun-dashboard-card beemun-dashboard-card-wide"><p className="beemun-eyebrow">Product</p><h2>Loading product workspace</h2><p>BEEMUN is opening the maker-owned product record.</p></article>
  }

  if (error && !data) {
    return <article className="beemun-dashboard-card beemun-dashboard-card-wide"><p className="beemun-eyebrow">Product unavailable</p><h2>This product could not be opened</h2><p>{error}</p></article>
  }

  const gallery = form.gallery_image_urls.filter(Boolean)
  const priceValues = variants.map((variant) => Number(variant.price)).filter(Number.isFinite)
  const minPrice = priceValues.length ? Math.min(...priceValues) : null
  const maxPrice = priceValues.length ? Math.max(...priceValues) : null

  return (
    <form className="beemun-product-editor" onSubmit={save}>
      <article className="beemun-dashboard-card beemun-dashboard-card-wide beemun-product-editor-hero">
        <div>
          <p className="beemun-eyebrow">Product Management</p>
          <h2>{product?.title || form.title || "BEEMUN product"}</h2>
          <p>{editable ? "Manage Medusa product data, media, variants, pricing, inventory, and BEEMUN ZPS information before review." : "This product is read-only while BEEMUN review is in progress or complete."}</p>
        </div>
        <span className="beemun-dashboard-chip">{reviewStatusLabel(review?.status)}</span>
      </article>

      <nav className="beemun-product-tabs" aria-label="Product management sections">
        {tabs.map((tab) => <button className={activeTab === tab ? "active" : ""} key={tab} type="button" onClick={() => setActiveTab(tab)}>{tab}</button>)}
      </nav>

      {review?.change_request && <article className="beemun-dashboard-card beemun-dashboard-card-wide beemun-change-request-card"><p className="beemun-eyebrow">BEEMUN Requested Changes</p><h2>Review these notes before resubmitting</h2><p>{review.change_request}</p></article>}
      {review?.rejection_reason && <article className="beemun-dashboard-card beemun-dashboard-card-wide beemun-change-request-card"><p className="beemun-eyebrow">Review Decision</p><h2>This product was rejected</h2><p>{review.rejection_reason}</p></article>}

      {activeTab === "Overview" && (
        <div className="beemun-dashboard-grid">
          <article className="beemun-dashboard-card beemun-dashboard-card-wide">
            <p className="beemun-eyebrow">Overview</p>
            <h2>Product readiness</h2>
            <div className="beemun-dashboard-mini-metrics">
              <div><span>Status</span><strong>{reviewStatusLabel(review?.status)}</strong></div>
              <div><span>Images</span><strong>{gallery.length}</strong></div>
              <div><span>Variants</span><strong>{variants.length}</strong></div>
              <div><span>Price range</span><strong>{minPrice === null ? "Not set" : minPrice === maxPrice ? `${minPrice}` : `${minPrice}-${maxPrice}`}</strong></div>
            </div>
          </article>
          <article className="beemun-dashboard-card beemun-dashboard-card-wide">
            <p className="beemun-eyebrow">Product Information</p>
            <div className="beemun-dashboard-form-grid">
              <label><span>Product Name</span><input value={form.title} disabled={!editable} onChange={(event) => update("title", event.target.value)} required /></label>
              <label><span>Brand</span><input value={form.brand} disabled={!editable} onChange={(event) => update("brand", event.target.value)} /></label>
              <label><span>Short Description</span><textarea value={form.short_description} disabled={!editable} onChange={(event) => update("short_description", event.target.value)} rows={3} required /></label>
              <label><span>Long Description</span><textarea value={form.long_description} disabled={!editable} onChange={(event) => update("long_description", event.target.value)} rows={5} /></label>
              <label><span>Medusa Category</span><select value={form.category_id} disabled={!editable} onChange={(event) => update("category_id", event.target.value)}><option value="">Choose a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name || category.title || category.handle}</option>)}</select></label>
              <label><span>Collection</span><select value={form.collection_id} disabled={!editable} onChange={(event) => update("collection_id", event.target.value)}><option value="">No collection yet</option>{collections.map((collection) => <option value={collection.id} key={collection.id}>{collection.title || collection.name || collection.handle}</option>)}</select></label>
              <label><span>Product Type</span><input value={form.product_type} disabled={!editable} onChange={(event) => update("product_type", event.target.value)} /></label>
              <label><span>Tags</span><input value={form.tags} disabled={!editable} onChange={(event) => update("tags", event.target.value)} placeholder="Comma separated" /></label>
            </div>
          </article>
        </div>
      )}

      {activeTab === "Media" && (
        <article className="beemun-dashboard-card beemun-dashboard-card-wide">
          <p className="beemun-eyebrow">Medusa Media</p><h2>Cover and gallery</h2>
          <p>Uploads use Medusa's file provider when configured. Products stay private until BEEMUN approval and publish.</p>
          {editable && <label className="beemun-media-upload"><span>{uploading ? "Uploading..." : "Upload image"}</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={uploadImage} /></label>}
          <div className="beemun-dashboard-form-grid">
            <label><span>Cover Image URL</span><input value={form.cover_image_url} disabled={!editable} onChange={(event) => update("cover_image_url", event.target.value)} /></label>
          </div>
          <div className="beemun-media-list">
            {form.gallery_image_urls.map((url, index) => <div className="beemun-media-row" key={`${index}-${url}`}><label><span>Gallery image {index + 1}</span><input value={url} disabled={!editable} onChange={(event) => updateGallery(index, event.target.value)} /></label>{url && <img alt="Product gallery preview" src={url} />}{editable && <div><button type="button" onClick={() => moveGallery(index, -1)} disabled={index === 0}>Up</button><button type="button" onClick={() => moveGallery(index, 1)} disabled={index === form.gallery_image_urls.length - 1}>Down</button><button type="button" onClick={() => setForm((current) => ({ ...current, gallery_image_urls: current.gallery_image_urls.filter((_, itemIndex) => itemIndex !== index) }))}>Remove</button><button type="button" onClick={() => setForm((current) => ({ ...current, cover_image_url: url }))}>Set cover</button></div>}</div>)}
            {editable && <button className="beemun-btn-secondary" type="button" onClick={() => setForm((current) => ({ ...current, gallery_image_urls: [...current.gallery_image_urls, ""] }))}>Add image URL</button>}
          </div>
        </article>
      )}

      {(activeTab === "Variants" || activeTab === "Pricing") && (
        <article className="beemun-dashboard-card beemun-dashboard-card-wide">
          <p className="beemun-eyebrow">Medusa Variants</p><h2>{activeTab === "Pricing" ? "Pricing" : "Variants and simple inventory"}</h2>
          <div className="beemun-variant-list">
            {variants.map((variant, index) => <div className="beemun-variant-card" key={variant.id || index}>
              <label><span>Variant</span><input value={variant.title} disabled={!editable} onChange={(event) => updateVariant(index, "title", event.target.value)} /></label>
              <label><span>SKU</span><input value={variant.sku} disabled={!editable} onChange={(event) => updateVariant(index, "sku", event.target.value)} /></label>
              <label><span>Price</span><input inputMode="decimal" value={variant.price} disabled={!editable} onChange={(event) => updateVariant(index, "price", event.target.value)} /></label>
              <label><span>Currency</span><select value={variant.currency_code} disabled={!editable} onChange={(event) => updateVariant(index, "currency_code", event.target.value)}><option value="gbp">GBP</option><option value="usd">USD</option><option value="inr">INR</option></select></label>
              <label><span>Stock quantity</span><input inputMode="numeric" value={variant.inventory_quantity} disabled={!editable} onChange={(event) => updateVariant(index, "inventory_quantity", event.target.value)} /></label>
              <label><span>Weight</span><input inputMode="numeric" value={variant.weight} disabled={!editable} onChange={(event) => updateVariant(index, "weight", event.target.value)} /></label>
              <label><span>Length</span><input inputMode="numeric" value={variant.length} disabled={!editable} onChange={(event) => updateVariant(index, "length", event.target.value)} /></label>
              <label><span>Width</span><input inputMode="numeric" value={variant.width} disabled={!editable} onChange={(event) => updateVariant(index, "width", event.target.value)} /></label>
              <label><span>Height</span><input inputMode="numeric" value={variant.height} disabled={!editable} onChange={(event) => updateVariant(index, "height", event.target.value)} /></label>
              <label className="beemun-checkbox-row"><input type="checkbox" checked={variant.manage_inventory} disabled={!editable} onChange={(event) => updateVariant(index, "manage_inventory", event.target.checked)} /><span>Track stock in Medusa</span></label>
              <label className="beemun-checkbox-row"><input type="checkbox" checked={variant.allow_backorder} disabled={!editable} onChange={(event) => updateVariant(index, "allow_backorder", event.target.checked)} /><span>Continue selling when out of stock</span></label>
              <strong>{priceLabel(variant)}</strong>
              {editable && variants.length > 1 && <button type="button" onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove variant</button>}
            </div>)}
          </div>
          {editable && <button className="beemun-btn-secondary" type="button" onClick={() => setVariants((current) => [...current, emptyVariant()])}>Add variant</button>}
        </article>
      )}

      {activeTab === "ZPS Information" && (
        <article className="beemun-dashboard-card beemun-dashboard-card-wide"><p className="beemun-eyebrow">BEEMUN ZPS Information</p><h2>Disclosure for review</h2><div className="beemun-dashboard-form-grid">{[["ingredients", "Ingredients"], ["materials", "Materials"], ["packaging", "Packaging"], ["usage", "Usage"], ["care_instructions", "Care Instructions"], ["certifications", "Certifications"], ["claims", "Claims"], ["warnings", "Warnings"]].map(([key, label]) => <label key={key}><span>{label}</span><textarea value={form[key as keyof typeof emptyForm] as string} disabled={!editable} onChange={(event) => update(key as keyof typeof emptyForm, event.target.value)} rows={4} /></label>)}</div></article>
      )}

      {activeTab === "Review" && (
        <article className="beemun-dashboard-card beemun-dashboard-card-wide"><p className="beemun-eyebrow">Review</p><h2>BEEMUN decision state</h2><p>Status: {reviewStatusLabel(review?.status)}</p><p>Submitted: {formatDashboardDate(review?.submitted_at)}</p>{review?.change_request && <p>Requested changes: {review.change_request}</p>}{review?.rejection_reason && <p>Rejection reason: {review.rejection_reason}</p>}<p>Only BEEMUN admins can approve or publish this product.</p></article>
      )}

      {activeTab === "Timeline" && (
        <article className="beemun-dashboard-card beemun-dashboard-card-wide"><p className="beemun-eyebrow">Timeline</p><h2>Product review events</h2><div className="beemun-product-event-list">{events.length ? events.map((event: Record<string, any>) => <div key={event.id}><strong>{reviewStatusLabel(event.to_status)}</strong><span>{formatDashboardDate(event.created_at)}</span>{event.reason && <p>{event.reason}</p>}</div>) : <p>No review events yet.</p>}</div></article>
      )}

      {error && <p className="beemun-application-error">{error}</p>}
      {success && <p className="beemun-application-success">{success}</p>}

      <div className="beemun-product-editor-actions">
        <button className="beemun-btn-secondary" type="button" disabled={archiving || review?.status === "published"} onClick={archive}>{archiving ? "Archiving..." : "Archive"}</button>
        <button className="beemun-btn-secondary" type="submit" disabled={!editable || saving || resubmitting}>{saving ? "Saving..." : "Save changes"}</button>
        <button className="beemun-btn-primary" type="button" disabled={!editable || saving || resubmitting} onClick={resubmit}>{resubmitting ? "Resubmitting..." : "Resubmit for Review"}</button>
      </div>
    </form>
  )
}
