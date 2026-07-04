import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { transitionVendor } from "../../../marketplace/helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as Record<string, any>

  if (!body.status) {
    res.status(400).json({ message: "status is required" })
    return
  }

  const vendor = await transitionVendor(req, req.params.id, body.status)

  res.json({ vendor })
}
