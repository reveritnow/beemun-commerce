import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
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

  res.json({
    vendor,
    member: publicMember(member),
    vendor_products: vendorProducts,
    product_reviews: productReviews,
    documents,
    tasks,
    messages,
    review_events: reviewEvents,
  })
}
