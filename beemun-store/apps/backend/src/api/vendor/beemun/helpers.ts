import { MedusaRequest } from "@medusajs/framework/http"
import { ModuleRegistrationName } from "@medusajs/framework/utils"
import { BEEMUN_MARKETPLACE_MODULE } from "../../../modules/marketplace"
import {
  documentHasUpload,
  metadataForUpload,
  storeDocumentUpload,
  uploadFromDocument,
  validateTotalDocumentUploadSize,
} from "./document-storage"

type MarketplaceService = Record<string, any>

type RequestBody = Record<string, any>

type VendorContext = {
  vendor: Record<string, any>
  member: Record<string, any> | null
  actorId: string | null
}

const now = () => new Date()

export class OnboardingError extends Error {
  status: number
  code: string

  constructor(message: string, status = 400, code = "onboarding_error") {
    super(message)
    this.name = "OnboardingError"
    this.status = status
    this.code = code
  }
}

export const bodyOf = (req: MedusaRequest): RequestBody => {
  return (req.body || {}) as RequestBody
}

export const marketplaceServiceOf = (req: MedusaRequest): MarketplaceService => {
  return req.scope.resolve(BEEMUN_MARKETPLACE_MODULE)
}

export const productServiceOf = (req: MedusaRequest): MarketplaceService => {
  return req.scope.resolve(ModuleRegistrationName.PRODUCT)
}

export const actorIdOf = (req: MedusaRequest): string | null => {
  const authContext = (req as any).auth_context || {}
  return authContext.actor_id || authContext.auth_identity_id || null
}

const headerValue = (req: MedusaRequest, name: string): string | null => {
  const value = req.headers[name.toLowerCase()]

  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

export const resolveVendorContext = async (
  req: MedusaRequest
): Promise<VendorContext> => {
  const marketplace = marketplaceServiceOf(req)
  const vendorId = headerValue(req, "x-beemun-vendor-id")
  const memberId = headerValue(req, "x-beemun-member-id")
  const actorId = actorIdOf(req)

  let member: Record<string, any> | null = null
  let vendor: Record<string, any> | null = null

  if (memberId) {
    member = await marketplace.retrieveVendorMember(memberId)
    if (member) {
      vendor = await marketplace.retrieveVendor(member.vendor_id)
    }
  } else if (actorId) {
    const members = await marketplace.listVendorMembers({
      external_auth_id: actorId,
      status: "active",
    })
    member = members[0] || null

    if (member) {
      vendor = await marketplace.retrieveVendor(member.vendor_id)
    }
  }

  if (!vendor && vendorId) {
    vendor = await marketplace.retrieveVendor(vendorId)

    const members = await marketplace.listVendorMembers({
      vendor_id: vendorId,
      status: "active",
    })
    member = members[0] || null
  }

  if (!vendor) {
    throw new Error(
      "Vendor context is required. Provide a vendor session or x-beemun-vendor-id."
    )
  }

  return { vendor, member, actorId }
}

export const assertVendorIsOperable = (vendor: Record<string, any>) => {
  if (["suspended", "rejected", "archived"].includes(vendor.status)) {
    throw new Error(`Vendor is ${vendor.status} and cannot perform this action.`)
  }
}

export const assertVendorCanSubmitProducts = (vendor: Record<string, any>) => {
  if (vendor.status !== "approved") {
    throw new Error("Vendor must be approved before submitting products.")
  }
}

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const shortSuffix = () => {
  return Math.random().toString(36).slice(2, 8)
}

const normalizeEmail = (value?: string | null) => {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

const nullableString = (value?: unknown) => {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

const readErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error || "")
}

const metadataObject = (value: unknown) => {
  if (!value) {
    return {}
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new OnboardingError(
      "Some maker application details are not in the expected format. Please refresh and try again.",
      400,
      "invalid_metadata"
    )
  }

  return value as Record<string, unknown>
}

const normalizeCountryCode = (value?: unknown) => {
  if (!value) {
    return "IN"
  }

  if (typeof value !== "string") {
    throw new OnboardingError(
      "Please enter a valid country for your maker application.",
      400,
      "invalid_country"
    )
  }

  const country = value.trim()

  if (!country) {
    return "IN"
  }

  if (/^[a-z]{2}$/i.test(country)) {
    const code = country.toLowerCase()

    if (code !== "in") {
      throw new OnboardingError(
        "BEEMUN maker applications are currently open for India only.",
        400,
        "unsupported_country"
      )
    }

    return "IN"
  }

  if (country.toLowerCase() === "india") {
    return "IN"
  }

  throw new OnboardingError(
    "BEEMUN maker applications are currently open for India only.",
    400,
    "unsupported_country"
  )
}

const validateOnboardingBody = (body: RequestBody) => {
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    throw new OnboardingError(
      "Maker / business name is required.",
      400,
      "missing_name"
    )
  }

  if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
    throw new OnboardingError("Email is required.", 400, "missing_email")
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    throw new OnboardingError("A valid email is required.", 400, "invalid_email")
  }

  if (body.handle && typeof body.handle !== "string") {
    throw new OnboardingError(
      "Maker handle must be text.",
      400,
      "invalid_handle"
    )
  }

  if (body.agreement_accepted !== true) {
    throw new OnboardingError(
      "Please accept the BEEMUN Maker Application Terms before submitting.",
      400,
      "agreement_required"
    )
  }
}

