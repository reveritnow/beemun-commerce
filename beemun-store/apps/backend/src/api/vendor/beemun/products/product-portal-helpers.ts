import { MedusaRequest } from "@medusajs/framework/http"

import {
  assertPortalDocumentAccess,
  DocumentUploadError,
} from "../document-storage"
import {
  assertVendorCanSubmitProducts,
  assertVendorIsOperable,
  marketplaceServiceOf,
  productServiceOf,
} from "../helpers"

export type ProductPortalBody = Record<string, any>

const now = () => new Date()

export const editableReviewStatuses = ["draft", "needs_changes"]

export const reviewStatusLabels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  automatic_checks: "Automatic Checks",
  pending_zps_review: "Pending ZPS Review",
  needs_changes: "Needs Changes",
  approved: "Approved",
  rejected: "Rejected",
  published: "Published",
  hidden: "Hidden",
  archived: "Archived",
}

export class ProductPortalError extends Error {
  status: number
  code: string

  constructor(message: string, status = 400, code = "product_portal_error") {
    super(message)
    this.status = status
    this.code = code
  }
}

export const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null

export const normalizeList = (value: unknown) =>
  Array.isArray(value)
    ? value
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => item.trim())
    : []

export const bodyOf = (req: MedusaRequest): ProductPortalBody =>
  (req.body || {}) as ProductPortalBody

export const assertPortalAccess = (req: MedusaRequest) => {
  try {
    assertPortalDocumentAccess(req.headers)
  } catch (error) {
    if (error instanceof DocumentUploadError) {
      throw new ProductPortalError(error.message, error.status, error.code)
    }

    throw error
  }
}

export const emailFromRequest = (req: MedusaRequest) => {
  const body = bodyOf(req)
  return String(body.email || req.query.email || "").trim().toLowerCase()
}

export const safeProduct = async (
  productService: Record<string, any>,
  productId: string
) => {
  try {
    return await productService.retrieveProduct(productId, {
      relations: [
        "variants",
        "variants.options",
        "variants.prices",
        "images",
        "categories",
        "collection",
        "options",
      ],
    })
  } catch {
    return await productService.retrieveProduct(productId)
  }
}

export const resolveApprovedMakerProduct = async (
  req: MedusaRequest,
  productId: string,
  email?: string
) => {
  const makerEmail = (email || emailFromRequest(req)).trim().toLowerCase()

  if (!makerEmail) {
    throw new ProductPortalError("Maker email is required.", 400, "missing_email")
  }

  const marketplace = marketplaceServiceOf(req)
  const productService = productServiceOf(req)
  const members = await marketplace.listVendorMembers({
    email: makerEmail,
    status: "active",
  })
  const member = members[0] || null

  if (!member) {
    throw new ProductPortalError("Approved maker access is required.", 403, "maker_required")
  }

  const vendor = await marketplace.retrieveVendor(member.vendor_id)

  if (vendor.status !== "approved") {
    throw new ProductPortalError("Approved maker access is required.", 403, "maker_not_approved")
  }

  assertVendorIsOperable(vendor)
  assertVendorCanSubmitProducts(vendor)

  const vendorProducts = await marketplace.listVendorProducts({
    vendor_id: vendor.id,
    product_id: productId,
  })
  const vendorProduct = vendorProducts[0] || null

  if (!vendorProduct) {
    throw new ProductPortalError(
      "This product is not linked to your BEEMUN maker profile.",
      404,
      "product_not_owned"
    )
  }

  const reviews = await marketplace.listProductReviews({
    vendor_product_id: vendorProduct.id,
  })
  const review = reviews[0] || null

  if (!review) {
    throw new ProductPortalError(
      "This product has not entered BEEMUN review yet.",
      404,
      "review_not_found"
    )
  }

  const [product, events] = await Promise.all([
    safeProduct(productService, productId),
    marketplace.listProductReviewEvents({ product_review_id: review.id }),
  ])

  return { marketplace, productService, vendor, member, vendorProduct, review, product, events }
}

