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
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : []

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

const booleanValue = (value: unknown) => value === true || value === "true"

const normalizeMediaFiles = (value: unknown, productId: string) =>
  Array.isArray(value)
    ? value
        .filter((item) => item && typeof item === "object")
        .map((item: Record<string, any>) => {
          const fileId = text(item.file_id || item.id)

          if (!fileId) {
            return null
          }

          return {
            file_id: fileId,
            original_filename: text(item.original_filename),
            mime_type: text(item.mime_type),
            file_size: item.file_size ?? null,
            storage_provider: text(item.storage_provider) || "medusa_file_s3",
            preview_url: `/api/beemun/maker-dashboard/products/${productId}/media/${fileId}`,
            admin_url: `/admin/beemun/products/${productId}/media/${fileId}`,
            public_url: `/store/beemun/products/${productId}/media/${fileId}`,
          }
        })
        .filter(Boolean) as Array<Record<string, any>>
    : []

const resolveFileService = (req: MedusaRequest) => {
  try {
    return req.scope.resolve("file") as Record<string, any>
  } catch {
    return null
  }
}

const deleteDroppedPrivateFiles = async ({
  req,
  previousFiles,
  nextFiles,
}: {
  req: MedusaRequest
  previousFiles: Array<Record<string, any>>
  nextFiles: Array<Record<string, any>>
}) => {
  const fileService = resolveFileService(req)

  if (!fileService || typeof fileService.deleteFiles !== "function") {
    return
  }

  const nextIds = new Set(nextFiles.map((file) => file.file_id).filter(Boolean))
  const droppedIds = previousFiles
    .map((file) => file.file_id)
    .filter((fileId) => fileId && !nextIds.has(fileId))

  for (const fileId of droppedIds) {
    try {
      await fileService.deleteFiles(fileId)
    } catch {
      // Best-effort cleanup. Product save should not fail because an old object was already gone.
    }
  }
}

