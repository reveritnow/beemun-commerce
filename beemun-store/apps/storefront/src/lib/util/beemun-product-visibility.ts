import { HttpTypes } from "@medusajs/types"

type ProductLike = HttpTypes.StoreProduct & {
  status?: string
  metadata?: Record<string, unknown> | null
}

const isPublished = (product: ProductLike) => {
  return !product.status || product.status === "published"
}

export const isBeemunApprovedProduct = (product?: ProductLike | null) => {
  if (!product) {
    return false
  }

  const metadata = product.metadata || {}

  return (
    isPublished(product) &&
    metadata.beemun_zps_status === "approved" &&
    metadata.beemun_zps_approved === true &&
    metadata.beemun_public_visibility_eligible === true
  )
}

export const filterBeemunApprovedProducts = <
  TProduct extends ProductLike,
>(
  products?: TProduct[] | null
) => {
  return (products || []).filter(isBeemunApprovedProduct)
}

export const ensureProductFieldsIncludeBeemunGate = (fields?: string) => {
  const requiredFields = ["+metadata", "+status"]

  if (!fields) {
    return [
      "*variants.calculated_price",
      "+variants.inventory_quantity",
      "*variants.images",
      "+metadata",
      "+status",
      "+tags",
    ].join(",")
  }

  return requiredFields.reduce((nextFields, field) => {
    return nextFields.includes(field) ? nextFields : `${nextFields},${field}`
  }, fields)
}
