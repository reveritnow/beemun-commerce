"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useMemo, useState } from "react"

type WizardState = "idle" | "submitting" | "error"

type Values = {
  businessName: string
  contactName: string
  phone: string
  country: string
  website: string
  makerStory: string
  productsToList: string
  sourcingPhilosophy: string
  ingredientPhilosophy: string
  packagingPhilosophy: string
  zpsFit: string
  notes: string
}

const categories = [
  "Skin & Body",
  "Hair Care",
  "Oils & Butters",
  "Home Essentials",
  "Refill Ready",
  "Other",
]

const initialValues: Values = {
  businessName: "",
  contactName: "",
  phone: "",
  country: "",
  website: "",
  makerStory: "",
  productsToList: "",
  sourcingPhilosophy: "",
  ingredientPhilosophy: "",
  packagingPhilosophy: "",
  zpsFit: "",
  notes: "",
}

const steps = [
  {
    title: "Welcome",
    eyebrow: "Step 1",
    summary: "A short orientation before you begin.",
    fields: [] as Array<keyof Values | "productCategories">,
  },
  {
    title: "Basic details",
    eyebrow: "Step 2",
    summary: "Tell us who you are and where you make.",
    fields: ["businessName", "contactName", "country"],
  },
  {
    title: "Brand story",
    eyebrow: "Step 3",
    summary: "Share the story customers should be able to trust.",
    fields: ["makerStory", "productsToList", "productCategories"],
  },
  {
    title: "Making & sourcing",
    eyebrow: "Step 4",
    summary: "Explain how materials, suppliers, and production are chosen.",
    fields: ["sourcingPhilosophy"],
  },
  {
    title: "Ingredients/materials",
    eyebrow: "Step 5",
    summary: "Describe what goes into your products and why.",
    fields: ["ingredientPhilosophy"],
  },
  {
    title: "Packaging & sustainability",
    eyebrow: "Step 6",
    summary: "Show how your packaging can meet BEEMUN expectations.",
    fields: ["packagingPhilosophy"],
  },
  {
    title: "ZPS 100 fit",
    eyebrow: "Step 7",
    summary: "Reflect on zero plastic, zero synthetic, and full disclosure.",
    fields: ["zpsFit"],
  },
  {
    title: "Review & submit",
    eyebrow: "Step 8",
    summary: "Check everything before sending your maker profile to BEEMUN.",
    fields: [],
  },
]

