import { MedusaRequest } from "@medusajs/framework/http"
import { ModuleRegistrationName } from "@medusajs/framework/utils"
import { BEEMUN_MARKETPLACE_MODULE } from "../../../modules/marketplace"

type MarketplaceService = Record<string, any>

type RequestBody = Record<string, any>

type VendorContext = {
  vendor: Record<string, any>
  member: Record<string, any> | null
  actorId: string | null
}

const now = () => new Date()

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

export const createVendorFromOnboarding = async (req: MedusaRequest) => {
  const marketplace = marketplaceServiceOf(req)
  const body = bodyOf(req)
  const shouldSubmit = body.submit === true || body.status === "submitted"
  const timestamp = shouldSubmit ? now() : null

  const vendor = await marketplace.createVendors({
    name: body.name,
    handle: body.handle,
    email: body.email,
    phone: body.phone || null,
    description: body.description || null,
    logo_url: body.logo_url || null,
    banner_url: body.banner_url || null,
    website_url: body.website_url || null,
    country_code: body.country_code || null,
    status: shouldSubmit ? "submitted" : "draft",
    submitted_at: timestamp,
    metadata: body.metadata || null,
  })

  let member: Record<string, any> | null = null

  if (body.owner_email || body.email) {
    member = await marketplace.createVendorMembers({
      vendor_id: vendor.id,
      email: body.owner_email || body.email,
      first_name: body.owner_first_name || null,
      last_name: body.owner_last_name || null,
      role: "owner",
      status: "active",
      external_auth_id: actorIdOf(req),
      accepted_at: now(),
      metadata: body.owner_metadata || null,
    })
  }

  await marketplace.createVendorReviewEvents({
    vendor_id: vendor.id,
    from_status: null,
    to_status: vendor.status,
    actor_type: "vendor",
    actor_user_id: actorIdOf(req),
    reason: shouldSubmit ? "Vendor onboarding submitted" : "Vendor draft created",
    notes: body.notes || null,
    metadata: body.event_metadata || null,
  })

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
