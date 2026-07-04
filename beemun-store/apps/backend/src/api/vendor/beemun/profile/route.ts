import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  assertVendorIsOperable,
  bodyOf,
  marketplaceServiceOf,
  resolveVendorContext,
} from "../helpers"

const allowedProfileFields = [
  "name",
  "phone",
  "description",
  "logo_url",
  "banner_url",
  "website_url",
  "country_code",
  "metadata",
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const context = await resolveVendorContext(req)

  res.json({
    vendor: context.vendor,
    member: context.member,
  })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const context = await resolveVendorContext(req)
  const body = bodyOf(req)

  assertVendorIsOperable(context.vendor)

  const updates = allowedProfileFields.reduce<Record<string, any>>(
    (result, field) => {
      if (field in body) {
        result[field] = body[field]
      }

      return result
    },
    {}
  )

  const vendor = await marketplace.updateVendors({
    id: context.vendor.id,
    ...updates,
  })

  res.json({ vendor })
}
