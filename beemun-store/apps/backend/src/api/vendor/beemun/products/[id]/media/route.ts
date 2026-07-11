import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { enforceRateLimit, rateLimitKeyFor } from "../../../rate-limit"
import {
  assertPortalAccess,
  bodyOf,
  emailFromRequest,
  ProductPortalError,
  resolveApprovedMakerProduct,
  text,
} from "../../product-portal-helpers"

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"])
const maxProductImageSize = 4 * 1024 * 1024

const handleError = (res: MedusaResponse, error: unknown) => {
  if (error instanceof ProductPortalError) {
    res.status(error.status).json({ message: error.message, code: error.code })
    return
  }

  res.status(500).json({
    message:
      error instanceof Error
        ? error.message
        : "The product media upload could not be completed.",
  })
}

const resolveFileService = (req: MedusaRequest) => {
  try {
    return req.scope.resolve("file") as Record<string, any>
  } catch {
    return null
  }
}

const uploadWithProvider = async (
  fileService: Record<string, any>,
  upload: Record<string, any>
) => {
  const payload = {
    filename: upload.original_filename,
    mimeType: upload.mime_type,
    mime_type: upload.mime_type,
    content: upload.content_base64,
    content_base64: upload.content_base64,
    access: "public",
  }

  if (typeof fileService.createFiles === "function") {
    const result = await fileService.createFiles([payload])
    return Array.isArray(result) ? result[0] : result
  }

  if (typeof fileService.upload === "function") {
    return fileService.upload(payload)
  }

  if (typeof fileService.uploadFiles === "function") {
    const result = await fileService.uploadFiles([payload])
    return Array.isArray(result) ? result[0] : result
  }

  throw new ProductPortalError(
    "Medusa file provider is registered but does not expose a supported upload method.",
    503,
    "file_provider_unsupported"
  )
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    assertPortalAccess(req)
    const body = bodyOf(req)
    const email = emailFromRequest(req)

    if (
      !enforceRateLimit(req, res, {
        key: rateLimitKeyFor(req, "maker-product-media", email || req.params.id),
        limit: 40,
        windowMs: 60 * 60_000,
      })
    ) {
      return
    }

    const upload = (body.upload || {}) as Record<string, any>
    const mimeType = String(upload.mime_type || "").trim().toLowerCase()
    const fileSize = Number(upload.file_size || Number.NaN)
    const contentBase64 = String(upload.content_base64 || "").trim()

    if (!contentBase64 || !text(upload.original_filename)) {
      throw new ProductPortalError("Choose an image file to upload.", 400, "missing_file")
    }

    if (!allowedMimeTypes.has(mimeType)) {
      throw new ProductPortalError("Product images must be JPG, PNG, or WEBP.", 400, "unsupported_file_type")
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxProductImageSize) {
      throw new ProductPortalError("Product images must be 4 MB or smaller.", 400, "file_too_large")
    }

    const context = await resolveApprovedMakerProduct(req, req.params.id, email)

    if (!["draft", "needs_changes"].includes(context.review.status)) {
      throw new ProductPortalError("Product media is locked while BEEMUN is reviewing it.", 409, "product_locked")
    }

    const fileService = resolveFileService(req)

    if (!fileService) {
      throw new ProductPortalError(
        "Product media upload needs a Medusa file provider. Configure S3, R2, or another Medusa file provider, then retry.",
        503,
        "file_provider_missing"
      )
    }

    const stored = await uploadWithProvider(fileService, upload)
    const url = stored?.url || stored?.file_url || stored?.path || stored?.key

    if (!url) {
      throw new ProductPortalError("The Medusa file provider did not return a usable file URL.", 503, "file_url_missing")
    }

    res.status(201).json({
      file: {
        id: stored?.id || null,
        url,
        original_filename: upload.original_filename,
        mime_type: mimeType,
        file_size: fileSize,
        storage_provider: "medusa_file_provider",
      },
    })
  } catch (error) {
    handleError(res, error)
  }
}
