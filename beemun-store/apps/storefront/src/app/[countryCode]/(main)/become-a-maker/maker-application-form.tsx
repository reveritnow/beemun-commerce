"use client"

import { FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

type FormState = "idle" | "submitting" | "success" | "error"

const categories = [
  "Skin & Body",
  "Hair Care",
  "Oils & Butters",
  "Home Essentials",
  "Refill Ready",
  "Other",
]

const requiredFields = [
  "businessName",
  "contactName",
  "country",
  "productCategories",
  "makerStory",
  "productsToList",
  "ingredientPhilosophy",
  "packagingPhilosophy",
  "zpsFit",
]

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const splitName = (value: string) => {
  const parts = value.trim().split(/\s+/)
  const firstName = parts.shift() || value.trim()
  const lastName = parts.join(" ") || null

  return { firstName, lastName }
}

export default function MakerApplicationForm({
  countryCode,
  userEmail,
  userName,
}: {
  countryCode: string
  userEmail: string
  userName?: string | null
}) {
  const router = useRouter()
  const [state, setState] = useState<FormState>("idle")
  const [error, setError] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const categoryValue = useMemo(
    () => selectedCategories.join(", "),
    [selectedCategories]
  )

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    const form = event.currentTarget
    const formData = new FormData(form)
    const values = Object.fromEntries(formData.entries()) as Record<
      string,
      string
    >

    const missingField = requiredFields.find((field) => {
      const value =
        field === "productCategories" ? categoryValue : values[field]
      return !value || !value.trim()
    })

    if (missingField) {
      setState("error")
      setError("Please complete all required fields before submitting.")
      return
    }

    const { firstName, lastName } = splitName(values.contactName || userName || "")

    setState("submitting")

    try {
      const response = await fetch("/api/beemun/maker-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.businessName,
          handle: slugify(values.businessName),
          email: userEmail,
          owner_email: userEmail,
          owner_first_name: firstName,
          owner_last_name: lastName,
          phone: values.phone || null,
          website_url: values.website || null,
          country_code: values.country,
          description: values.makerStory,
          submit: true,
          status: "submitted",
          notes: values.notes || null,
          metadata: {
            public_application_source: "become-a-maker",
            beemun_auth_email: userEmail,
            contact_name: values.contactName,
            website_or_instagram: values.website || null,
            product_categories: selectedCategories,
            products_to_list: values.productsToList,
            ingredient_philosophy: values.ingredientPhilosophy,
            packaging_philosophy: values.packagingPhilosophy,
            zps_fit: values.zpsFit,
            notes: values.notes || null,
          },
          owner_metadata: {
            public_application_source: "become-a-maker",
          },
          event_metadata: {
            public_application_source: "become-a-maker",
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(
          data?.message ||
            "Application could not be submitted. Please try again."
        )
      }

      form.reset()
      setSelectedCategories([])
      setState("success")
      router.push(`/${countryCode}/maker-portal`)
      router.refresh()
    } catch (submitError) {
      setState("error")
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Application could not be submitted."
      )
    }
  }

  return (
    <section className="beemun-section beemun-application-section">
      <div className="beemun-section-head">
        <p className="beemun-eyebrow">Maker application</p>
        <h2>Tell BEEMUN what you make and how you make it.</h2>
        <p>
          This creates a submitted maker profile for BEEMUN review. It does not
          publish products or create public product visibility.
        </p>
      </div>

      {state === "success" ? (
        <div className="beemun-application-success" role="status">
          <h3>Application submitted.</h3>
          <p>
            BEEMUN will review your maker profile before any product can go
            live.
          </p>
        </div>
      ) : (
        <form className="beemun-application-form" onSubmit={handleSubmit}>
          <div className="beemun-form-grid">
            <label>
              <span>Maker / business name *</span>
              <input name="businessName" required />
            </label>
            <label>
              <span>Contact name *</span>
              <input name="contactName" required />
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" value={userEmail} disabled />
            </label>
            <label>
              <span>Phone</span>
              <input name="phone" type="tel" />
            </label>
            <label>
              <span>Country *</span>
              <input name="country" required />
            </label>
            <label>
              <span>Website / Instagram</span>
              <input name="website" placeholder="https:// or @handle" />
            </label>
          </div>

          <fieldset>
            <legend>Product categories *</legend>
            <div className="beemun-category-options">
              {categories.map((category) => (
                <label key={category}>
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  <span>{category}</span>
                </label>
              ))}
            </div>
            <input
              name="productCategories"
              type="hidden"
              value={categoryValue}
              readOnly
            />
          </fieldset>

          <label>
            <span>Short maker story *</span>
            <textarea name="makerStory" rows={4} required />
          </label>
          <label>
            <span>What products do you want to list? *</span>
            <textarea name="productsToList" rows={4} required />
          </label>
          <label>
            <span>Ingredient/material philosophy *</span>
            <textarea name="ingredientPhilosophy" rows={4} required />
          </label>
          <label>
            <span>Packaging philosophy *</span>
            <textarea name="packagingPhilosophy" rows={4} required />
          </label>

          <fieldset>
            <legend>Do you believe your products can meet ZPS 100? *</legend>
            <div className="beemun-radio-row">
              {["yes", "no", "not sure"].map((option) => (
                <label key={option}>
                  <input name="zpsFit" type="radio" value={option} required />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            <span>Notes for BEEMUN</span>
            <textarea name="notes" rows={4} />
          </label>

          {state === "error" && error && (
            <p className="beemun-application-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="beemun-btn-primary"
            type="submit"
            disabled={state === "submitting"}
          >
            {state === "submitting" ? "Submitting..." : "Submit application"}
          </button>
        </form>
      )}
    </section>
  )
}
