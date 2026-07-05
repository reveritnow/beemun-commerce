import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../helpers"
import {
  DocumentUploadError,
  metadataForUpload,
  storeDocumentUpload,
  uploadFromDocument,
} from "../document-storage"

const activeStatuses = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
]

const findVendorByEmail = async (marketplace: Record<string, any>, email: string) => {
  const vendors = await marketplace.listVendors({ email })

  return (
    vendors.find((item: Record<string, any>) =>
      activeStatuses.includes(item.status)
    ) ||
    vendors[0] ||
    null
  )
}

const documentActionError = (error: unknown) => {
  if (error instanceof DocumentUploadError) {
    return {
      status: error.status,
      body: { message: error.message, code: error.code },
    }
  }

  const rawMessage =
    error instanceof Error ? error.message : String(error || "")
  const message = rawMessage || "Document upload failed."
  const normalized = message.toLowerCase()

  if (
    normalized.includes("beemun_vendor_document_file") ||
    normalized.includes("vendordocumentfile") ||
    (normalized.includes("relation") && normalized.includes("does not exist"))
  ) {
    return {
      status: 500,
      body: {
        message:
          "Document storage is not ready on the backend. Please run the latest backend migrations before accepting document uploads.",
        code: "document_storage_migration_missing",
      },
    }
  }

  if (
    normalized.includes("request entity too large") ||
    normalized.includes("payload too large")
  ) {
    return {
      status: 413,
      body: {
        message:
          "The uploaded document is too large for the application portal. Please upload a smaller PDF, JPG, PNG, or WEBP file.",
        code: "document_payload_too_large",
      },
    }
  }

  if (normalized.includes("unique") || normalized.includes("duplicate")) {
    return {
      status: 409,
      body: {
        message:
          "This document already has a stored file. Please refresh the portal and try replacing it again.",
        code: "document_file_conflict",
      },
    }
  }

  return {
    status: 500,
    body: {
      message:
        message === "An unknown error occurred."
          ? "Document upload failed unexpectedly. Please try again or contact BEEMUN with the document name."
          : `Document upload failed: ${message}`,
      code: "document_upload_failed",
    },
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const email = String(req.query.email || "").trim().toLowerCase()

  if (!email) {
    res.status(400).json({ message: "Applicant email is required." })
    return
  }

  const vendor = await findVendorByEmail(marketplace, email)

  if (!vendor) {
    res.json({
      vendor: null,
      documents: [],
      review_events: [],
      tasks: [],
      messages: [],
    })
    return
  }

  const documents = await marketplace.listVendorDocuments({
    vendor_id: vendor.id,
  })
  const reviewEvents = await marketplace.listVendorReviewEvents({
    vendor_id: vendor.id,
  })
  const applicationTasks = await marketplace.listVendorApplicationTasks({
    vendor_id: vendor.id,
  })
  const applicationMessages = await marketplace.listVendorApplicationMessages({
    vendor_id: vendor.id,
    internal: false,
  })
  const metadata = vendor.metadata || {}

  res.json({
    vendor,
    documents,
    review_events: reviewEvents,
    tasks: applicationTasks.length
      ? applicationTasks
      : metadata.application_tasks || [],
    messages: applicationMessages.length
      ? applicationMessages
      : metadata.application_messages || [],
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const body = (req.body || {}) as Record<string, any>
  const email = String(body.email || "").trim().toLowerCase()
  const action = String(body.action || "")

  if (!email) {
    res.status(400).json({ message: "Applicant email is required." })
    return
  }

  const vendor = await findVendorByEmail(marketplace, email)

  if (!vendor) {
    res.status(404).json({ message: "Maker application was not found." })
    return
  }

  const metadata = vendor.metadata || {}

  if (action === "message") {
    const text = String(body.text || "").trim()

    if (!text) {
      res.status(400).json({ message: "Message text is required." })
      return
    }

    const message = await marketplace.createVendorApplicationMessages({
      vendor_id: vendor.id,
      author_type: "applicant",
      author_user_id: null,
      body: text,
      internal: false,
      metadata: {
        source: "maker_application_portal",
      },
    })

    res.status(201).json({ message })
    return
  }

  if (action === "complete_task") {
    const taskId = String(body.task_id || "")
    const existingTasks = await marketplace.listVendorApplicationTasks({
      id: taskId,
      vendor_id: vendor.id,
    })

    if (!existingTasks[0]) {
      res.status(404).json({ message: "Application task was not found." })
      return
    }

    const task = await marketplace.updateVendorApplicationTasks({
      id: taskId,
      status: "completed",
      completed_at: new Date(),
    })

    res.json({ task })
    return
  }

  if (action === "document") {
    try {
      let upload: ReturnType<typeof uploadFromDocument>
      const documentId = String(body.document_id || "")
      const title = String(body.title || "").trim()

      if (!title && !documentId) {
        res.status(400).json({ message: "Document title is required." })
        return
      }

      upload = uploadFromDocument(body)

      if (!upload) {
        res.status(400).json({ message: "Please choose a document file to upload." })
        return
      }

      let document: Record<string, any>

      if (documentId) {
        const existingDocuments = await marketplace.listVendorDocuments({
          id: documentId,
          vendor_id: vendor.id,
        })

        if (!existingDocuments[0]) {
          res.status(404).json({ message: "Document request was not found." })
          return
        }

        const existing = existingDocuments[0]
        document = await marketplace.updateVendorDocuments({
          id: existing.id,
          title: title || existing.title,
          status: "submitted",
          metadata: {
            ...(existing.metadata || {}),
            source: "maker_application_portal",
            ...metadataForUpload(upload, {
              ...(existing.metadata || {}),
              applicant_note: body.note || existing.metadata?.applicant_note || null,
              required: existing.metadata?.required === true,
            }),
          },
        })
      } else {
        document = await marketplace.createVendorDocuments({
          vendor_id: vendor.id,
          document_type: body.document_type || "application",
          title,
          file_url: "beemun-document://pending",
          status: "submitted",
          metadata: {
            source: "maker_application_portal",
            ...metadataForUpload(upload, {
              applicant_note: body.note || null,
              required: body.required === true,
            }),
            applicant_note: body.note || null,
          },
        })
      }

      await storeDocumentUpload({
        marketplace,
        document,
        upload,
        source: "maker_application_portal",
      })

      res.status(201).json({ document })
    } catch (error) {
      const logger = (() => {
        try {
          return req.scope.resolve("logger")
        } catch {
          return null
        }
      })()

      logger?.error?.(
        `BEEMUN document upload failed for vendor ${vendor.id}: ${
          error instanceof Error ? error.stack || error.message : String(error)
        }`
      )

      const mapped = documentActionError(error)
      res.status(mapped.status).json(mapped.body)
    }
    return
  }

  res.status(400).json({ message: "Unsupported portal action." })
}
