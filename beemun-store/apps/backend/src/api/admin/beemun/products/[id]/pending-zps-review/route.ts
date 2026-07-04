import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { transitionProductReview } from "../../../marketplace/helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const review = await transitionProductReview(req, req.params.id, "pending_zps_review")

  res.json({ product_review: review })
}
