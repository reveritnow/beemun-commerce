import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { transitionVendor } from "../../../marketplace/helpers"
import { requireBeemunApprovalRole } from "../../../permissions"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }

  const body = (req.body || {}) as Record<string, any>

  if (!body.status) {
    res.status(400).json({ message: "status is required" })
    return
  }

  const vendor = await transitionVendor(req, req.params.id, body.status)

  res.json({ vendor })
}
