import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { BEEMUN_MARKETPLACE_MODULE } from "../../../../../../../modules/marketplace"
import { requireBeemunApprovalRole } from "../../../../permissions"

const reviewHasMediaFile = (review: Record<string, any> | undefined, fileId: string) => {
  const files = review?.metadata?.media?.private_media_files

  return Array.isArray(files) && files.some((file) => file?.file_id === fileId || file?.id === fileId)
}

const sendFile = async (req: MedusaRequest, res: MedusaResponse, fileId: string) => {
  const fileService = req.scope.resolve("file") as Record<string, any>
  const file = await fileService.retrieveFile(fileId)
  const buffer = await fileService.getAsBuffer(fileId)

  res.setHeader("Content-Type", file.mime_type || file.mimeType || "application/octet-stream")
  res.setHeader("Cache-Control", "private, max-age=300")
  res.send(buffer)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }

  try {
    const marketplace = req.scope.resolve(BEEMUN_MARKETPLACE_MODULE) as Record<string, any>
    const reviews = await marketplace.listProductReviews({ product_id: req.params.id })

    if (!reviews.some((review) => reviewHasMediaFile(review, req.params.fileId))) {
      res.status(404).json({ message: "Product media file was not found for this product." })
      return
    }

    await sendFile(req, res, req.params.fileId)
  } catch {
    res.status(404).json({ message: "Product media file was not found." })
  }
}
