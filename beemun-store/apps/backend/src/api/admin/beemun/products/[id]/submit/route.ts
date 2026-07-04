import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { submitProductForReview } from "../../../marketplace/helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const review = await submitProductForReview(req, req.params.id)

  res.status(201).json({ product_review: review })
}
