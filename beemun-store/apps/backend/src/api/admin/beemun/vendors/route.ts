import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../marketplace/helpers"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const status = req.query.status as string | undefined
  const filters = status ? { status } : {}
  const vendors = await marketplace.listVendors(filters)

  res.json({ vendors })
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
