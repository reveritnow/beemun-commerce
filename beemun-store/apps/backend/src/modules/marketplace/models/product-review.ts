import { model } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_STATUSES } from "../constants"
import VendorProduct from "./vendor-product"

const ProductReview = model
  .define({ name: "ProductReview", tableName: "beemun_product_review" }, {
    id: model.id({ prefix: "bzps" }).primaryKey(),
    vendor_product: model.belongsTo(() => VendorProduct, {
      mappedBy: "reviews",
    }),
    product_id: model.text().searchable(),
    status: model.enum(PRODUCT_REVIEW_STATUSES).default("draft"),
    zps_score: model.number().nullable(),
    ai_risk_score: model.number().nullable(),
    public_visibility_eligible: model.boolean().default(false),
    submitted_at: model.dateTime().nullable(),
    automatic_checks_started_at: model.dateTime().nullable(),
    automatic_checks_completed_at: model.dateTime().nullable(),
    zps_review_started_at: model.dateTime().nullable(),
    approved_at: model.dateTime().nullable(),
    published_at: model.dateTime().nullable(),
    hidden_at: model.dateTime().nullable(),
    rejected_at: model.dateTime().nullable(),
    archived_at: model.dateTime().nullable(),
    reviewer_user_id: model.text().nullable(),
    rejection_reason: model.text().nullable(),
    change_request: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_beemun_product_review_product",
      on: ["product_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_product_review_vendor_product",
      on: ["vendor_product_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_product_review_status",
      on: ["status"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_product_review_public_gate",
      on: ["product_id", "status", "public_visibility_eligible"],
      where: "deleted_at IS NULL",
    },
  ])

export default ProductReview
