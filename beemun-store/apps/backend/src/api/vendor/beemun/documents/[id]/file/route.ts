import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../../../helpers"
import { retrieveStoredDocumentFile } from "../../../document-storage"

const activeStatuses = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
]

const findVendorByEmail = async (
  marketplace: Record<string, any>,
  email: string
) => {
  const vendors = await marketplace.listVendors({ email })

  return (
    vendors.find((item: Record<string, any>) =>
      activeStatuses.includes(item.status)
    ) ||
    vendors[0] ||
    null
  )
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const email = String(req.query.email || "").trim().toLowerCase()
  const documentId = String(req.params.id || "")

  if (!email) {
    res.status(401).json({ message: "Sign in is required." })
    return
  }

  const vendor = await findVendorByEmail(marketplace, email)

  if (!vendor) {
    res.status(404).json({ message: "Maker application was not found." })
    return
  }

  const stored = await retrieveStoredDocumentFile(
    marketplace,
    documentId,
    vendor.id
  )

  if (!stored?.file) {
    res.status(404).json({ message: "Document file was not found." })
    return
  }

  const buffer = Buffer.from(stored.file.content_base64, "base64")

  res.setHeader("Content-Type", stored.file.mime_type)
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${String(stored.file.original_filename).replace(/"/g, "")}"`
  )
  res.setHeader("Content-Length", String(buffer.length))
  res.status(200).send(buffer)
}