const labels: Record<string, string> = {
  businessName: "Maker / business name",
  contactName: "Contact name",
  country: "Country",
  makerStory: "Maker story",
  productsToList: "Products you want to list",
  productCategories: "Product categories",
  sourcingPhilosophy: "Making & sourcing",
  ingredientPhilosophy: "Ingredient/material philosophy",
  packagingPhilosophy: "Packaging philosophy",
  zpsFit: "ZPS 100 fit",
}

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
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>("idle")
  const [error, setError] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [values, setValues] = useState<Values>({
    ...initialValues,
    contactName: userName || "",
  })

  const progress = Math.round(((step + 1) / steps.length) * 100)
  const current = steps[step]
  const categoryValue = useMemo(
    () => selectedCategories.join(", "),
    [selectedCategories]
  )

  const update = (key: keyof Values, value: string) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }))
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((item) => item !== category)
        : [...currentCategories, category]
    )
  }

  const validateStep = () => {
    const missing = current.fields.find((field) => {
      if (field === "productCategories") {
        return selectedCategories.length === 0
      }

      return !values[field].trim()
    })

    if (missing) {
      setError(`${labels[missing]} is required before continuing.`)
      return false
    }

    setError("")
    return true
  }

  const next = () => {
    if (!validateStep()) {
      return
    }

    setStep((currentStep) => Math.min(currentStep + 1, steps.length - 1))
  }

  const back = () => {
    setError("")
    setStep((currentStep) => Math.max(currentStep - 1, 0))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!validateStep()) {
      return
    }

    const { firstName, lastName } = splitName(
      values.contactName || userName || ""
    )

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
            public_application_source: "guided-maker-portal-apply",
            beemun_auth_email: userEmail,
            contact_name: values.contactName,
            website_or_instagram: values.website || null,
            product_categories: selectedCategories,
            products_to_list: values.productsToList,
            sourcing_philosophy: values.sourcingPhilosophy,
            ingredient_philosophy: values.ingredientPhilosophy,
            packaging_philosophy: values.packagingPhilosophy,
            zps_fit: values.zpsFit,
            notes: values.notes || null,
          },
          owner_metadata: {
            public_application_source: "guided-maker-portal-apply",
          },
          event_metadata: {
            public_application_source: "guided-maker-portal-apply",
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
      <div className="beemun-onboarding-shell">
        <aside className="beemun-onboarding-sidebar">
          <p className="beemun-eyebrow">Maker application</p>
          <h1>Guided review for accountable makers.</h1>
          <p>
            Save-and-continue through the essentials BEEMUN needs before a maker
            profile can enter review. Product tools stay locked until approval.
          </p>
          <div className="beemun-progress-card">
            <div>
              <span>Step {step + 1} of {steps.length}</span>
              <strong>{progress}%</strong>
            </div>
            <div className="beemun-progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <ol className="beemun-step-list">
            {steps.map((item, index) => (
              <li
                key={item.title}
                className={
                  index < step
                    ? "complete"
                    : index === step
                    ? "current"
                    : "upcoming"
                }
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>
                    {index < step
                      ? "Completed"
                      : index === step
                      ? "Current"
                      : "Upcoming"}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </aside>

        <form className="beemun-wizard-card" onSubmit={handleSubmit}>
          <div className="beemun-wizard-head">
            <p className="beemun-eyebrow">{current.eyebrow}</p>
            <h2>{current.title}</h2>
            <p>{current.summary}</p>
          </div>

          {step === 0 && (
            <div className="beemun-wizard-panel">
              <h3>Before you begin</h3>
              <p>
                BEEMUN reviews maker accountability before product tools unlock.
                You will share your story, sourcing, ingredients, packaging, and
                ZPS 100 fit. This application does not publish products.
              </p>
              <div className="beemun-lock-strip">
                <span>Locked: Products</span>
                <span>Locked: Orders</span>
                <span>Locked: Payouts</span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="beemun-form-grid">
              <label>
                <span>Maker / business name *</span>
                <input
                  value={values.businessName}
                  onChange={(event) => update("businessName", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Contact name *</span>
                <input
                  value={values.contactName}
                  onChange={(event) => update("contactName", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Email</span>
                <input type="email" value={userEmail} disabled />
              </label>
              <label>
                <span>Phone</span>
                <input
                  type="tel"
                  value={values.phone}
                  onChange={(event) => update("phone", event.target.value)}
                />
              </label>
              <label>
                <span>Country *</span>
                <input
                  value={values.country}
                  onChange={(event) => update("country", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Website / Instagram</span>
                <input
                  placeholder="https:// or @handle"
                  value={values.website}
                  onChange={(event) => update("website", event.target.value)}
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <>
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
                <input type="hidden" value={categoryValue} readOnly />
              </fieldset>
              <label>
                <span>Short maker story *</span>
                <textarea
                  rows={5}
                  value={values.makerStory}
                  onChange={(event) => update("makerStory", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>What products do you want to list? *</span>
                <textarea
                  rows={4}
                  value={values.productsToList}
                  onChange={(event) =>
                    update("productsToList", event.target.value)
                  }
                  required
                />
              </label>
            </>
          )}

          {step === 3 && (
            <label>
              <span>Making & sourcing *</span>
              <textarea
                rows={7}
                value={values.sourcingPhilosophy}
                onChange={(event) =>
                  update("sourcingPhilosophy", event.target.value)
                }
                placeholder="Where do materials come from? Who makes the products? What can BEEMUN verify later?"
                required
              />
            </label>
          )}

          {step === 4 && (
            <label>
              <span>Ingredient/material philosophy *</span>
              <textarea
                rows={7}
                value={values.ingredientPhilosophy}
                onChange={(event) =>
                  update("ingredientPhilosophy", event.target.value)
                }
                required
              />
            </label>
          )}

          {step === 5 && (
            <label>
              <span>Packaging philosophy *</span>
              <textarea
                rows={7}
                value={values.packagingPhilosophy}
                onChange={(event) =>
                  update("packagingPhilosophy", event.target.value)
                }
                required
              />
            </label>
          )}

          {step === 6 && (
            <fieldset>
              <legend>Do you believe your products can meet ZPS 100? *</legend>
              <div className="beemun-radio-row">
                {["yes", "no", "not sure"].map((option) => (
                  <label key={option}>
                    <input
                      name="zpsFit"
                      type="radio"
                      value={option}
                      checked={values.zpsFit === option}
                      onChange={(event) => update("zpsFit", event.target.value)}
                      required
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
              <label>
                <span>Notes for BEEMUN</span>
                <textarea
                  rows={4}
                  value={values.notes}
                  onChange={(event) => update("notes", event.target.value)}
                />
              </label>
            </fieldset>
          )}

          {step === 7 && (
            <div className="beemun-review-grid">
              {[
                ["Maker", values.businessName],
                ["Contact", values.contactName],
                ["Country", values.country],
                ["Categories", categoryValue],
                ["ZPS 100 fit", values.zpsFit],
              ].map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value || "Not provided"}</strong>
                </article>
              ))}
              <article className="wide">
                <span>Maker story</span>
                <p>{values.makerStory || "Not provided"}</p>
              </article>
              <article className="wide">
                <span>BEEMUN review lock</span>
                <p>
                  Submitting creates a maker profile with status submitted.
                  BEEMUN must approve the maker before any product tools unlock.
                </p>
              </article>
            </div>
          )}

          {error && (
            <p className="beemun-application-error" role="alert">
              {error}
            </p>
          )}

          <div className="beemun-wizard-actions">
            <button type="button" onClick={back} disabled={step === 0}>
              Back
            </button>
            {step < steps.length - 1 ? (
              <button className="beemun-btn-primary" type="button" onClick={next}>
                Save and continue
              </button>
            ) : (
              <button
                className="beemun-btn-primary"
                type="submit"
                disabled={state === "submitting"}
              >
                {state === "submitting"
                  ? "Submitting..."
                  : "Submit for BEEMUN review"}
              </button>
            )}
          </div>
        </form>
      </div>
    </section>
  )
}