const requiredDocumentTypesFor = (
  metadata: Record<string, unknown>,
  body: RequestBody
) => {
  const required = new Set<string>()
  const businessType = String(metadata.business_type || "")

  if (nullableString(metadata.gstin)) {
    required.add("gst_certificate")
  }

  if (["Partnership", "LLP", "Private Limited"].includes(businessType)) {
    required.add("business_registration")
  }

  if (Array.isArray(metadata.required_document_types)) {
    for (const item of metadata.required_document_types) {
      if (typeof item === "string" && item.trim()) {
        required.add(item.trim())
      }
    }
  }

  if (Array.isArray(body.required_document_types)) {
    for (const item of body.required_document_types) {
      if (typeof item === "string" && item.trim()) {
        required.add(item.trim())
      }
    }
  }

  return required
}

const validateRequiredDocumentReadiness = (
  metadata: Record<string, unknown>,
  body: RequestBody,
  documents: unknown[]
) => {
  const required = requiredDocumentTypesFor(metadata, body)

  if (!required.size) {
    return
  }

  const providedTypes = new Set(
    documents
      .filter((item) => item && typeof item === "object")
      .filter((item) => documentHasUpload(item as Record<string, any>))
      .map((item) => nullableString((item as Record<string, unknown>).document_type))
      .filter(Boolean) as string[]
  )

  const missing = Array.from(required).filter((type) => !providedTypes.has(type))

  if (missing.length) {
    throw new OnboardingError(
      `Please upload these required documents before submitting: ${missing.join(", ")}.`,
      400,
      "missing_required_documents"
    )
  }
}

const ensurePublicApplicationEmailIsNew = async (
  marketplace: MarketplaceService,
  body: RequestBody
) => {
  const email = normalizeEmail(body.owner_email || body.email)

  if (!email) {
    return
  }

  const existingVendors = await marketplace.listVendors({ email })
  const activeApplication = existingVendors.find((vendor: Record<string, any>) =>
    ["draft", "submitted", "under_review", "approved"].includes(vendor.status)
  )

  if (activeApplication) {
    throw new OnboardingError(
      "A maker application with this email already exists. Please contact BEEMUN if you need to update it.",
      409,
      "duplicate_email"
    )
  }
}

