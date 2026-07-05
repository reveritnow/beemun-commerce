import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../../../../../marketplace/helpers"
import { retrieveStoredDocumentFile } from "../../../../../../../vendor/beemun/document-storage"

const safeFilename = (value: unknown) => {
  const name = String(value || "beemun-document").replace(/[^\w.\- ()]/g, "_")
  return name || "beemun-document"
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const vendorId = String(req.params.id || "")
  const documentId = String(req.params.documentId || "")

  const stored = await retrieveStoredDocumentFile(
    marketplace,
    documentId,
    vendorId
  )

  if (!stored?.file) {
    res.status(404).json({ message: "Document file was not found." })
    return
  }

  const buffer = Buffer.from(stored.file.content_base64, "base64")

  res.setHeader("Content-Type", stored.file.mime_type)
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${safeFilename(stored.file.original_filename)}"`
  )
  res.setHeader("Content-Length", String(buffer.length))
  res.status(200).send(buffer)
}
