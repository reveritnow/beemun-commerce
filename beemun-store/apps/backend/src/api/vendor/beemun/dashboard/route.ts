import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ModuleRegistrationName } from "@medusajs/framework/utils"
import {
  assertPortalDocumentAccess,
  DocumentUploadError,
} from "../document-storage"
import { marketplaceServiceOf } from "../helpers"
import { enforceRateLimit, rateLimitKeyFor } from "../rate-limit"

const publicMember = (member: Record<string, any> | null) => {
  if (!member) {
    return null
  }

  return {
    id: member.id,
    vendor_id: member.vendor_id,
    email: member.email,
    first_name: member.first_name,
    last_name: member.last_name,
    role: member.role,
    status: member.status,
    accepted_at: member.accepted_at,
  }
}

const reviewForVendorProducts = async (
  marketplace: Record<string, any>,
  vendorProducts: Array<Record<string, any>>
) => {
  if (!vendorProducts.length) {
    return []
  }

  return marketplace.listProductReviews({
    vendor_product_id: vendorProducts.map((item) => item.id),
  })
}

const safeProduct = async (
  productService: Record<string, any>,
  productId: string
) => {
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

const productItemsForVendorProducts = async ({
  marketplace,
  productService,
  vendorProducts,
  reviews,
}: {
  marketplace: Record<string, any>
  productService: Record<string, any>
  vendorProducts: Array<Record<string, any>>
  reviews: Array<Record<string, any>>
}) => {
  return Promise.all(
    vendorProducts.map(async (vendorProduct) => {
      const review =
        reviews.find((item) => item.vendor_product_id === vendorProduct.id) || null
      const product = vendorProduct.product_id
        ? await safeProduct(productService, vendorProduct.product_id)
        : null
      const events = review?.id
        ? await marketplace.listProductReviewEvents({ product_review_id: review.id })
        : []

      return {
        vendor_product: vendorProduct,
        product_review: review,
        product,
        events,
      }
    })
  )
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    assertPortalDocumentAccess(req.headers)
  } catch (error) {
    if (error instanceof DocumentUploadError) {
      res.status(error.status).json({ message: error.message, code: error.code })
      return
    }

    throw error
  }

  const email = String(req.query.email || "").trim().toLowerCase()

  if (!email) {
    res.status(400).json({ message: "Maker email is required." })
    return
  }

  if (
    !enforceRateLimit(req, res, {
      key: rateLimitKeyFor(req, "maker-dashboard-get", email),
      limit: 120,
      windowMs: 60_000,
    })
  ) {
    return
  }

  const marketplace = marketplaceServiceOf(req)
  const productService = req.scope.resolve(ModuleRegistrationName.PRODUCT)
  const members = await marketplace.listVendorMembers({
    email,
    status: "active",
  })
  const member = members[0] || null

  if (!member) {
    res.json({
      vendor: null,
      member: null,
      vendor_products: [],
      product_reviews: [],
      product_items: [],
      documents: [],
      tasks: [],
      messages: [],
      review_events: [],
    })
    return
  }

  const vendor = await marketplace.retrieveVendor(member.vendor_id)
  const [
    vendorProducts,
    documents,
    tasks,
    messages,
    reviewEvents,
  ] = await Promise.all([
    marketplace.listVendorProducts({ vendor_id: vendor.id }),
    marketplace.listVendorDocuments({ vendor_id: vendor.id }),
    marketplace.listVendorApplicationTasks({ vendor_id: vendor.id }),
    marketplace.listVendorApplicationMessages({
      vendor_id: vendor.id,
      internal: false,
    }),
    marketplace.listVendorReviewEvents({ vendor_id: vendor.id }),
  ])
  const productReviews = await reviewForVendorProducts(
    marketplace,
    vendorProducts
  )
  const productItems = await productItemsForVendorProducts({
    marketplace,
    productService,
    vendorProducts,
    reviews: productReviews,
  })

  res.json({
    vendor,
    member: publicMember(member),
    vendor_products: vendorProducts,
    product_reviews: productReviews,
    product_items: productItems,
    documents,
    tasks,
    messages,
    review_events: reviewEvents,
  })
}
