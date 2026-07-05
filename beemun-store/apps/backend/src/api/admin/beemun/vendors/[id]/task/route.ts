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
      key: rateLimitKeyFor(req, "admin-maker-task", (req as any).auth_context?.actor_id),
      limit: 60,
      windowMs: 60 * 60_000,
    })
  ) {
    return
  }

  const marketplace = marketplaceServiceOf(req)
  const body = (req.body || {}) as Record<string, any>
  const title = String(body.title || "").trim()

  if (!title) {
    res.status(400).json({ message: "Task title is required." })
    return
  }

  const task = await marketplace.createVendorApplicationTasks({
    vendor_id: req.params.id,
    title,
    description: body.description || null,
    status: "pending",
    requested_by_user_id: (req as any).auth_context?.actor_id || null,
    metadata: body.metadata || null,
  })

  if (body.message) {
    await marketplace.createVendorApplicationMessages({
      vendor_id: req.params.id,
      author_type: "admin",
      author_user_id: (req as any).auth_context?.actor_id || null,
      body: String(body.message),
      internal: false,
      metadata: {
        source: "application_task",
        task_id: task.id,
      },
    })
  }

  res.status(201).json({ task })
}
