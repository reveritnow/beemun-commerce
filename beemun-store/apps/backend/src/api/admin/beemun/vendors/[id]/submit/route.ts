import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { transitionVendor } from "../../../marketplace/helpers"
import { requireBeemunApprovalRole } from "../../../permissions"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }

  const vendor = await transitionVendor(req, req.params.id, "submitted")

  res.json({ vendor })
}
