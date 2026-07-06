import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { requireBeemunApprovalRole } from "../../../permissions"
import { submitProductForReview } from "../../../marketplace/helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }

  const review = await submitProductForReview(req, req.params.id)

  res.status(201).json({ product_review: review })
}
