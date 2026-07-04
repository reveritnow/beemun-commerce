import { model } from "@medusajs/framework/utils"
import {
  PRODUCT_REVIEW_STATUSES,
  REVIEW_EVENT_ACTOR_TYPES,
} from "../constants"
import ProductReview from "./product-review"

const ProductReviewEvent = model
  .define({ name: "ProductReviewEvent", tableName: "beemun_product_review_event" }, {
    id: model.id({ prefix: "bzpevt" }).primaryKey(),
    product_review: model.belongsTo(() => ProductReview, {
      mappedBy: "events",
    }),
    from_status: model.enum(PRODUCT_REVIEW_STATUSES).nullable(),
    to_status: model.enum(PRODUCT_REVIEW_STATUSES),
    actor_type: model.enum(REVIEW_EVENT_ACTOR_TYPES).default("admin"),
    actor_user_id: model.text().nullable(),
    reason: model.text().nullable(),
    notes: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_beemun_product_review_event_review",
      on: ["product_review_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_product_review_event_to_status",
      on: ["to_status"],
      where: "deleted_at IS NULL",
    },
  ])

export default ProductReviewEvent
