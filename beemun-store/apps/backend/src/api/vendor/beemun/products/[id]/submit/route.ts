import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { submitVendorOwnedProduct } from "../../../helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const result = await submitVendorOwnedProduct(req, req.params.id)

  res.status(201).json(result)
}