export const buildReviewMetadata = (
  body: ProductPortalBody,
  existingMetadata: Record<string, any> | null | undefined,
  member: Record<string, any>
) => ({
  ...(existingMetadata || {}),
  source: "maker_dashboard_product_editor",
  updated_by_vendor_member_id: member.id,
  basic_information: {
    ...((existingMetadata || {}).basic_information || {}),
    brand: text(body.brand),
    short_description: text(body.short_description),
    long_description: text(body.long_description),
  },
  taxonomy: {
    ...((existingMetadata || {}).taxonomy || {}),
    category_ids: normalizeList(body.category_ids),
    collection_id: text(body.collection_id),
    product_type: text(body.product_type),
    tags: normalizeList(body.tags),
  },
  media: {
    ...((existingMetadata || {}).media || {}),
    cover_image_url: text(body.cover_image_url),
    gallery_image_urls: normalizeList(body.gallery_image_urls),
    storage_provider:
      ((existingMetadata || {}).media || {}).storage_provider ||
      "external_url_until_file_provider_enabled",
  },
  beemun_product_information: {
    ...((existingMetadata || {}).beemun_product_information || {}),
    ingredients: text(body.ingredients),
    materials: text(body.materials),
    packaging: text(body.packaging),
    usage: text(body.usage),
    care_instructions: text(body.care_instructions),
    certifications: text(body.certifications),
    claims: text(body.claims),
    warnings: text(body.warnings),
  },
})

export const updateMakerProductDraft = async (
  req: MedusaRequest,
  productId: string
) => {
  const body = bodyOf(req)
  const context = await resolveApprovedMakerProduct(req, productId)
  const { marketplace, productService, member, vendorProduct, review, product } = context

  if (!editableReviewStatuses.includes(review.status)) {
    throw new ProductPortalError(
      `This product is ${reviewStatusLabels[review.status] || review.status} and cannot be edited right now.`,
      409,
      "product_locked"
    )
  }

  const title = text(body.title)
  const shortDescription = text(body.short_description)

  if (!title) {
    throw new ProductPortalError("Product name is required.", 400, "missing_title")
  }

  if (!shortDescription) {
    throw new ProductPortalError(
      "Short description is required.",
      400,
      "missing_short_description"
    )
  }

  const galleryImageUrls = normalizeList(body.gallery_image_urls)
  const coverImageUrl = text(body.cover_image_url) || galleryImageUrls[0] || null
  const metadata = buildReviewMetadata(body, review.metadata, member)

  await productService.updateProducts(productId, {
    title,
    subtitle: text(body.brand) || undefined,
    description: text(body.long_description) || shortDescription || undefined,
    category_ids: normalizeList(body.category_ids),
    collection_id: text(body.collection_id) || undefined,
    thumbnail: coverImageUrl || undefined,
    images: galleryImageUrls.map((url) => ({ url })),
    metadata: {
      ...(product.metadata || {}),
      beemun_vendor_id: context.vendor.id,
      beemun_zps_status: review.status,
      beemun_zps_approved: false,
      beemun_public_visibility_eligible: false,
      maker_brand: text(body.brand),
    },
  })

  const updatedReview = await marketplace.updateProductReviews({
    id: review.id,
    status: review.status,
    public_visibility_eligible: false,
    metadata,
  })

  const updatedProduct = await safeProduct(productService, productId)

  return {
    vendor_product: vendorProduct,
    product_review: updatedReview,
    product: updatedProduct,
  }
}

export const resubmitMakerProduct = async (
  req: MedusaRequest,
  productId: string
) => {
  const body = bodyOf(req)
  const context = await resolveApprovedMakerProduct(req, productId)
  const { marketplace, productService, member, vendorProduct, review, product } = context

  if (!editableReviewStatuses.includes(review.status)) {
    throw new ProductPortalError(
      `This product is ${reviewStatusLabels[review.status] || review.status} and cannot be resubmitted right now.`,
      409,
      "product_locked"
    )
  }

  const timestamp = now()
  const updatedReview = await marketplace.updateProductReviews({
    id: review.id,
    status: "submitted",
    public_visibility_eligible: false,
    submitted_at: timestamp,
    change_request: null,
    rejection_reason: null,
    metadata: {
      ...(review.metadata || {}),
      resubmitted_by_vendor_member_id: member.id,
      last_resubmitted_at: timestamp.toISOString(),
    },
  })

  await marketplace.createProductReviewEvents({
    product_review_id: review.id,
    from_status: review.status,
    to_status: "submitted",
    actor_type: "vendor",
    actor_user_id: member.external_auth_id || null,
    reason: body.reason || "Maker resubmitted product for BEEMUN review",
    notes: text(body.notes),
    metadata: {
      vendor_member_id: member.id,
      product_handle: product.handle || null,
    },
  })

  await productService.updateProducts(productId, {
    metadata: {
      ...(product.metadata || {}),
      beemun_zps_status: "submitted",
      beemun_zps_approved: false,
      beemun_public_visibility_eligible: false,
    },
  })

  const updatedProduct = await safeProduct(productService, productId)

  return {
    vendor_product: vendorProduct,
    product_review: updatedReview,
    product: updatedProduct,
  }
}
