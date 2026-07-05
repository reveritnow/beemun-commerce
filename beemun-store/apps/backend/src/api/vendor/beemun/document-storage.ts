type MarketplaceService = Record<string, any>

export type DocumentUploadPayload = {
  content_base64?: unknown
  file_size?: unknown
  mime_type?: unknown
  original_filename?: unknown
}

export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024
export const MAX_TOTAL_DOCUMENT_BYTES = 3 * 1024 * 1024
export const ACCEPTED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]

export class DocumentUploadError extends Error {
  status: number
  code: string

  constructor(message: string, status = 400, code = "document_upload_error") {
    super(message)
    this.name = "DocumentUploadError"
    this.status = status
    this.code = code
  }
}

export const normalizeDocumentUpload = (
  upload?: DocumentUploadPayload | null
) => {
  if (!upload || typeof upload !== "object") {
    return null
  }

  const content = String(upload.content_base64 || "").trim()
  const mimeType = String(upload.mime_type || "").trim()
  const originalFilename = String(upload.original_filename || "").trim()
  const fileSize =
    typeof upload.file_size === "number"
      ? upload.file_size
      : Number(upload.file_size || Number.NaN)

  if (!content && !mimeType && !originalFilename) {
    return null
  }

  if (!content || !/^[A-Za-z0-9+/=]+$/.test(content)) {
    throw new DocumentUploadError(
      "Uploaded document data is invalid. Please replace the file and try again.",
      400,
      "invalid_document_data"
    )
  }

  const decodedSize = Buffer.byteLength(content, "base64")

  if (!decodedSize || decodedSize !== fileSize) {
    throw new DocumentUploadError(
      "Uploaded document size does not match the file data. Please replace the file and try again.",
      400,
      "invalid_document_size"
    )
  }

  if (!originalFilename) {
    throw new DocumentUploadError(
      "Uploaded document filename is missing.",
      400,
      "invalid_document_filename"
    )
  }

  if (!ACCEPTED_DOCUMENT_TYPES.includes(mimeType)) {
    throw new DocumentUploadError(
      "Uploaded documents must be PDF, JPG, PNG, or WEBP files.",
      400,
      "invalid_document_type"
    )
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    throw new DocumentUploadError(
      "Uploaded document size is missing or invalid.",
      400,
      "invalid_document_size"
    )
  }

  if (fileSize > MAX_DOCUMENT_BYTES) {
    throw new DocumentUploadError(
      "Each uploaded document must be 2 MB or smaller.",
      400,
      "document_too_large"
    )
  }

  return {
    content_base64: content,
    file_size: fileSize,
    mime_type: mimeType,
    original_filename: originalFilename,
  }
}

export const uploadFromDocument = (document: Record<string, any>) => {
  return normalizeDocumentUpload(document.upload as DocumentUploadPayload | null)
}

export const validateTotalDocumentUploadSize = (documents: unknown[]) => {
  const total = documents.reduce<number>((sum, item) => {
    if (!item || typeof item !== "object") {
      return sum
    }

    const upload = normalizeDocumentUpload(
      (item as Record<string, any>).upload as DocumentUploadPayload | null
    )

    return sum + (upload?.file_size || 0)
  }, 0)

  if (total > MAX_TOTAL_DOCUMENT_BYTES) {
    throw new DocumentUploadError(
      "Uploaded documents are too large together. Please keep total uploads under 3 MB.",
      400,
      "documents_too_large"
    )
  }
}

export const documentHasUpload = (document: Record<string, any>) => {
  return Boolean(uploadFromDocument(document))
}

export const assertPortalDocumentAccess = (headers: Record<string, any>) => {
  const configuredSecret = process.env.BEEMUN_PORTAL_API_SECRET
  const providedSecret = Array.isArray(headers["x-beemun-portal-secret"])
    ? headers["x-beemun-portal-secret"][0]
    : headers["x-beemun-portal-secret"]

  if (!configuredSecret) {
    throw new DocumentUploadError(
      "BEEMUN document access is not configured.",
      503,
      "document_access_not_configured"
    )
  }

  if (providedSecret !== configuredSecret) {
    throw new DocumentUploadError(
      "Document access is not authorized.",
      403,
      "document_access_denied"
    )
  }
}

export const metadataForUpload = (
  upload: ReturnType<typeof normalizeDocumentUpload> | null,
  extra: Record<string, any> = {}
) => ({
  ...extra,
  original_filename: upload?.original_filename || null,
  mime_type: upload?.mime_type || null,
  file_size: upload?.file_size || null,
  storage_provider: upload ? "database_mvp" : null,
  storage_status: upload ? "stored" : "missing",
})

export const storeDocumentUpload = async ({
  marketplace,
  document,
  upload,
  source,
}: {
  marketplace: MarketplaceService
  document: Record<string, any>
  upload: ReturnType<typeof normalizeDocumentUpload>
  source: string
}) => {
  if (!upload) {
    return null
  }

  const existing = await marketplace.listVendorDocumentFiles({
    document_id: document.id,
  })

  for (const file of existing) {
    await marketplace.deleteVendorDocumentFiles(file.id)
  }

  const storageKey = `beemun/vendor-documents/${document.vendor_id}/${document.id}`
  const file = await marketplace.createVendorDocumentFiles({
    document_id: document.id,
    vendor_id: document.vendor_id,
    storage_provider: "database_mvp",
    storage_key: storageKey,
    original_filename: upload.original_filename,
    mime_type: upload.mime_type,
    file_size: upload.file_size,
    content_base64: upload.content_base64,
    metadata: {
      source,
      replaceable_storage: true,
    },
  })

  await marketplace.updateVendorDocuments({
    id: document.id,
    file_url: `beemun-document://${document.id}`,
    status: "submitted",
    metadata: {
      ...(document.metadata || {}),
      ...metadataForUpload(upload, {
        ...(document.metadata || {}),
        storage_key: storageKey,
      }),
    },
  })

  return file
}

export const retrieveStoredDocumentFile = async (
  marketplace: MarketplaceService,
  documentId: string,
  vendorId?: string | null
) => {
  const documents = await marketplace.listVendorDocuments(
    vendorId ? { id: documentId, vendor_id: vendorId } : { id: documentId }
  )
  const document = documents[0]

  if (!document) {
    return null
  }

  const files = await marketplace.listVendorDocumentFiles({
    document_id: document.id,
    vendor_id: document.vendor_id,
  })

  return files[0] ? { document, file: files[0] } : { document, file: null }
}
