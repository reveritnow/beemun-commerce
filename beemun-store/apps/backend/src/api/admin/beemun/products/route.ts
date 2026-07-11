import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ModuleRegistrationName } from "@medusajs/framework/utils"
import { requireBeemunApprovalRole } from "../permissions"
import { marketplaceServiceOf } from "../marketplace/helpers"

const activeReviewStatuses = [
  "draft",
  "submitted",
  "automatic_checks",
  "pending_zps_review",
  "needs_changes",
  "approved",
  "published",
  "hidden",
  "rejected",
  "archived",
]

const statusFilter = (value: unknown) => {
  const raw = String(value || "").trim()

  if (!raw || raw === "all") {
    return activeReviewStatuses
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => activeReviewStatuses.includes(item))
}

const safeProduct = async (productService: Record<string, any>, productId: string) => {
  try {
    return await productService.retrieveProduct(productId, {
      relations: [
        "variants",
        "variants.options",
        "variants.prices",
        "images",
        "categories",
        "collection",
        "options",
      ],
    })
  } catch {
    try {
      return await productService.retrieveProduct(productId)
    } catch {
      return null
    }
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }

  const marketplace = marketplaceServiceOf(req)
  const productService = req.scope.resolve(ModuleRegistrationName.PRODUCT)
  const statuses = statusFilter(req.query.status)
  const reviews = await marketplace.listProductReviews({
    status: statuses.length === 1 ? statuses[0] : statuses,
  })

  const enriched = await Promise.all(
    reviews.map(async (review: Record<string, any>) => {
      const vendorProduct = review.vendor_product_id
        ? await marketplace.retrieveVendorProduct(review.vendor_product_id).catch(() => null)
        : null
      const vendor = vendorProduct?.vendor_id
        ? await marketplace.retrieveVendor(vendorProduct.vendor_id).catch(() => null)
        : null
      const product = review.product_id
        ? await safeProduct(productService, review.product_id)
        : null
      const events = await marketplace.listProductReviewEvents({
        product_review_id: review.id,
      })
      const qualitySignals = await marketplace.listProductQualitySignals({
        product_review_id: review.id,
      })

      return {
        product_review: review,
        vendor_product: vendorProduct,
        vendor,
        product,
        events,
        quality_signals: qualitySignals,
      }
    })
  )

  res.json({ product_reviews: enriched })
}
