import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  marketplaceServiceOf,
  resolveVendorContext,
  submitVendorOwnedProduct,
} from "../helpers"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const { vendor } = await resolveVendorContext(req)
  const vendorProducts = await marketplace.listVendorProducts({
    vendor_id: vendor.id,
  })

  const reviews = await marketplace.listProductReviews({
    vendor_product_id: vendorProducts.map((vendorProduct: Record<string, any>) => vendorProduct.id),
  })

  res.json({
    vendor_products: vendorProducts,
    product_reviews: reviews,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const productId = ((req.body || {}) as Record<string, any>).product_id

  if (!productId) {
    res.status(400).json({ message: "product_id is required" })
    return
  }

  const result = await submitVendorOwnedProduct(req, productId)

  res.status(201).json(result)
}
