"use client"

import { useRouter } from "next/navigation"
import { FormEvent, useMemo, useState } from "react"

type WizardState = "idle" | "submitting" | "error"

type Values = {
  legalBusinessName: string
  brandName: string
  businessType: string
  gstin: string
  website: string
  contactName: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pinCode: string
  makerStory: string
  productsToList: string
  ingredientPhilosophy: string
  packagingPhilosophy: string
  zpsFit: string
  notes: string
  agreementAccepted: boolean
  finalConfirmation: boolean
}

type DocumentState = Record<
  string,
  {
    dataUrl: string | null
    error: string
    fileName: string | null
    fileSize: number | null
    mimeType: string | null
    note: string
    status: "idle" | "uploading" | "uploaded" | "error"
  }
>

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
const MAX_TOTAL_DOCUMENT_BYTES = 3 * 1024 * 1024
const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]

const categories = [
  "Skin & Body",
  "Hair Care",
  "Oils & Butters",
  "Home Essentials",
  "Refill Ready",
  "Other",
]

const businessTypes = [
  "Individual maker",
  "Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Other",
]

const documentTypes = [
  {
    key: "gst_certificate",
    title: "GST certificate",
    requiredWhen: "Required when GSTIN is provided.",
  },
  {
    key: "business_registration",
    title: "Business registration/incorporation proof",
    requiredWhen: "Required for Partnership, LLP, and Private Limited.",
  },
  {
    key: "brand_logo",
    title: "Brand logo",
    requiredWhen: "Optional.",
  },
  {
    key: "certifications",
    title: "Certifications",
    requiredWhen: "Optional if available.",
  },
  {
    key: "supporting_documents",
    title: "Other supporting documents",
    requiredWhen: "Optional if useful for review.",
  },
]

const initialValues: Values = {
  legalBusinessName: "",
  brandName: "",
  businessType: "",
  gstin: "",
  website: "",
  contactName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pinCode: "",
  makerStory: "",
  productsToList: "",
  ingredientPhilosophy: "",
  packagingPhilosophy: "",
  zpsFit: "",
  notes: "",
  agreementAccepted: false,
  finalConfirmation: false,
}

const initialDocuments: DocumentState = documentTypes.reduce((acc, item) => {
  acc[item.key] = {
    dataUrl: null,
    error: "",
    fileName: null,
    fileSize: null,
    mimeType: null,
    note: "",
    status: "idle",
  }
  return acc
}, {} as DocumentState)

const steps = [
  {
    title: "Welcome",
    eyebrow: "Step 1",
    summary: "India-first partner review before any maker tools unlock.",
    fields: [] as Array<keyof Values | "productCategories">,
  },
  {
    title: "Business identity",
    eyebrow: "Step 2",
    summary: "Legal, brand, GST, and primary contact information.",
    fields: [
      "legalBusinessName",
      "brandName",
      "businessType",
      "contactName",
      "phone",
    ],
  },
  {
    title: "Business address",
    eyebrow: "Step 3",
    summary: "Your India business or maker correspondence address.",
    fields: ["addressLine1", "city", "state", "pinCode"],
  },
  {
    title: "Documents",
    eyebrow: "Step 4",
    summary: "Confirm which documents BEEMUN should request during review.",
    fields: [],
  },
  {
    title: "Maker philosophy",
    eyebrow: "Step 5",
    summary: "Explain what you make, how you source, and what customers can trust.",
    fields: [
      "makerStory",
      "productsToList",
      "ingredientPhilosophy",
      "packagingPhilosophy",
      "zpsFit",
      "productCategories",
    ],
  },
  {
    title: "Agreement",
    eyebrow: "Step 6",
    summary: "Confirm the terms that govern this application review.",
    fields: ["agreementAccepted"],
  },
  {
    title: "Review & submit",
    eyebrow: "Step 7",
    summary: "Check the application before sending it to BEEMUN.",
    fields: ["finalConfirmation"],
  },
]

