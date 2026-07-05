import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../../../marketplace/helpers"
import { requireBeemunApprovalRole } from "../../../permissions"
import { enforceRateLimit, rateLimitKeyFor } from "../../../../../vendor/beemun/rate-limit"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }
  if (
    !enforceRateLimit(req, res, {
      key: rateLimitKeyFor(req, "admin-maker-message", (req as any).auth_context?.actor_id),
      limit: 120,
      windowMs: 60 * 60_000,
    })
  ) {
    return
  }

  const marketplace = marketplaceServiceOf(req)
  const body = (req.body || {}) as Record<string, any>
  const text = String(body.text || "").trim()

  if (!text) {
    res.status(400).json({ message: "Message text is required." })
    return
  }

  const message = await marketplace.createVendorApplicationMessages({
    vendor_id: req.params.id,
    author_type: "admin",
    author_user_id: (req as any).auth_context?.actor_id || null,
    body: text,
    internal: body.internal === true,
    metadata: body.metadata || null,
  })

  res.status(201).json({ message })
}
