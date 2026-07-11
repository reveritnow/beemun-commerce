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
        ? `Product media upload failed: ${error.message}`
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

const assertFileProviderConfigured = () => {
  const endpoint = process.env.BEEMUN_FILE_ENDPOINT || process.env.S3_ENDPOINT
  const missing = [
    ["BEEMUN_FILE_BUCKET", process.env.BEEMUN_FILE_BUCKET || process.env.S3_BUCKET],
    ["BEEMUN_FILE_ENDPOINT", endpoint],
    ["BEEMUN_FILE_ACCESS_KEY_ID", process.env.BEEMUN_FILE_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID],
    [
      "BEEMUN_FILE_SECRET_ACCESS_KEY",
      process.env.BEEMUN_FILE_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY,
    ],
  ].filter(([, value]) => !value)

  if (missing.length) {
    throw new ProductPortalError(
      `Product media storage is not configured. Missing backend env: ${missing
        .map(([name]) => name)
        .join(", ")}.`,
      503,
      "file_provider_env_missing"
    )
  }

  try {
    const parsedEndpoint = new URL(String(endpoint))
    const isR2Endpoint = parsedEndpoint.hostname.endsWith(".r2.cloudflarestorage.com")

    if (parsedEndpoint.protocol !== "https:" || !isR2Endpoint) {
      throw new Error("invalid R2 endpoint")
    }
  } catch {
    throw new ProductPortalError(
      "Product media storage endpoint is invalid. Use the Cloudflare R2 S3 API endpoint, for example https://<account-id>.r2.cloudflarestorage.com.",
      503,
      "file_provider_endpoint_invalid"
    )
  }
}

const decodedBase64Size = (content: string) => {
  try {
    return Buffer.from(content, "base64").byteLength
  } catch {
    return 0
  }
}

const uploadWithProvider = async (
  fileService: Record<string, any>,
  upload: Record<string, any>,
  productId: string
) => {
  const originalFilename = String(upload.original_filename || "product-image").trim()
  const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._-]/g, "-")
  const filename = `products/${productId}/${Date.now()}-${safeFilename}`
  const payload = {
    filename,
    mimeType: upload.mime_type,
    content: upload.content_base64,
    access: "private",
  }

  if (typeof fileService.createFiles === "function") {
    return fileService.createFiles(payload)
  }

  throw new ProductPortalError(
    "Medusa file provider is registered but createFiles is unavailable.",
    503,
    "file_provider_unsupported"
  )
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    assertPortalAccess(req)
    assertFileProviderConfigured()
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
      throw new ProductPortalError(
        "Product images must be JPG, JPEG, PNG, or WEBP.",
        400,
        "unsupported_file_type"
      )
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxProductImageSize) {
      throw new ProductPortalError("Product images must be 4 MB or smaller.", 400, "file_too_large")
    }

    if (decodedBase64Size(contentBase64) !== fileSize) {
      throw new ProductPortalError(
        "Uploaded image size does not match the file data. Please retry the upload.",
        400,
        "invalid_file_size"
      )
    }

    const context = await resolveApprovedMakerProduct(req, req.params.id, email)

    if (!["draft", "needs_changes"].includes(context.review.status)) {
      throw new ProductPortalError(
        "Product media is locked while BEEMUN is reviewing it.",
        409,
        "product_locked"
      )
    }

    const fileService = resolveFileService(req)

    if (!fileService) {
      throw new ProductPortalError(
        "Product media upload needs Medusa's file module. Confirm the backend file module is enabled and redeployed.",
        503,
        "file_provider_missing"
      )
    }

    const stored = await uploadWithProvider(fileService, upload, req.params.id)
    const fileId = stored?.id

    if (!fileId) {
      throw new ProductPortalError(
        "The Medusa file provider did not return a usable file id.",
        503,
        "file_id_missing"
      )
    }

    res.status(201).json({
      file: {
        id: fileId,
        file_id: fileId,
        preview_url: `/api/beemun/maker-dashboard/products/${req.params.id}/media/${fileId}`,
        admin_url: `/admin/beemun/products/${req.params.id}/media/${fileId}`,
        public_url: `/store/beemun/products/${req.params.id}/media/${fileId}`,
        original_filename: upload.original_filename,
        mime_type: mimeType,
        file_size: fileSize,
        storage_provider: "medusa_file_s3_private",
      },
    })
  } catch (error) {
    handleError(res, error)
  }
}


