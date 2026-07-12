"use client"

import { ChangeEvent, DragEvent, FormEvent, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import ProductDraftPreview, { ProductPreviewData } from "./product-draft-preview"

type Option = {
  id: string
  name?: string
  title?: string
  handle?: string
}

type MediaFile = {
  file_id: string
  preview_url: string
  admin_url?: string
  public_url?: string
  original_filename?: string
  mime_type?: string
  file_size?: number
  storage_provider?: string
}

type VariantDraft = {
  title: string
  sku: string
  price: string
  currency_code: string
  weight: string
  length: string
  width: string
  height: string
}

const steps = [
  "Basic Information",
  "Category",
  "Media",
  "Variants",
  "BEEMUN Details",
  "Review",
]

const mediaTypes = ["image/jpeg", "image/png", "image/webp"]
const maxMediaSize = 4 * 1024 * 1024

const defaultVariant = (): VariantDraft => ({
  title: "Default",
  sku: "",
  price: "",
  currency_code: "gbp",
  weight: "",
  length: "",
  width: "",
  height: "",
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
  gallery_image_urls: [] as string[],
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

const fileSizeLabel = (size?: number) => {
  if (!size) return "Unknown size"
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

const fileToPayload = (file: File) =>
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

const fieldErrorFor = (step: number, form: typeof emptyForm, variants: VariantDraft[]) => {
  if (step === 0) {
    if (!form.title.trim()) return "Product name is required."
    if (!form.short_description.trim()) return "Short description is required."
  }

  if (step === 2) {
    if (!form.gallery_image_urls.filter(Boolean).length) {
      return "Upload at least one product image for BEEMUN review."
    }
  }

  if (step === 3) {
    const missingVariantTitle = variants.some((variant) => !variant.title.trim())
    const invalidPrice = variants.some(
      (variant) => variant.price.trim() && Number(variant.price) < 0
    )

    if (missingVariantTitle) return "Every variant needs a title."
    if (invalidPrice) return "Variant prices cannot be negative."
  }

  if (step === 4) {
    if (!form.ingredients.trim() && !form.materials.trim()) {
      return "Add ingredients or materials for BEEMUN ZPS review."
    }
    if (!form.packaging.trim()) return "Packaging disclosure is required."
  }

  return ""
}

export default function ProductOnboardingWizard({
  countryCode,
  categories,
  collections,
}: {
  countryCode: string
  categories: Option[]
  collections: Option[]
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [variants, setVariants] = useState<VariantDraft[]>([defaultVariant()])
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [draftProductId, setDraftProductId] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const progress = Math.round(((activeStep + 1) / steps.length) * 100)
  const currentError = useMemo(
    () => fieldErrorFor(activeStep, form, variants),
    [activeStep, form, variants]
  )

  const selectedCategory = categories.find((category) => category.id === form.category_id)
  const selectedCollection = collections.find((collection) => collection.id === form.collection_id)
  const gallery = form.gallery_image_urls.filter(Boolean)
  const finalErrors = steps
    .map((_, index) => fieldErrorFor(index, form, variants))
    .filter(Boolean)
  const previewData: ProductPreviewData = {
    title: form.title,
    brand: form.brand,
    short_description: form.short_description,
    long_description: form.long_description,
    category: selectedCategory?.name || selectedCategory?.title || selectedCategory?.handle,
    collection: selectedCollection?.title || selectedCollection?.name || selectedCollection?.handle,
    product_type: form.product_type,
    cover_image_url: form.cover_image_url,
    gallery_image_urls: gallery,
    variants,
    ingredients: form.ingredients,
    materials: form.materials,
    packaging: form.packaging,
    usage: form.usage,
    care_instructions: form.care_instructions,
    certifications: form.certifications,
    claims: form.claims,
    warnings: form.warnings,
  }

  const update = (key: keyof typeof emptyForm, value: string | string[]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const payloadFrom = (
    nextForm: typeof emptyForm,
    nextVariants: VariantDraft[],
    nextMediaFiles: MediaFile[],
    submit: boolean
  ) => ({
    submit,
    title: nextForm.title,
    brand: nextForm.brand,
    short_description: nextForm.short_description,
    long_description: nextForm.long_description,
    category_ids: nextForm.category_id ? [nextForm.category_id] : [],
    collection_id: nextForm.collection_id || null,
    product_type: nextForm.product_type,
    tags: trimList(nextForm.tags),
    cover_image_url: nextForm.cover_image_url,
    gallery_image_urls: nextForm.gallery_image_urls.filter((url) => url.trim()),
    media_files: nextMediaFiles.filter((file) =>
      nextForm.gallery_image_urls.includes(file.preview_url) || nextForm.cover_image_url === file.preview_url
    ),
    variants: nextVariants.map((variant) => ({
      ...variant,
      price: variant.price ? Number(variant.price) : undefined,
      weight: variant.weight ? Number(variant.weight) : undefined,
      length: variant.length ? Number(variant.length) : undefined,
      width: variant.width ? Number(variant.width) : undefined,
      height: variant.height ? Number(variant.height) : undefined,
    })),
    ingredients: nextForm.ingredients,
    materials: nextForm.materials,
    packaging: nextForm.packaging,
    usage: nextForm.usage,
    care_instructions: nextForm.care_instructions,
    certifications: nextForm.certifications,
    claims: nextForm.claims,
    warnings: nextForm.warnings,
  })

  const persistDraft = async (
    nextForm = form,
    nextVariants = variants,
    nextMediaFiles = mediaFiles,
    targetProductId = draftProductId
  ) => {
    const endpoint = targetProductId
      ? `/api/beemun/maker-dashboard/products/${targetProductId}`
      : "/api/beemun/maker-dashboard/products"
    const response = await fetch(endpoint, {
      method: targetProductId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFrom(nextForm, nextVariants, nextMediaFiles, false)),
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data?.message || "BEEMUN could not save this product draft.")
    }

    const productId = data?.product?.id || targetProductId
    if (productId && !draftProductId) {
      setDraftProductId(productId)
    }

    return productId as string
  }

  const ensureDraftForMedia = async () => {
    const basicError = fieldErrorFor(0, form, variants)
    if (basicError) {
      throw new Error(`${basicError} Complete basic information before uploading media.`)
    }

    return draftProductId || (await persistDraft())
  }

  const updateVariant = (
    index: number,
    key: keyof VariantDraft,
    value: string
  ) => {
    setVariants((current) =>
      current.map((variant, itemIndex) =>
        itemIndex === index ? { ...variant, [key]: value } : variant
      )
    )
  }

  const goNext = () => {
    setError("")
    if (currentError) {
      setError(currentError)
      return
    }
    setActiveStep((step) => Math.min(step + 1, steps.length - 1))
  }

  const uploadFile = async (file: File, replaceIndex?: number) => {
    setError("")
    setSuccess("")

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
      const productId = await ensureDraftForMedia()
      const upload = await fileToPayload(file)
      const response = await fetch(`/api/beemun/maker-dashboard/products/${productId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upload }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result?.message || "BEEMUN could not upload this image.")
      }

      const uploadedFile = result.file as MediaFile | undefined
      const url = uploadedFile?.preview_url

      if (!uploadedFile?.file_id || !url) {
        throw new Error("The upload did not return a protected image preview.")
      }

      const nextGallery = [...gallery]
      if (replaceIndex !== undefined && replaceIndex >= 0 && replaceIndex < nextGallery.length) {
        nextGallery[replaceIndex] = url
      } else {
        nextGallery.push(url)
      }

      const nextForm = {
        ...form,
        cover_image_url:
          !form.cover_image_url || (replaceIndex === 0 && form.cover_image_url === gallery[0])
            ? url
            : form.cover_image_url,
        gallery_image_urls: nextGallery,
      }
      const replacedUrl = replaceIndex !== undefined ? gallery[replaceIndex] : ""
      const nextMediaFiles = [
        ...mediaFiles.filter((item) => item.preview_url !== replacedUrl && item.file_id !== uploadedFile.file_id),
        uploadedFile,
      ]

      setForm(nextForm)
      setMediaFiles(nextMediaFiles)
      await persistDraft(nextForm, variants, nextMediaFiles, productId)
      setSuccess("Image uploaded and attached to this private draft.")
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "BEEMUN could not upload this image.")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const uploadFromInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) await uploadFile(file)
  }

  const dropMedia = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) await uploadFile(file)
  }

  const persistMediaChange = async (nextForm: typeof emptyForm, nextMediaFiles = mediaFiles) => {
    setForm(nextForm)
    if (!draftProductId) return
    try {
      await persistDraft(nextForm, variants, nextMediaFiles, productId)
      setSuccess("Private media order saved.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "BEEMUN could not save media order.")
    }
  }

  const moveGallery = (index: number, direction: -1 | 1) => {
    const next = [...gallery]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    const nextForm = {
      ...form,
      gallery_image_urls: next,
      cover_image_url: form.cover_image_url || next[0] || "",
    }
    void persistMediaChange(nextForm)
  }

  const removeGallery = (index: number) => {
    const removedUrl = gallery[index]
    const nextGallery = gallery.filter((_, itemIndex) => itemIndex !== index)
    const nextMediaFiles = mediaFiles.filter((file) => file.preview_url !== removedUrl)
    const nextForm = {
      ...form,
      gallery_image_urls: nextGallery,
      cover_image_url: form.cover_image_url === removedUrl ? nextGallery[0] || "" : form.cover_image_url,
    }
    setMediaFiles(nextMediaFiles)
    void persistMediaChange(nextForm, nextMediaFiles)
  }

  const setCover = (url: string) => {
    void persistMediaChange({ ...form, cover_image_url: url })
  }

  const submitProduct = async (event: FormEvent, submitForReview: boolean) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (submitForReview && finalErrors.length) {
      setError(finalErrors[0])
      return
    }

    setSaving(true)
    try {
      const productId = await persistDraft()

      if (submitForReview) {
        const response = await fetch(`/api/beemun/maker-dashboard/products/${productId}/resubmit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "Maker submitted product for BEEMUN ZPS review" }),
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data?.message || "BEEMUN could not submit this product for review.")
        }
      }

      setSuccess(
        submitForReview
          ? "Product submitted for BEEMUN ZPS review."
          : "Product draft saved."
      )
      router.refresh()
      router.push(
        submitForReview
          ? `/${countryCode}/maker-dashboard/reviews`
          : `/${countryCode}/maker-dashboard/products/${productId}`
      )
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "BEEMUN could not save this product draft."
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="beemun-product-wizard beemun-product-wizard-with-preview"
      onSubmit={(event) => submitProduct(event, true)}
    >
      <div className="beemun-product-wizard-main">
        <article className="beemun-dashboard-card beemun-dashboard-card-wide">
          <div className="beemun-wizard-head">
            <div>
              <p className="beemun-eyebrow">Product Onboarding</p>
              <h2>Prepare a product for BEEMUN ZPS review</h2>
              <p>
                Products are created as Medusa drafts, linked to your maker
                profile, and submitted into BEEMUN review before anything can go
                public.
              </p>
            </div>
            <strong>{progress}%</strong>
          </div>
          <div className="beemun-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <ol className="beemun-dashboard-stepper">
            {steps.map((step, index) => (
              <li
                className={
                  index === activeStep
                    ? "current"
                    : index < activeStep
                    ? "complete"
                    : ""
                }
                key={step}
              >
                <span>{index + 1}</span>
                <strong>{step}</strong>
              </li>
            ))}
          </ol>
        </article>

        <article className="beemun-dashboard-card beemun-dashboard-card-wide">
          {activeStep === 0 && (
            <div className="beemun-dashboard-form-grid">
              <label><span>Product Name</span><input value={form.title} onChange={(event) => update("title", event.target.value)} required /></label>
              <label><span>Brand</span><input value={form.brand} onChange={(event) => update("brand", event.target.value)} /></label>
              <label><span>Short Description</span><textarea value={form.short_description} onChange={(event) => update("short_description", event.target.value)} required rows={3} /></label>
              <label><span>Long Description</span><textarea value={form.long_description} onChange={(event) => update("long_description", event.target.value)} rows={5} /></label>
            </div>
          )}

          {activeStep === 1 && (
            <div className="beemun-dashboard-form-grid">
              <label><span>Medusa Category</span><select value={form.category_id} onChange={(event) => update("category_id", event.target.value)}><option value="">Choose a category</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name || category.title || category.handle}</option>)}</select></label>
              <label><span>Collection</span><select value={form.collection_id} onChange={(event) => update("collection_id", event.target.value)}><option value="">No collection yet</option>{collections.map((collection) => <option value={collection.id} key={collection.id}>{collection.title || collection.name || collection.handle}</option>)}</select></label>
              <label><span>Product Type</span><input value={form.product_type} onChange={(event) => update("product_type", event.target.value)} placeholder="Bar soap, balm, oil, refill..." /></label>
              <label><span>Tags</span><input value={form.tags} onChange={(event) => update("tags", event.target.value)} placeholder="Comma separated" /></label>
            </div>
          )}

          {activeStep === 2 && (
            <div className="beemun-media-workspace">
              <div className="beemun-dashboard-note">
                <strong>Private product media</strong>
                <p>
                  Uploads go through BEEMUN protected routes and Medusa file storage. Draft images remain private until BEEMUN approves and publishes the product.
                </p>
              </div>
              <label
                className={`beemun-media-upload beemun-media-dropzone${dragging ? " dragging" : ""}`}
                onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={dropMedia}
              >
                <span>{uploading ? "Uploading private image..." : "Upload or drop product image"}</span>
                <small>JPG, PNG, or WEBP. 4 MB max. No raw R2 URLs are exposed.</small>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={uploadFromInput} />
              </label>
              <div className="beemun-media-list">
                {gallery.length ? gallery.map((url, index) => {
                  const file = mediaFiles.find((item) => item.preview_url === url)
                  return (
                    <div className="beemun-media-row beemun-uploaded-media-row" key={`${url}-${index}`}>
                      <div>
                        <img alt={`Product media ${index + 1}`} src={url} />
                        <div>
                          <strong>{file?.original_filename || `Product image ${index + 1}`}</strong>
                          <span>{file?.mime_type || "Protected image"} - {fileSizeLabel(file?.file_size)}</span>
                          {form.cover_image_url === url && <em>Cover image</em>}
                        </div>
                      </div>
                      <div>
                        <button type="button" onClick={() => moveGallery(index, -1)} disabled={index === 0 || uploading}>Up</button>
                        <button type="button" onClick={() => moveGallery(index, 1)} disabled={index === gallery.length - 1 || uploading}>Down</button>
                        <button type="button" onClick={() => setCover(url)} disabled={uploading}>Set cover</button>
                        <label className="beemun-inline-file-action"><span>Replace</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadFile(file, index) }} /></label>
                        <button type="button" onClick={() => removeGallery(index)} disabled={uploading}>Remove</button>
                      </div>
                    </div>
                  )
                }) : <p className="beemun-empty-state">No media uploaded yet. Add at least one image before submitting for BEEMUN review.</p>}
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="beemun-variant-list">
              {variants.map((variant, index) => (
                <div className="beemun-variant-card" key={index}>
                  <label><span>Variant</span><input value={variant.title} onChange={(event) => updateVariant(index, "title", event.target.value)} /></label>
                  <label><span>SKU</span><input value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} /></label>
                  <label><span>Price</span><input inputMode="decimal" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} /></label>
                  <label><span>Currency</span><select value={variant.currency_code} onChange={(event) => updateVariant(index, "currency_code", event.target.value)}><option value="gbp">GBP</option><option value="usd">USD</option><option value="inr">INR</option></select></label>
                  <label><span>Weight</span><input inputMode="numeric" value={variant.weight} onChange={(event) => updateVariant(index, "weight", event.target.value)} /></label>
                  <label><span>Dimensions</span><input value={[variant.length, variant.width, variant.height].filter(Boolean).join(" x ")} onChange={() => {}} placeholder="Use fields below" disabled /></label>
                  <label><span>Length</span><input inputMode="numeric" value={variant.length} onChange={(event) => updateVariant(index, "length", event.target.value)} /></label>
                  <label><span>Width</span><input inputMode="numeric" value={variant.width} onChange={(event) => updateVariant(index, "width", event.target.value)} /></label>
                  <label><span>Height</span><input inputMode="numeric" value={variant.height} onChange={(event) => updateVariant(index, "height", event.target.value)} /></label>
                  {variants.length > 1 && <button type="button" onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove variant</button>}
                </div>
              ))}
              <button className="beemun-btn-secondary" type="button" onClick={() => setVariants((current) => [...current, defaultVariant()])}>Add variant</button>
            </div>
          )}

          {activeStep === 4 && (
            <div className="beemun-dashboard-form-grid">
              {[["ingredients", "Ingredients"], ["materials", "Materials"], ["packaging", "Packaging"], ["usage", "Usage"], ["care_instructions", "Care Instructions"], ["certifications", "Certifications"], ["claims", "Claims"], ["warnings", "Warnings"]].map(([key, label]) => (
                <label key={key}><span>{label}</span><textarea value={form[key as keyof typeof emptyForm] as string} onChange={(event) => update(key as keyof typeof emptyForm, event.target.value)} rows={4} /></label>
              ))}
            </div>
          )}

          {activeStep === 5 && (
            <div className="beemun-final-review-stack">
              <ProductDraftPreview data={previewData} />
              <div className="beemun-review-grid">
                <article><span>Completion</span><strong>{finalErrors.length ? `${finalErrors.length} item(s) need attention` : "Ready to submit"}</strong><p>{finalErrors[0] || "All required product, media, variant and ZPS fields are present."}</p></article>
                <article><span>Media</span><strong>{gallery.length} image(s)</strong><p>{gallery.length ? "Private media is attached to this draft." : "Upload at least one image."}</p></article>
                <article><span>Variants & price</span><strong>{variants.length} variant(s)</strong><p>{variants.some((variant) => variant.price) ? "Pricing is ready for Medusa draft variants." : "Pricing can be added now or before approval."}</p></article>
                <article><span>ZPS disclosure</span><strong>BEEMUN review required</strong><p>Submission creates or updates ProductReview. It never publishes automatically.</p></article>
              </div>
            </div>
          )}

          {error && <p className="beemun-application-error">{error}</p>}
          {success && <p className="beemun-application-success">{success}</p>}

          <div className="beemun-wizard-actions">
            <button type="button" onClick={() => setActiveStep((step) => Math.max(0, step - 1))} disabled={activeStep === 0 || saving || uploading}>Back</button>
            <button className="beemun-btn-secondary beemun-mobile-preview-button" type="button" onClick={() => setMobilePreviewOpen(true)}>Preview product</button>
            {draftProductId && <a className="beemun-btn-secondary" href={`/${countryCode}/maker-dashboard/products/${draftProductId}/preview`} target="_blank" rel="noreferrer">Open saved preview</a>}
            {activeStep < steps.length - 1 ? (
              <button className="beemun-btn-primary" type="button" onClick={goNext} disabled={uploading}>Continue</button>
            ) : (
              <>
                <button className="beemun-btn-secondary" type="button" disabled={saving || uploading} onClick={(event) => submitProduct(event as any, false)}>{saving ? "Saving..." : "Save Draft"}</button>
                <button className="beemun-btn-primary" type="submit" disabled={saving || uploading || Boolean(finalErrors.length)}>{saving ? "Submitting..." : "Submit for Review"}</button>
              </>
            )}
          </div>
        </article>
      </div>

      <aside className="beemun-product-preview-panel" aria-label="Product preview">
        <ProductDraftPreview data={previewData} compact />
      </aside>

      {mobilePreviewOpen && (
        <div className="beemun-preview-modal" role="dialog" aria-modal="true" aria-label="Product preview">
          <button type="button" onClick={() => setMobilePreviewOpen(false)}>Close preview</button>
          <ProductDraftPreview data={previewData} />
        </div>
      )}
    </form>
  )
}