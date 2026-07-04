import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { publishApprovedProduct } from "../../../marketplace/helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const review = await publishApprovedProduct(req, req.params.id)

  res.json({ product_review: review })
}
