import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../../marketplace/helpers"
import { requireBeemunApprovalRole } from "../../permissions"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }

  const marketplace = marketplaceServiceOf(req)
  const vendor = await marketplace.retrieveVendor(req.params.id)

  res.json({ vendor })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }

  const marketplace = marketplaceServiceOf(req)
  const body = (req.body || {}) as Record<string, any>

  const vendor = await marketplace.updateVendors({
    id: req.params.id,
    ...body,
  })

  res.json({ vendor })
}
