import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { enforceRateLimit, rateLimitKeyFor } from "../../rate-limit"
import {
  assertPortalAccess,
  emailFromRequest,
  ProductPortalError,
  resolveApprovedMakerProduct,
  updateMakerProductDraft,
} from "../product-portal-helpers"

const handleError = (res: MedusaResponse, error: unknown) => {
  if (error instanceof ProductPortalError) {
    res.status(error.status).json({ message: error.message, code: error.code })
    return
  }

  res.status(500).json({
    message:
      error instanceof Error
        ? error.message
        : "The maker product request could not be completed.",
  })
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    assertPortalAccess(req)
    const email = emailFromRequest(req)

    if (
      !enforceRateLimit(req, res, {
        key: rateLimitKeyFor(req, "maker-product-detail", email || req.params.id),
        limit: 120,
        windowMs: 60_000,
      })
    ) {
      return
    }

    const context = await resolveApprovedMakerProduct(req, req.params.id, email)

    res.json({
      vendor_product: context.vendorProduct,
      product_review: context.review,
      product: context.product,
      events: context.events,
    })
  } catch (error) {
    handleError(res, error)
  }
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  try {
    assertPortalAccess(req)
    const email = emailFromRequest(req)

    if (
      !enforceRateLimit(req, res, {
        key: rateLimitKeyFor(req, "maker-product-update", email || req.params.id),
        limit: 60,
        windowMs: 60 * 60_000,
      })
    ) {
      return
    }

    const result = await updateMakerProductDraft(req, req.params.id)

    res.json(result)
  } catch (error) {
    handleError(res, error)
  }
}
