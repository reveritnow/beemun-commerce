import { MedusaRequest } from "@medusajs/framework/http"
import {
  ModuleRegistrationName,
  ProductStatus,
} from "@medusajs/framework/utils"
import { BEEMUN_MARKETPLACE_MODULE } from "../../../../modules/marketplace"

type MarketplaceService = Record<string, any>

type ReviewActor = "admin" | "vendor" | "system" | "ai"

type RequestBody = Record<string, any>

const now = () => new Date()

const bodyOf = (req: MedusaRequest): RequestBody => {
  return (req.body || {}) as RequestBody
}

const actorIdOf = (req: MedusaRequest): string | null => {
  const authContext = (req as any).auth_context || {}
  return authContext.actor_id || authContext.auth_identity_id || null
}

export const marketplaceServiceOf = (req: MedusaRequest): MarketplaceService => {
  return req.scope.resolve(BEEMUN_MARKETPLACE_MODULE)
}

export const productServiceOf = (req: MedusaRequest): MarketplaceService => {
  return req.scope.resolve(ModuleRegistrationName.PRODUCT)
}

export const transitionVendor = async (
  req: MedusaRequest,
  vendorId: string,
  toStatus: string
) => {
  const marketplace = marketplaceServiceOf(req)
  const body = bodyOf(req)
  const vendor = await marketplace.retrieveVendor(vendorId)
  const fromStatus = vendor.status
  const timestamp = now()

  const update: RequestBody = {
    id: vendorId,
    status: toStatus,
    status_reason: body.reason || body.status_reason || null,
    metadata: {
      ...(vendor.metadata || {}),
      ...(body.metadata || {}),
    },
  }

  if (toStatus === "submitted") {
    update.submitted_at = timestamp
  }

  if (toStatus === "under_review") {
    update.reviewed_at = timestamp
  }

  if (toStatus === "approved") {
    update.reviewed_at = timestamp
    update.approved_at = timestamp
    update.rejected_at = null
    update.suspended_at = null
  }

  if (toStatus === "suspended") {
    update.suspended_at = timestamp
  }

  if (toStatus === "rejected") {
    update.reviewed_at = timestamp
    update.rejected_at = timestamp
  }

  if (toStatus === "archived") {
    update.archived_at = timestamp
  }

  const updatedVendor = await marketplace.updateVendors(update)

  await marketplace.createVendorReviewEvents({
    vendor_id: vendorId,
    from_status: fromStatus,
    to_status: toStatus,
    actor_type: (body.actor_type || "admin") as ReviewActor,
    actor_user_id: actorIdOf(req),
    reason: body.reason || null,
    notes: body.notes || null,
    metadata: body.event_metadata || null,
  })

  return updatedVendor
}

export const findProductReview = async (
  req: MedusaRequest,
  productId: string
) => {
  const marketplace = marketplaceServiceOf(req)
  const reviews = await marketplace.listProductReviews({
    product_id: productId,
  })

  return reviews[0] || null
}

export const ensureVendorProduct = async (
  req: MedusaRequest,
  productId: string
) => {
  const marketplace = marketplaceServiceOf(req)
  const body = bodyOf(req)

  if (body.vendor_product_id) {
    return marketplace.retrieveVendorProduct(body.vendor_product_id)
  }

  if (!body.vendor_id) {
    throw new Error("vendor_id or vendor_product_id is required")
  }

  const existing = await marketplace.listVendorProducts({
    product_id: productId,
    vendor_id: body.vendor_id,
  })

  if (existing[0]) {
    return existing[0]
  }

  return marketplace.createVendorProducts({
    vendor_id: body.vendor_id,
    product_id: productId,
    relationship_type: body.relationship_type || "maker",
    is_primary: body.is_primary ?? true,
    ownership_started_at: now(),
    metadata: body.vendor_product_metadata || null,
  })
}

