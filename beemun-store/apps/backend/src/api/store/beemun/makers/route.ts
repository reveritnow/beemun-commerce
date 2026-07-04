import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { listPublicMakers } from "./helpers"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const makers = await listPublicMakers(req)

    res.json({ makers })
  } catch (error) {
    req.scope.resolve("logger").warn(
      `Unable to load public BEEMUN makers: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    )
    res.json({ makers: [] })
  }
}
