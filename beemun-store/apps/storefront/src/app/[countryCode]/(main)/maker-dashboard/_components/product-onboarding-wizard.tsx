"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type Option = {
  id: string
  name?: string
  title?: string
  handle?: string
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

const fieldErrorFor = (step: number, form: typeof emptyForm, variants: VariantDraft[]) => {
  if (step === 0) {
    if (!form.title.trim()) return "Product name is required."
    if (!form.short_description.trim()) return "Short description is required."
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
  const [activeStep, setActiveStep] = useState(0)
  const [form, setForm] = useState(emptyForm)
  const [variants, setVariants] = useState<VariantDraft[]>([defaultVariant()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const progress = Math.round(((activeStep + 1) / steps.length) * 100)
  const currentError = useMemo(
    () => fieldErrorFor(activeStep, form, variants),
    [activeStep, form, variants]
  )

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

      if (target < 0 || target >= next.length) {
        return current
      }

      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)

      return { ...current, gallery_image_urls: next }
    })
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

  const payload = (submit: boolean) => ({
    submit,
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

  const submitProduct = async (event: FormEvent, submitForReview: boolean) => {
    event.preventDefault()
    setError("")
    setSuccess("")

    const finalErrors = steps
      .map((_, index) => fieldErrorFor(index, form, variants))
      .filter(Boolean)

    if (submitForReview && finalErrors.length) {
      setError(finalErrors[0])
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/beemun/maker-dashboard/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(submitForReview)),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "BEEMUN could not save this product draft. Please try again."
        )
      }

      setSuccess(
        submitForReview
          ? "Product submitted for BEEMUN ZPS review."
          : "Product draft saved."
      )
      router.refresh()
      router.push(`/${countryCode}/maker-dashboard/reviews`)
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
      className="beemun-product-wizard"
      onSubmit={(event) => submitProduct(event, true)}
    >
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
            <label>
              <span>Product Name</span>
              <input
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                required
              />
            </label>
            <label>
              <span>Brand</span>
              <input
                value={form.brand}
                onChange={(event) => update("brand", event.target.value)}
              />
            </label>
            <label>
              <span>Short Description</span>
              <textarea
                value={form.short_description}
                onChange={(event) =>
                  update("short_description", event.target.value)
                }
                required
                rows={3}
              />
            </label>
            <label>
              <span>Long Description</span>
              <textarea
                value={form.long_description}
                onChange={(event) =>
                  update("long_description", event.target.value)
                }
                rows={5}
              />
            </label>
          </div>
        )}

        {activeStep === 1 && (
          <div className="beemun-dashboard-form-grid">
            <label>
              <span>Medusa Category</span>
              <select
                value={form.category_id}
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
                onChange={(event) => update("product_type", event.target.value)}
                placeholder="Bar soap, balm, oil, refill..."
              />
            </label>
            <label>
              <span>Tags</span>
              <input
                value={form.tags}
                onChange={(event) => update("tags", event.target.value)}
                placeholder="Comma separated"
              />
            </label>
          </div>
        )}

        {activeStep === 2 && (
          <div className="beemun-dashboard-form-grid">
            <label>
              <span>Cover Image URL</span>
              <input
                value={form.cover_image_url}
                onChange={(event) =>
                  update("cover_image_url", event.target.value)
                }
                placeholder="https://..."
              />
            </label>
            <div className="beemun-dashboard-note">
              <strong>Media storage</strong>
              <p>
                This milestone stores image references through Medusa product
                media. Direct file upload will use the Medusa file provider when
                the production provider is configured.
              </p>
            </div>
            <div className="beemun-dashboard-card-wide beemun-media-list">
              {form.gallery_image_urls.map((url, index) => (
                <div className="beemun-media-row" key={`${index}-${url}`}>
                  <label>
                    <span>Gallery image {index + 1}</span>
                    <input
                      value={url}
                      onChange={(event) =>
                        updateGallery(index, event.target.value)
                      }
                      placeholder="https://..."
                    />
                  </label>
                  <div>
                    <button
                      type="button"
                      onClick={() => moveGallery(index, -1)}
                      disabled={index === 0}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveGallery(index, 1)}
                      disabled={index === form.gallery_image_urls.length - 1}
                    >
                      Down
                    </button>
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
                  </div>
                </div>
              ))}
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
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <div className="beemun-variant-list">
            {variants.map((variant, index) => (
              <div className="beemun-variant-card" key={index}>
                <label>
                  <span>Variant</span>
                  <input
                    value={variant.title}
                    onChange={(event) =>
                      updateVariant(index, "title", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>SKU</span>
                  <input
                    value={variant.sku}
                    onChange={(event) =>
                      updateVariant(index, "sku", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Price</span>
                  <input
                    inputMode="decimal"
                    value={variant.price}
                    onChange={(event) =>
                      updateVariant(index, "price", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Currency</span>
                  <select
                    value={variant.currency_code}
                    onChange={(event) =>
                      updateVariant(index, "currency_code", event.target.value)
                    }
                  >
                    <option value="gbp">GBP</option>
                    <option value="usd">USD</option>
                    <option value="inr">INR</option>
                  </select>
                </label>
                <label>
                  <span>Weight</span>
                  <input
                    inputMode="numeric"
                    value={variant.weight}
                    onChange={(event) =>
                      updateVariant(index, "weight", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Dimensions</span>
                  <input
                    value={[variant.length, variant.width, variant.height]
                      .filter(Boolean)
                      .join(" x ")}
                    onChange={() => {}}
                    placeholder="Use fields below"
                    disabled
                  />
                </label>
                <label>
                  <span>Length</span>
                  <input
                    inputMode="numeric"
                    value={variant.length}
                    onChange={(event) =>
                      updateVariant(index, "length", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Width</span>
                  <input
                    inputMode="numeric"
                    value={variant.width}
                    onChange={(event) =>
                      updateVariant(index, "width", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Height</span>
                  <input
                    inputMode="numeric"
                    value={variant.height}
                    onChange={(event) =>
                      updateVariant(index, "height", event.target.value)
                    }
                  />
                </label>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setVariants((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                  >
                    Remove variant
                  </button>
                )}
              </div>
            ))}
            <button
              className="beemun-btn-secondary"
              type="button"
              onClick={() => setVariants((current) => [...current, defaultVariant()])}
            >
              Add variant
            </button>
          </div>
        )}

        {activeStep === 4 && (
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
                  onChange={(event) =>
                    update(key as keyof typeof emptyForm, event.target.value)
                  }
                  rows={4}
                />
              </label>
            ))}
          </div>
        )}

        {activeStep === 5 && (
          <div className="beemun-review-grid">
            <article>
              <span>Product</span>
              <strong>{form.title || "Untitled product"}</strong>
              <p>{form.short_description || "No short description yet."}</p>
            </article>
            <article>
              <span>Commerce</span>
              <strong>{variants.length} variant(s)</strong>
              <p>
                Medusa draft product, variants, pricing, category and collection
                will be reused.
              </p>
            </article>
            <article>
              <span>ZPS Review</span>
              <strong>BEEMUN review required</strong>
              <p>
                ProductReview will be created as submitted. Public visibility
                remains disabled.
              </p>
            </article>
            <article>
              <span>Media</span>
              <strong>{form.gallery_image_urls.filter(Boolean).length} image(s)</strong>
              <p>Image references will attach to the Medusa draft product.</p>
            </article>
          </div>
        )}

        {error && <p className="beemun-application-error">{error}</p>}
        {success && <p className="beemun-application-success">{success}</p>}

        <div className="beemun-wizard-actions">
          <button
            type="button"
            onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
            disabled={activeStep === 0 || saving}
          >
            Back
          </button>
          {activeStep < steps.length - 1 ? (
            <button className="beemun-btn-primary" type="button" onClick={goNext}>
              Continue
            </button>
          ) : (
            <>
              <button
                className="beemun-btn-secondary"
                type="button"
                disabled={saving}
                onClick={(event) => submitProduct(event as any, false)}
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
              <button className="beemun-btn-primary" type="submit" disabled={saving}>
                {saving ? "Submitting..." : "Submit for Review"}
              </button>
            </>
          )}
        </div>
      </article>
    </form>
  )
}
