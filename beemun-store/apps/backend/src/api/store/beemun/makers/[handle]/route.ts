import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { retrievePublicMakerByHandle } from "../helpers"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const maker = await retrievePublicMakerByHandle(
      req,
      req.params.handle as string
    )

    if (!maker) {
      res.status(404).json({ maker: null })
      return
    }

    res.json({ maker })
  } catch (error) {
    req.scope.resolve("logger").warn(
      `Unable to load public BEEMUN maker: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    )
    res.status(404).json({ maker: null })
  }
}
