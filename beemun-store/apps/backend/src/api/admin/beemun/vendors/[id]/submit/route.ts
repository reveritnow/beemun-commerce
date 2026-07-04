import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { transitionVendor } from "../../../marketplace/helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const vendor = await transitionVendor(req, req.params.id, "submitted")

  res.json({ vendor })
}
