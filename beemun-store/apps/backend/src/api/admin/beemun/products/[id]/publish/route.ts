import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requireBeemunApprovalRole } from "../../../permissions"
import { publishApprovedProduct } from "../../../marketplace/helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }

  const review = await publishApprovedProduct(req, req.params.id)

  res.json({ product_review: review })
}
