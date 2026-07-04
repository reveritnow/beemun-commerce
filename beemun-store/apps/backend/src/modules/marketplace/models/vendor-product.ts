import { model } from "@medusajs/framework/utils"
import { VENDOR_PRODUCT_RELATIONSHIP_TYPES } from "../constants"
import ProductReview from "./product-review"
import Vendor from "./vendor"

const VendorProduct = model
  .define({ name: "VendorProduct", tableName: "beemun_vendor_product" }, {
    id: model.id({ prefix: "bvprod" }).primaryKey(),
    vendor: model.belongsTo(() => Vendor, {
      mappedBy: "products",
    }),
    product_id: model.text().searchable(),
    relationship_type: model
      .enum(VENDOR_PRODUCT_RELATIONSHIP_TYPES)
      .default("maker"),
    is_primary: model.boolean().default(true),
    ownership_started_at: model.dateTime().nullable(),
    ownership_ended_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
    reviews: model.hasMany(() => ProductReview, {
      mappedBy: "vendor_product",
    }),
  })
  .indexes([
    {
      name: "IDX_beemun_vendor_product_product",
      on: ["product_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_vendor_product_vendor",
      on: ["vendor_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_vendor_product_unique_relationship",
      on: ["product_id", "vendor_id", "relationship_type"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])

export default VendorProduct