const buildVariantUpdates = (body: ProductPortalBody) => {
  const rawVariants = Array.isArray(body.variants) ? body.variants : []

  if (!rawVariants.length) {
    return null
  }

  const values = rawVariants
    .map((variant: Record<string, any>, index: number) =>
      text(variant.title) || (index === 0 ? "Default" : `Variant ${index + 1}`)
    )
    .filter(Boolean) as string[]

  return {
    options: [
      {
        title: "Title",
        values,
      },
    ],
    variants: rawVariants.map((variant: Record<string, any>, index: number) => {
      const title = text(variant.title) || (index === 0 ? "Default" : `Variant ${index + 1}`)
      const amount = numberValue(variant.price)
      const currencyCode = String(variant.currency_code || "gbp").trim().toLowerCase()
      const inventoryQuantity = numberValue(variant.inventory_quantity)
      const manageInventory = booleanValue(variant.manage_inventory)
      const allowBackorder = booleanValue(variant.allow_backorder)

      return {
        id: text(variant.id) || undefined,
        title,
        sku: text(variant.sku) || undefined,
        manage_inventory: manageInventory,
        allow_backorder: allowBackorder,
        weight: numberValue(variant.weight),
        length: numberValue(variant.length),
        height: numberValue(variant.height),
        width: numberValue(variant.width),
        options: {
          Title: title,
        },
        prices:
          amount !== undefined
            ? [
                {
                  amount,
                  currency_code: currencyCode,
                },
              ]
            : [],
        metadata: {
          inventory_quantity: inventoryQuantity ?? null,
          beemun_inventory_status:
            inventoryQuantity === undefined
              ? "not_recorded"
              : inventoryQuantity > 0
              ? "in_stock"
              : "out_of_stock",
          continue_selling: allowBackorder,
        },
      }
    }),
  }
}

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
  member: Record<string, any>,
  productId: string
) => {
  const privateMediaFiles = normalizeMediaFiles(body.media_files, productId)
  const privateGalleryUrls = privateMediaFiles.map((file) => file.preview_url)
  const safeExternalGallery = normalizeList(body.gallery_image_urls).filter(
    (url) => !url.includes("/media/")
  )

  return {
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
      gallery_image_urls: privateGalleryUrls.length ? privateGalleryUrls : safeExternalGallery,
      private_media_files: privateMediaFiles,
      storage_provider: privateMediaFiles.length
        ? "medusa_file_s3_private"
        : text(body.media_storage_provider) ||
          ((existingMetadata || {}).media || {}).storage_provider ||
          "external_url_reference",
    },
    inventory: {
      ...((existingMetadata || {}).inventory || {}),
      variants: Array.isArray(body.variants)
        ? body.variants.map((variant: Record<string, any>) => ({
            id: text(variant.id),
            title: text(variant.title),
            sku: text(variant.sku),
            inventory_quantity: numberValue(variant.inventory_quantity) ?? null,
            manage_inventory: booleanValue(variant.manage_inventory),
            allow_backorder: booleanValue(variant.allow_backorder),
          }))
        : ((existingMetadata || {}).inventory || {}).variants || [],
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
  }
}

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

  const previousPrivateFiles = Array.isArray(review.metadata?.media?.private_media_files)
    ? review.metadata.media.private_media_files
    : []
  const metadata = buildReviewMetadata(body, review.metadata, member, productId)
  const privateMediaFiles = Array.isArray(metadata.media?.private_media_files)
    ? metadata.media.private_media_files
    : []
  const variantUpdates = buildVariantUpdates(body)

  await productService.updateProducts(productId, {
    title,
    subtitle: text(body.brand) || undefined,
    description: text(body.long_description) || shortDescription || undefined,
    category_ids: normalizeList(body.category_ids),
    collection_id: text(body.collection_id) || undefined,
    thumbnail: null,
    images: [],
    ...(variantUpdates || {}),
    metadata: {
      ...(product.metadata || {}),
      beemun_vendor_id: context.vendor.id,
      beemun_zps_status: review.status,
      beemun_zps_approved: false,
      beemun_public_visibility_eligible: false,
      maker_brand: text(body.brand),
    },
  })

  await deleteDroppedPrivateFiles({
    req,
    previousFiles: previousPrivateFiles,
    nextFiles: privateMediaFiles,
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

export const archiveMakerProduct = async (
  req: MedusaRequest,
  productId: string
) => {
  const body = bodyOf(req)
  const context = await resolveApprovedMakerProduct(req, productId)
  const { marketplace, productService, member, vendorProduct, review, product } = context

  if (["published"].includes(review.status)) {
    throw new ProductPortalError(
      "Published products must be hidden or unpublished by BEEMUN before maker archiving.",
      409,
      "product_published"
    )
  }

  const timestamp = now()
  const updatedReview = await marketplace.updateProductReviews({
    id: review.id,
    status: "archived",
    public_visibility_eligible: false,
    archived_at: timestamp,
    metadata: {
      ...(review.metadata || {}),
      archived_by_vendor_member_id: member.id,
      archive_reason: text(body.reason),
    },
  })

  await marketplace.createProductReviewEvents({
    product_review_id: review.id,
    from_status: review.status,
    to_status: "archived",
    actor_type: "vendor",
    actor_user_id: member.external_auth_id || null,
    reason: body.reason || "Maker archived product",
    notes: text(body.notes),
    metadata: { vendor_member_id: member.id },
  })

  await productService.updateProducts(productId, {
    thumbnail: null,
    images: [],
    metadata: {
      ...(product.metadata || {}),
      beemun_zps_status: "archived",
      beemun_zps_approved: false,
      beemun_public_visibility_eligible: false,
    },
  })

  return {
    vendor_product: vendorProduct,
    product_review: updatedReview,
    product: await safeProduct(productService, productId),
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
    thumbnail: null,
    images: [],
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
