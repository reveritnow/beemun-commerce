import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { BEEMUN_MARKETPLACE_MODULE } from "../../../../../../../modules/marketplace"

const sendFile = async (req: MedusaRequest, res: MedusaResponse, fileId: string) => {
  const fileService = req.scope.resolve("file") as Record<string, any>
  const file = await fileService.retrieveFile(fileId)
  const buffer = await fileService.getAsBuffer(fileId)

  res.setHeader("Content-Type", file.mime_type || file.mimeType || "application/octet-stream")
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
  res.send(buffer)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = req.scope.resolve(BEEMUN_MARKETPLACE_MODULE) as Record<string, any>
  const reviews = await marketplace.listProductReviews({
    product_id: req.params.id,
    status: "published",
    public_visibility_eligible: true,
  })

  if (!reviews[0]) {
    res.status(404).json({ message: "Product media is not public." })
    return
  }

  try {
    await sendFile(req, res, req.params.fileId)
  } catch {
    res.status(404).json({ message: "Product media file was not found." })
  }
}

