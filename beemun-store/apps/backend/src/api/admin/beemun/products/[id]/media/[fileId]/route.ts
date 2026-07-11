import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { requireBeemunApprovalRole } from "../../../../permissions"

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
    await sendFile(req, res, req.params.fileId)
  } catch {
    res.status(404).json({ message: "Product media file was not found." })
  }
}
