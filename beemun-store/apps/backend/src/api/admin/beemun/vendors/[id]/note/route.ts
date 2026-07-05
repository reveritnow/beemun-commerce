import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../../../marketplace/helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const body = (req.body || {}) as Record<string, any>
  const note = String(body.note || "").trim()

  if (!note) {
    res.status(400).json({ message: "Review note is required." })
    return
  }

  const vendor = await marketplace.retrieveVendor(req.params.id)
  const notes = [
    ...((vendor.metadata || {}).review_notes || []),
    {
      id: `note_${Date.now()}`,
      note,
      created_at: new Date().toISOString(),
      actor_user_id: (req as any).auth_context?.actor_id || null,
    },
  ]

  const updated = await marketplace.updateVendors({
    id: req.params.id,
    status_reason: note,
    metadata: {
      ...(vendor.metadata || {}),
      review_notes: notes,
    },
  })

  await marketplace.createVendorReviewEvents({
    vendor_id: req.params.id,
    from_status: vendor.status,
    to_status: vendor.status,
    actor_type: "admin",
    actor_user_id: (req as any).auth_context?.actor_id || null,
    reason: "Review note added",
    notes: note,
    metadata: body.metadata || null,
  })

  res.json({ vendor: updated, notes })
}