export const submitProductForReview = async (
  req: MedusaRequest,
  productId: string
) => {
  const marketplace = marketplaceServiceOf(req)
  const body = bodyOf(req)
  const vendorProduct = await ensureVendorProduct(req, productId)
  const existingReview = await findProductReview(req, productId)
  const timestamp = now()

  const review = existingReview
    ? await marketplace.updateProductReviews({
        id: existingReview.id,
        vendor_product_id: vendorProduct.id,
        product_id: productId,
        status: "submitted",
        public_visibility_eligible: false,
        submitted_at: timestamp,
        change_request: null,
        rejection_reason: null,
        metadata: {
          ...(existingReview.metadata || {}),
          ...(body.metadata || {}),
        },
      })
    : await marketplace.createProductReviews({
        vendor_product_id: vendorProduct.id,
        product_id: productId,
        status: "submitted",
        public_visibility_eligible: false,
        submitted_at: timestamp,
        metadata: body.metadata || null,
      })

  await marketplace.createProductReviewEvents({
    product_review_id: review.id,
    from_status: existingReview?.status || null,
    to_status: "submitted",
    actor_type: (body.actor_type || "admin") as ReviewActor,
    actor_user_id: actorIdOf(req),
    reason: body.reason || null,
    notes: body.notes || null,
    metadata: body.event_metadata || null,
  })

  return review
}

export const transitionProductReview = async (
  req: MedusaRequest,
  productId: string,
  toStatus: string
) => {
  const marketplace = marketplaceServiceOf(req)
  const body = bodyOf(req)
  const review = await findProductReview(req, productId)

  if (!review) {
    throw new Error("Product review not found. Submit the product first.")
  }

  const timestamp = now()
  const update: RequestBody = {
    id: review.id,
    status: toStatus,
    public_visibility_eligible: false,
    metadata: {
      ...(review.metadata || {}),
      ...(body.metadata || {}),
    },
  }

  if (toStatus === "automatic_checks") {
    update.automatic_checks_started_at = timestamp
  }

  if (toStatus === "pending_zps_review") {
    update.automatic_checks_completed_at = timestamp
    update.zps_review_started_at = timestamp
  }

  if (toStatus === "needs_changes") {
    update.change_request = body.change_request || body.reason || null
  }

  if (toStatus === "approved") {
    update.approved_at = timestamp
    update.reviewer_user_id = actorIdOf(req)
    update.zps_score = body.zps_score ?? review.zps_score ?? null
    update.ai_risk_score = body.ai_risk_score ?? review.ai_risk_score ?? null
    update.change_request = null
    update.rejection_reason = null
  }

  if (toStatus === "hidden") {
    update.hidden_at = timestamp
  }

  if (toStatus === "rejected") {
    update.rejected_at = timestamp
    update.rejection_reason = body.rejection_reason || body.reason || null
  }

  if (toStatus === "archived") {
    update.archived_at = timestamp
  }

  const updatedReview = await marketplace.updateProductReviews(update)

  await marketplace.createProductReviewEvents({
    product_review_id: review.id,
    from_status: review.status,
    to_status: toStatus,
    actor_type: (body.actor_type || "admin") as ReviewActor,
    actor_user_id: actorIdOf(req),
    reason: body.reason || null,
    notes: body.notes || null,
    metadata: body.event_metadata || null,
  })

  if (body.quality_signal) {
    await marketplace.createProductQualitySignals({
      product_review_id: review.id,
      ...body.quality_signal,
    })
  }

  return updatedReview
}

export const publishApprovedProduct = async (
  req: MedusaRequest,
  productId: string
) => {
  const marketplace = marketplaceServiceOf(req)
  const productService = productServiceOf(req)
  const body = bodyOf(req)
  const review = await findProductReview(req, productId)

  if (!review || review.status !== "approved") {
    throw new Error("Product must be ZPS approved before publishing.")
  }

  const timestamp = now()
  const product = await productService.retrieveProduct(productId)
  const metadata = {
    ...(product.metadata || {}),
    beemun_zps_status: "approved",
    beemun_zps_approved: true,
    beemun_public_visibility_eligible: true,
    beemun_product_review_id: review.id,
  }

  await productService.updateProducts(productId, {
    status: ProductStatus.PUBLISHED,
    metadata,
  })

  const updatedReview = await marketplace.updateProductReviews({
    id: review.id,
    status: "published",
    public_visibility_eligible: true,
    published_at: timestamp,
    metadata: {
      ...(review.metadata || {}),
      ...(body.metadata || {}),
    },
  })

  await marketplace.createProductReviewEvents({
    product_review_id: review.id,
    from_status: review.status,
    to_status: "published",
    actor_type: (body.actor_type || "admin") as ReviewActor,
    actor_user_id: actorIdOf(req),
    reason: body.reason || null,
    notes: body.notes || null,
    metadata: body.event_metadata || null,
  })

  return updatedReview
}
