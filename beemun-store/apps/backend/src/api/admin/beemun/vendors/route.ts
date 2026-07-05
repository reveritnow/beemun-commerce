import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../marketplace/helpers"

const enrichVendor = async (
  marketplace: Record<string, any>,
  vendor: Record<string, any>
) => {
  const [documents, reviewEvents, tasks, messages] = await Promise.all([
    marketplace.listVendorDocuments({ vendor_id: vendor.id }),
    marketplace.listVendorReviewEvents({ vendor_id: vendor.id }),
    marketplace.listVendorApplicationTasks({ vendor_id: vendor.id }),
    marketplace.listVendorApplicationMessages({ vendor_id: vendor.id }),
  ])

  return {
    ...vendor,
    documents,
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