const resolveUniqueVendorHandle = async (
  marketplace: MarketplaceService,
  body: RequestBody
) => {
  const requestedHandle =
    typeof body.handle === "string" && body.handle.trim()
      ? body.handle
      : body.name
  const baseHandle = slugify(requestedHandle) || `maker-${shortSuffix()}`
  const existing = await marketplace.listVendors({ handle: baseHandle })

  if (!existing.length) {
    return baseHandle
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${baseHandle}-${shortSuffix()}`
    const matches = await marketplace.listVendors({ handle: candidate })

    if (!matches.length) {
      return candidate
    }
  }

  throw new OnboardingError(
    "A maker with this name already exists. Please adjust the maker name or contact BEEMUN.",
    409,
    "duplicate_handle"
  )
}

export const onboardingErrorFromUnknown = (error: unknown) => {
  if (error instanceof OnboardingError) {
    return error
  }

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "code" in error &&
    error instanceof Error
  ) {
    return new OnboardingError(
      error.message,
      Number((error as any).status) || 400,
      String((error as any).code || "onboarding_error")
    )
  }

  const message = error instanceof Error ? error.message : String(error || "")
  const normalized = message.toLowerCase()

  if (
    normalized.includes("idx_beemun_vendor_handle_unique") ||
    normalized.includes("beemun_vendor_handle_unique") ||
    (normalized.includes("duplicate") && normalized.includes("handle"))
  ) {
    return new OnboardingError(
      "A maker with this name already exists. Please adjust the maker name or contact BEEMUN.",
      409,
      "duplicate_handle"
    )
  }

  if (
    normalized.includes("idx_beemun_vendor_email") ||
    (normalized.includes("duplicate") && normalized.includes("email"))
  ) {
    return new OnboardingError(
      "A maker application with this email already exists. Please contact BEEMUN if you need to update it.",
      409,
      "duplicate_email"
    )
  }

  if (normalized.includes("country") || normalized.includes("country_code")) {
    return new OnboardingError(
      "BEEMUN maker applications are currently open for India only.",
      400,
      "unsupported_country"
    )
  }

  if (
    normalized.includes("beemun_vendor_document") ||
    normalized.includes("vendor document") ||
    normalized.includes("vendor_documents")
  ) {
    return new OnboardingError(
      "The maker application was saved, but BEEMUN could not save document placeholders. Please open My Application and add document notes there.",
      202,
      "document_placeholder_error"
    )
  }

  if (
    normalized.includes("not-null") ||
    normalized.includes("null value") ||
    normalized.includes("violates not-null")
  ) {
    return new OnboardingError(
      "Please complete all required maker application fields.",
      400,
      "missing_required_field"
    )
  }

  if (
    normalized.includes("validation") ||
    normalized.includes("invalid input") ||
    normalized.includes("check constraint")
  ) {
    return new OnboardingError(
      "Some maker application details are invalid. Please review the form and try again.",
      400,
      "database_validation"
    )
  }

  if (
    normalized.includes("beemun_vendor") ||
    normalized.includes("vendor") ||
    normalized.includes("marketplace")
  ) {
    return new OnboardingError(
      "BEEMUN could not save this maker application. Please review the maker details and try again.",
      400,
      "marketplace_service_error"
    )
  }

  return new OnboardingError(
    message
      ? `The maker application could not be submitted: ${message}`
      : "The maker application could not be submitted. Please try again or contact BEEMUN.",
    500,
    "unexpected_onboarding_error"
  )
}

export const createVendorFromOnboarding = async (req: MedusaRequest) => {
  const marketplace = marketplaceServiceOf(req)
  const body = bodyOf(req)
  validateOnboardingBody(body)
  await ensurePublicApplicationEmailIsNew(marketplace, body)
  const handle = await resolveUniqueVendorHandle(marketplace, body)
  const shouldSubmit = body.submit === true || body.status === "submitted"
  const timestamp = shouldSubmit ? now() : null
  const applicationCountry = "India"
  const countryCode = normalizeCountryCode(body.country_code)
  const metadata = metadataObject(body.metadata)
  const documents = Array.isArray(body.documents) ? body.documents : []
  validateRequiredDocumentReadiness(metadata, body, documents)
  validateTotalDocumentUploadSize(documents)

  const vendor = await marketplace.createVendors({
    name: body.name.trim(),
    handle,
    email: normalizeEmail(body.email),
    phone: nullableString(body.phone),
    description: nullableString(body.description),
    logo_url: nullableString(body.logo_url),
    banner_url: nullableString(body.banner_url),
    website_url: nullableString(body.website_url),
    country_code: countryCode,
    status: shouldSubmit ? "submitted" : "draft",
    submitted_at: timestamp,
    metadata: {
      ...metadata,
      application_country: applicationCountry,
      country_name: "India",
      agreement_accepted: true,
      agreement_accepted_at:
        nullableString(body.agreement_accepted_at) || now().toISOString(),
      agreement_version:
        nullableString(body.agreement_version) || "maker-application-v1",
      requested_handle: body.handle || null,
    },
  })

  let member: Record<string, any> | null = null

  if (body.owner_email || body.email) {
    member = await marketplace.createVendorMembers({
      vendor_id: vendor.id,
      email: normalizeEmail(body.owner_email || body.email),
      first_name: nullableString(body.owner_first_name),
      last_name: nullableString(body.owner_last_name),
      role: "owner",
      status: "active",
      external_auth_id: actorIdOf(req),
      accepted_at: now(),
      metadata: body.owner_metadata ? metadataObject(body.owner_metadata) : null,
    })
  }

  await marketplace.createVendorReviewEvents({
    vendor_id: vendor.id,
    from_status: null,
    to_status: vendor.status,
    actor_type: "vendor",
    actor_user_id: actorIdOf(req),
    reason: shouldSubmit ? "Vendor onboarding submitted" : "Vendor draft created",
    notes: nullableString(body.notes),
    metadata: body.event_metadata ? metadataObject(body.event_metadata) : null,
  })

  const documentErrors: string[] = []

  for (const item of documents) {
    try {
      if (!item || typeof item !== "object") {
        continue
      }

      const document = item as Record<string, any>
      const title = nullableString(document.title)
      const documentType = nullableString(document.document_type)
      const upload = uploadFromDocument(document)

      if (!title || !documentType) {
        continue
      }

      const vendorDocument = await marketplace.createVendorDocuments({
        vendor_id: vendor.id,
        document_type: documentType,
        title,
        file_url: upload ? `beemun-document://pending` : nullableString(document.file_url),
        status: upload || document.file_url ? "submitted" : "draft",
        metadata: {
          source: "maker_application",
          ...metadataForUpload(upload, {
            applicant_note: nullableString(document.note),
            required: document.required === true,
          }),
          applicant_note: nullableString(document.note),
          required: document.required === true,
        },
      })

      await storeDocumentUpload({
        marketplace,
        document: vendorDocument,
        upload,
        source: "maker_application",
      })
    } catch (error) {
      documentErrors.push(readErrorMessage(error))
    }
  }

  if (documentErrors.length) {
    await marketplace.updateVendors({
      id: vendor.id,
      metadata: {
        ...(vendor.metadata || {}),
        document_placeholder_error:
          "Document placeholders could not be saved during application submit.",
        document_placeholder_error_detail: documentErrors.join("; "),
      },
    })
  }

  return { vendor, member }
}

