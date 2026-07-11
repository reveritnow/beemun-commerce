import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { enforceRateLimit, rateLimitKeyFor } from "../../../rate-limit"
import {
  assertPortalAccess,
  emailFromRequest,
  ProductPortalError,
  resubmitMakerProduct,
} from "../../product-portal-helpers"

const handleError = (res: MedusaResponse, error: unknown) => {
  if (error instanceof ProductPortalError) {
    res.status(error.status).json({ message: error.message, code: error.code })
    return
  }

  res.status(500).json({
    message:
      error instanceof Error
        ? error.message
        : "The product could not be resubmitted for BEEMUN review.",
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    assertPortalAccess(req)
    const email = emailFromRequest(req)

    if (
      !enforceRateLimit(req, res, {
        key: rateLimitKeyFor(req, "maker-product-resubmit", email || req.params.id),
        limit: 20,
        windowMs: 60 * 60_000,
      })
    ) {
      return
    }

    const result = await resubmitMakerProduct(req, req.params.id)

    res.status(201).json(result)
  } catch (error) {
    handleError(res, error)
  }
}
