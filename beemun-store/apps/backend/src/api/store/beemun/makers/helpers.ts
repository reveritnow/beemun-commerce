import { MedusaRequest } from "@medusajs/framework/http"
import { BEEMUN_MARKETPLACE_MODULE } from "../../../../modules/marketplace"

type MarketplaceService = Record<string, any>

const marketplaceServiceOf = (req: MedusaRequest): MarketplaceService => {
  return req.scope.resolve(BEEMUN_MARKETPLACE_MODULE)
}

const readString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
) => {
  const value = metadata?.[key]

  return typeof value === "string" && value.trim() ? value : null
}

const serializeMaker = async (
  marketplace: MarketplaceService,
  vendor: Record<string, any>
) => {
  const metadata = vendor.metadata || {}
  const vendorProducts = await marketplace.listVendorProducts({
    vendor_id: vendor.id,
    is_primary: true,
  })

  const publicProductIds: string[] = []

  for (const vendorProduct of vendorProducts) {
    const reviews = await marketplace.listProductReviews({
      vendor_product_id: vendorProduct.id,
    })

    const publicReview = reviews.find((review: Record<string, any>) => {
      return (
        review.status === "published" && review.public_visibility_eligible === true
      )
    })

    if (publicReview) {
      publicProductIds.push(vendorProduct.product_id)
    }
  }

  return {
    id: vendor.id,
    name: vendor.name,
    handle: vendor.handle,
    description: vendor.description,
    logo_url: vendor.logo_url,
    banner_url: vendor.banner_url,
    country_code: vendor.country_code,
    status: vendor.status,
    zps_profile_score: vendor.zps_profile_score,
    story:
      readString(metadata, "maker_story") ||
      readString(metadata, "story") ||
      vendor.description,
    approved_reason:
      readString(metadata, "beemun_approval") ||
      readString(metadata, "approved_reason"),
    ingredient_philosophy: readString(metadata, "ingredient_philosophy"),
    packaging_philosophy: readString(metadata, "packaging_philosophy"),
    review_summary: readString(metadata, "review_summary"),
    location: readString(metadata, "location") || vendor.country_code,
    product_ids: Array.from(new Set(publicProductIds)),
  }
}

export const listPublicMakers = async (req: MedusaRequest) => {
  const marketplace = marketplaceServiceOf(req)
  const productId = req.query.product_id as string | undefined

  if (productId) {
    const vendorProducts = await marketplace.listVendorProducts({
      product_id: productId,
      is_primary: true,
    })

    const makers: Record<string, any>[] = []

    for (const vendorProduct of vendorProducts) {
      const vendor = await marketplace.retrieveVendor(vendorProduct.vendor_id)

      if (vendor?.status === "approved") {
        makers.push(await serializeMaker(marketplace, vendor))
      }
    }

    return makers
  }

  const vendors = await marketplace.listVendors({ status: "approved" })
  const makers: Record<string, any>[] = []

  for (const vendor of vendors) {
    makers.push(await serializeMaker(marketplace, vendor))
  }

  return makers
}

export const retrievePublicMakerByHandle = async (
  req: MedusaRequest,
  handle: string
) => {
  const marketplace = marketplaceServiceOf(req)
  const vendors = await marketplace.listVendors({ handle, status: "approved" })
  const vendor = vendors[0]

  if (!vendor) {
    return null
  }

  return serializeMaker(marketplace, vendor)
}