export const submitVendorOwnedProduct = async (
  req: MedusaRequest,
  productId: string
) => {
  const marketplace = marketplaceServiceOf(req)
  const productService = productServiceOf(req)
  const body = bodyOf(req)
  const { vendor, member, actorId } = await resolveVendorContext(req)

  assertVendorIsOperable(vendor)
  assertVendorCanSubmitProducts(vendor)

  await productService.retrieveProduct(productId)

  const vendorProducts = await marketplace.listVendorProducts({
    vendor_id: vendor.id,
    product_id: productId,
  })

  const vendorProduct =
    vendorProducts[0] ||
    (await marketplace.createVendorProducts({
      vendor_id: vendor.id,
      product_id: productId,
      relationship_type: body.relationship_type || "maker",
      is_primary: body.is_primary ?? true,
      ownership_started_at: now(),
      metadata: body.vendor_product_metadata || null,
    }))

  const existingReviews = await marketplace.listProductReviews({
    vendor_product_id: vendorProduct.id,
  })
  const existingReview = existingReviews[0] || null
  const timestamp = now()

  const review = existingReview
    ? await marketplace.updateProductReviews({
        id: existingReview.id,
        status: "submitted",
        public_visibility_eligible: false,
        submitted_at: timestamp,
        change_request: null,
        rejection_reason: null,
        metadata: {
          ...(existingReview.metadata || {}),
          ...(body.metadata || {}),
          submitted_by_vendor_member_id: member?.id || null,
        },
      })
    : await marketplace.createProductReviews({
        vendor_product_id: vendorProduct.id,
        product_id: productId,
        status: "submitted",
        public_visibility_eligible: false,
        submitted_at: timestamp,
        metadata: {
          ...(body.metadata || {}),
          submitted_by_vendor_member_id: member?.id || null,
        },
      })

  await marketplace.createProductReviewEvents({
    product_review_id: review.id,
    from_status: existingReview?.status || null,
    to_status: "submitted",
    actor_type: "vendor",
    actor_user_id: actorId,
    reason: body.reason || "Vendor submitted product for BEEMUN review",
    notes: body.notes || null,
    metadata: body.event_metadata || null,
  })

  return { vendor_product: vendorProduct, product_review: review }
}
