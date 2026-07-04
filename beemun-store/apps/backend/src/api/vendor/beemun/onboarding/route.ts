import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createVendorFromOnboarding } from "../helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const result = await createVendorFromOnboarding(req)

  res.status(201).json(result)
}
