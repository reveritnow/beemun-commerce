import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requireBeemunApprovalRole } from "../../../permissions"
import { transitionProductReview } from "../../../marketplace/helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }

  const review = await transitionProductReview(req, req.params.id, "rejected")

  res.json({ product_review: review })
}
