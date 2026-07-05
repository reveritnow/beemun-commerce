import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../marketplace/helpers"

const enrichVendor = async (
  marketplace: Record<string, any>,
  vendor: Record<string, any>
) => {
  const [documents, documentFiles, reviewEvents, tasks, messages] = await Promise.all([
    marketplace.listVendorDocuments({ vendor_id: vendor.id }),
    marketplace.listVendorDocumentFiles({ vendor_id: vendor.id }),
    marketplace.listVendorReviewEvents({ vendor_id: vendor.id }),
    marketplace.listVendorApplicationTasks({ vendor_id: vendor.id }),
    marketplace.listVendorApplicationMessages({ vendor_id: vendor.id }),
  ])
  const filesByDocument = new Map<string, Record<string, any>>(
    documentFiles.map((file: Record<string, any>) => [file.document_id, file])
  )
  const safeFile = (file: Record<string, any> | null) => {
    if (!file) {
      return null
    }

    return {
      id: file.id,
      document_id: file.document_id,
      vendor_id: file.vendor_id,
      storage_provider: file.storage_provider,
      storage_key: file.storage_key,
      original_filename: file.original_filename,
      mime_type: file.mime_type,
      file_size: file.file_size,
      created_at: file.created_at,
      updated_at: file.updated_at,
    }
  }
  const enrichedDocuments = documents.map((document: Record<string, any>) => {
    const file = filesByDocument.get(document.id) || null

    return {
      ...document,
      file: safeFile(file),
      metadata: {
        ...(document.metadata || {}),
        original_filename:
          file?.original_filename || document.metadata?.original_filename || null,
        mime_type: file?.mime_type || document.metadata?.mime_type || null,
        file_size: file?.file_size || document.metadata?.file_size || null,
        storage_provider:
          file?.storage_provider || document.metadata?.storage_provider || null,
        storage_status: file ? "stored" : document.metadata?.storage_status || "missing",
      },
    }
  })

  return {
    ...vendor,
    documents: enrichedDocuments,
    review_events: reviewEvents,
    application_tasks: tasks,
    application_messages: messages,
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const status = req.query.status as string | undefined
  const filters = status ? { status } : {}
  const vendors = await marketplace.listVendors(filters)
  const enriched = await Promise.all(
    vendors.map((vendor: Record<string, any>) => enrichVendor(marketplace, vendor))
  )

  res.json({ vendors: enriched })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const body = (req.body || {}) as Record<string, any>

  const vendor = await marketplace.createVendors({
    name: body.name,
    handle: body.handle,
    email: body.email,
    phone: body.phone || null,
    description: body.description || null,
    logo_url: body.logo_url || null,
    banner_url: body.banner_url || null,
    website_url: body.website_url || null,
    country_code: body.country_code || null,
    status: body.status || "draft",
    metadata: body.metadata || null,
  })

  await marketplace.createVendorReviewEvents({
    vendor_id: vendor.id,
    from_status: null,
    to_status: vendor.status,
    actor_type: "admin",
    actor_user_id: (req as any).auth_context?.actor_id || null,
    reason: "Vendor created",
    notes: null,
    metadata: null,
  })

  res.status(201).json({ vendor })
}
