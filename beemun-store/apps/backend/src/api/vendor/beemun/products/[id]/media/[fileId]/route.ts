import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import {
  assertPortalAccess,
  emailFromRequest,
  ProductPortalError,
  resolveApprovedMakerProduct,
} from "../../../product-portal-helpers"

const sendFile = async (req: MedusaRequest, res: MedusaResponse, fileId: string) => {
  const fileService = req.scope.resolve("file") as Record<string, any>
  const file = await fileService.retrieveFile(fileId)
  const buffer = await fileService.getAsBuffer(fileId)

  res.setHeader("Content-Type", file.mime_type || file.mimeType || "application/octet-stream")
  res.setHeader("Cache-Control", "private, max-age=300")
  res.send(buffer)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    assertPortalAccess(req)
    const email = emailFromRequest(req)
    await resolveApprovedMakerProduct(req, req.params.id, email)
    await sendFile(req, res, req.params.fileId)
  } catch (error) {
    if (error instanceof ProductPortalError) {
      res.status(error.status).json({ message: error.message, code: error.code })
      return
    }

    res.status(404).json({ message: "Product media file was not found." })
  }
}