const labels: Record<string, string> = {
  legalBusinessName: "Legal business name",
  brandName: "Brand/public name",
  businessType: "Business type",
  contactName: "Primary contact name",
  phone: "Phone",
  addressLine1: "Address line 1",
  city: "City",
  state: "State",
  pinCode: "PIN code",
  makerStory: "Maker story",
  productsToList: "Products you want to list",
  productCategories: "Product categories",
  ingredientPhilosophy: "Ingredient/material philosophy",
  packagingPhilosophy: "Packaging philosophy",
  zpsFit: "ZPS 100 fit",
  agreementAccepted: "BEEMUN Maker Application Terms",
  finalConfirmation: "Final submission confirmation",
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
  const [documents, setDocuments] = useState<DocumentState>(initialDocuments)
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
  const requiredDocumentKeys = useMemo(() => {
    const required = new Set<string>()

    if (values.gstin.trim()) {
      required.add("gst_certificate")
    }

    if (["Partnership", "LLP", "Private Limited"].includes(values.businessType)) {
      required.add("business_registration")
    }

    return required
  }, [values.businessType, values.gstin])

  const update = (key: keyof Values, value: string | boolean) => {
    setValues((currentValues) => ({ ...currentValues, [key]: value }))
  }

  const updateDocument = (key: string, value: Partial<DocumentState[string]>) => {
    setDocuments((currentDocuments) => ({
      ...currentDocuments,
      [key]: {
        ...currentDocuments[key],
        ...value,
      },
    }))
  }

  const uploadDocument = (key: string, file: File | null) => {
    if (!file) {
      return
    }

    if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type)) {
      updateDocument(key, {
        error: "Upload a PDF, JPG, PNG, or WEBP file.",
        status: "error",
      })
      return
    }

    if (file.size > MAX_DOCUMENT_BYTES) {
      updateDocument(key, {
        error: "File must be 2 MB or smaller.",
        status: "error",
      })
      return
    }

    updateDocument(key, {
      error: "",
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: "uploading",
    })

    const reader = new FileReader()

    reader.onload = () => {
      updateDocument(key, {
        dataUrl: String(reader.result || ""),
        error: "",
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: "uploaded",
      })
    }

    reader.onerror = () => {
      updateDocument(key, {
        dataUrl: null,
        error: "This file could not be read. Try again.",
        status: "error",
      })
    }

    reader.readAsDataURL(file)
  }

  const removeDocument = (key: string) => {
    updateDocument(key, {
      dataUrl: null,
      error: "",
      fileName: null,
      fileSize: null,
      mimeType: null,
      status: "idle",
    })
  }

  const toggleCategory = (category: string) => {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((item) => item !== category)
        : [...currentCategories, category]
    )
  }

  const validateStep = () => {
    if (current.title === "Documents") {
      const missingDocument = documentTypes.find(
        (document) =>
          requiredDocumentKeys.has(document.key) &&
          documents[document.key].status !== "uploaded"
      )

      if (missingDocument) {
        setError(
          `${missingDocument.title} is required for this application. Please upload it before continuing.`
        )
        return false
      }
    }

    const missing = current.fields.find((field) => {
      if (field === "productCategories") {
        return selectedCategories.length === 0
      }

      if (field === "agreementAccepted") {
        return values.agreementAccepted !== true
      }

      const value = values[field]
      return typeof value === "string" ? !value.trim() : !value
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

    if (!values.agreementAccepted) {
      setError("Please accept the BEEMUN Maker Application Terms.")
      return
    }

    if (!values.finalConfirmation) {
      setError("Please confirm this application is ready for BEEMUN review.")
      return
    }

    for (let index = 0; index < steps.length; index++) {
      const missing = steps[index].fields.find((field) => {
        if (field === "productCategories") {
          return selectedCategories.length === 0
        }

        const value = values[field]
        return typeof value === "string" ? !value.trim() : !value
      })

      if (missing) {
        setStep(index)
        setError(`${labels[missing]} is required before submitting.`)
        return
      }
    }

    const missingRequiredDocument = documentTypes.find(
      (document) =>
        requiredDocumentKeys.has(document.key) &&
        documents[document.key].status !== "uploaded"
    )

    if (missingRequiredDocument) {
      setStep(3)
      setError(`${missingRequiredDocument.title} is required before submitting.`)
      return
    }

    const totalDocumentBytes = Object.values(documents).reduce(
      (total, document) => total + (document.fileSize || 0),
      0
    )

    if (totalDocumentBytes > MAX_TOTAL_DOCUMENT_BYTES) {
      setStep(3)
      setError(
        "Uploaded documents are too large together. Please keep the total upload size under 3 MB."
      )
      return
    }

    if (state === "submitting") {
      return
    }

    const { firstName, lastName } = splitName(
      values.contactName || userName || ""
    )
    const acceptedAt = new Date().toISOString()
    const documentReadiness = Object.fromEntries(
      Object.entries(documents).map(([key, document]) => [
        key,
        {
          file_name: document.fileName,
          file_size: document.fileSize,
          mime_type: document.mimeType,
          note: document.note,
          status: document.status,
        },
      ])
    )

    setState("submitting")

    try {
      const response = await fetch("/api/beemun/maker-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.brandName,
          handle: slugify(values.brandName),
          email: userEmail,
          owner_email: userEmail,
          owner_first_name: firstName,
          owner_last_name: lastName,
          phone: values.phone || null,
          website_url: values.website || null,
          country_code: "IN",
          description: values.makerStory,
          submit: true,
          status: "submitted",
          notes: values.notes || null,
          agreement_accepted: true,
          agreement_accepted_at: acceptedAt,
          agreement_version: "maker-application-v1",
          documents: documentTypes
            .filter(
              (item) =>
                documents[item.key].status === "uploaded" ||
                documents[item.key].note
            )
            .map((item) => ({
              document_type: item.key,
              file_name: documents[item.key].fileName,
              file_size: documents[item.key].fileSize,
              file_url: documents[item.key].dataUrl,
              mime_type: documents[item.key].mimeType,
              title: item.title,
              required: requiredDocumentKeys.has(item.key),
              note: documents[item.key].note || null,
            })),
          metadata: {
            public_application_source: "india-maker-approval-journey",
            beemun_auth_email: userEmail,
            legal_business_name: values.legalBusinessName,
            brand_public_name: values.brandName,
            business_type: values.businessType,
            gstin: values.gstin || null,
            contact_name: values.contactName,
            website_or_instagram: values.website || null,
            product_categories: selectedCategories,
            products_to_list: values.productsToList,
            ingredient_philosophy: values.ingredientPhilosophy,
            packaging_philosophy: values.packagingPhilosophy,
            zps_fit: values.zpsFit,
            notes: values.notes || null,
            address: {
              line_1: values.addressLine1,
              line_2: values.addressLine2 || null,
              city: values.city,
              state: values.state,
              pin_code: values.pinCode,
              country_code: "IN",
              country_name: "India",
            },
            document_readiness: documentReadiness,
            required_document_types: Array.from(requiredDocumentKeys),
          },
          owner_metadata: {
            public_application_source: "india-maker-approval-journey",
          },
          event_metadata: {
            public_application_source: "india-maker-approval-journey",
            agreement_version: "maker-application-v1",
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
          <p className="beemun-eyebrow">India Maker Application</p>
          <h1>Partner review before marketplace access.</h1>
          <p>
            BEEMUN currently reviews India-based makers first. Product tools,
            uploads, orders, and payouts stay locked until approval.
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
              <h3>Country: India</h3>
              <p>
                This application is for India-based makers only. BEEMUN reviews
                business identity, documents, maker philosophy, packaging,
                legal/tax readiness, and ZPS 100 fit before unlocking partner
                tools.
              </p>
              <div className="beemun-lock-strip">
                <span>Country locked: India</span>
                <span>Products locked</span>
                <span>Admin approval required</span>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="beemun-form-grid">
              <label>
                <span>Legal business name *</span>
                <input
                  value={values.legalBusinessName}
                  onChange={(event) =>
                    update("legalBusinessName", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                <span>Brand/public name *</span>
                <input
                  value={values.brandName}
                  onChange={(event) => update("brandName", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Business type *</span>
                <select
                  value={values.businessType}
                  onChange={(event) =>
                    update("businessType", event.target.value)
                  }
                  required
                >
                  <option value="">Select business type</option>
                  {businessTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>GSTIN</span>
                <input
                  value={values.gstin}
                  onChange={(event) => update("gstin", event.target.value)}
                  placeholder="Optional for now"
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
              <label>
                <span>Primary contact name *</span>
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
                <span>Phone *</span>
                <input
                  type="tel"
                  value={values.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  required
                />
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="beemun-form-grid">
              <label>
                <span>Address line 1 *</span>
                <input
                  value={values.addressLine1}
                  onChange={(event) => update("addressLine1", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Address line 2</span>
                <input
                  value={values.addressLine2}
                  onChange={(event) => update("addressLine2", event.target.value)}
                />
              </label>
              <label>
                <span>City *</span>
                <input
                  value={values.city}
                  onChange={(event) => update("city", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>State *</span>
                <input
                  value={values.state}
                  onChange={(event) => update("state", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>PIN code *</span>
                <input
                  value={values.pinCode}
                  onChange={(event) => update("pinCode", event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Country</span>
                <input value="India" disabled />
              </label>
            </div>
          )}

          {step === 3 && (
            <div className="beemun-wizard-panel">
              <h3>Upload review documents</h3>
              <p>
                Upload PDF, JPG, PNG, or WEBP files up to 2 MB each. Keep the
                total upload size under 3 MB. Required documents must be
                uploaded before submission. Optional documents can be added now
                or requested later by BEEMUN.
              </p>
              <div className="beemun-document-grid">
                {documentTypes.map((document) => (
                  <article key={document.key}>
                    <div className="beemun-document-head">
                      <strong>{document.title}</strong>
                      <span>
                        {requiredDocumentKeys.has(document.key)
                          ? "Required"
                          : "Optional"}
                      </span>
                    </div>
                    <p>
                      {requiredDocumentKeys.has(document.key)
                        ? "Required for the details you entered."
                        : document.requiredWhen}
                    </p>
                    <label className="beemun-file-drop">
                      <input
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        type="file"
                        onChange={(event) =>
                          uploadDocument(
                            document.key,
                            event.currentTarget.files?.[0] || null
                          )
                        }
                      />
                      <span>
                        {documents[document.key].status === "uploaded"
                          ? "Replace file"
                          : documents[document.key].status === "uploading"
                          ? "Reading file..."
                          : "Choose file"}
                      </span>
                    </label>
                    {documents[document.key].fileName && (
                      <div className="beemun-upload-status">
                        <div>
                          <strong>{documents[document.key].fileName}</strong>
                          <span>
                            {documents[document.key].mimeType || "File"} ·{" "}
                            {Math.max(
                              1,
                              Math.round(
                                (documents[document.key].fileSize || 0) / 1024
                              )
                            )}
                            KB · {documents[document.key].status}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(document.key)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {documents[document.key].error && (
                      <p className="beemun-upload-error">
                        {documents[document.key].error}
                      </p>
                    )}
                    <textarea
                      rows={2}
                      placeholder="Optional note for BEEMUN"
                      value={documents[document.key].note}
                      onChange={(event) =>
                        updateDocument(document.key, { note: event.target.value })
                      }
                    />
                  </article>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
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
                <span>Maker story *</span>
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
              <label>
                <span>Ingredient/material philosophy *</span>
                <textarea
                  rows={5}
                  value={values.ingredientPhilosophy}
                  onChange={(event) =>
                    update("ingredientPhilosophy", event.target.value)
                  }
                  required
                />
              </label>
              <label>
                <span>Packaging philosophy *</span>
                <textarea
                  rows={5}
                  value={values.packagingPhilosophy}
                  onChange={(event) =>
                    update("packagingPhilosophy", event.target.value)
                  }
                  required
                />
              </label>
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
                        onChange={(event) =>
                          update("zpsFit", event.target.value)
                        }
                        required
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                <span>Notes for BEEMUN</span>
                <textarea
                  rows={4}
                  value={values.notes}
                  onChange={(event) => update("notes", event.target.value)}
                />
              </label>
            </>
          )}

          {step === 5 && (
            <div className="beemun-wizard-panel">
              <h3>BEEMUN Maker Application Terms</h3>
              <div className="beemun-agreement-box">
                <p>
                  I confirm the information submitted is accurate to the best of
                  my knowledge. I understand that submitting an application does
                  not guarantee BEEMUN approval.
                </p>
                <p>
                  I understand products require separate ZPS 100 and product
                  approval before public listing. No product can be listed
                  publicly until BEEMUN approves the maker and the product.
                </p>
                <p>
                  BEEMUN may request documents, clarification, packaging
                  evidence, certifications, or compliance details during review.
                </p>
                <p>
                  BEEMUN may reject, suspend, or remove maker access if
                  standards are not met or information is inaccurate.
                </p>
                <p>
                  The maker is responsible for complying with applicable Indian
                  laws, GST/tax rules, packaging requirements, labeling rules,
                  and product-specific regulations.
                </p>
              </div>
              <label className="beemun-inline-check">
                <input
                  type="checkbox"
                  checked={values.agreementAccepted}
                  onChange={(event) =>
                    update("agreementAccepted", event.target.checked)
                  }
                  required
                />
                <span>
                  I have read and agree to the BEEMUN Maker Application Terms.
                </span>
              </label>
            </div>
          )}

          {step === 6 && (
            <div className="beemun-review-grid">
              {[
                ["Legal name", values.legalBusinessName],
                ["Brand", values.brandName],
                ["Business type", values.businessType],
                ["GSTIN", values.gstin || "Not provided"],
                ["Contact", values.contactName],
                ["Country", "India"],
                ["Address", `${values.addressLine1}, ${values.city}, ${values.state} ${values.pinCode}`],
                ["ZPS 100 fit", values.zpsFit],
              ].map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value || "Not provided"}</strong>
                </article>
              ))}
              <article className="wide">
                <span>Documents</span>
                <p>
                  {documentTypes
                    .filter((item) => documents[item.key].status === "uploaded")
                    .map((item) => documents[item.key].fileName || item.title)
                    .join(", ") || "No documents uploaded yet"}
                </p>
              </article>
              <article className="wide">
                <span>Agreement</span>
                <p>
                  Accepted:{" "}
                  {values.agreementAccepted
                    ? "maker-application-v1"
                    : "Not yet accepted"}
                </p>
              </article>
              <article className="wide">
                <span>Final confirmation</span>
                <label className="beemun-inline-check">
                  <input
                    checked={values.finalConfirmation}
                    onChange={(event) =>
                      update("finalConfirmation", event.target.checked)
                    }
                    type="checkbox"
                  />
                  <strong>
                    I confirm this application is ready for BEEMUN review.
                  </strong>
                </label>
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
