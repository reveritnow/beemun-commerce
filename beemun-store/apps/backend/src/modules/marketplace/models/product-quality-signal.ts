import { model } from "@medusajs/framework/utils"
import { PRODUCT_QUALITY_SIGNAL_TYPES } from "../constants"
import ProductReview from "./product-review"

const ProductQualitySignal = model
  .define({
    name: "ProductQualitySignal",
    tableName: "beemun_product_quality_signal",
  }, {
    id: model.id({ prefix: "bzpsig" }).primaryKey(),
    product_review: model.belongsTo(() => ProductReview, {
      mappedBy: "quality_signals",
    }),
    signal_type: model.enum(PRODUCT_QUALITY_SIGNAL_TYPES),
    score: model.number().nullable(),
    outcome: model.text().nullable(),
    source: model.text().nullable(),
    source_reference: model.text().nullable(),
    notes: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_beemun_product_quality_signal_review",
      on: ["product_review_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_product_quality_signal_type",
      on: ["signal_type"],
      where: "deleted_at IS NULL",
    },
  ])

export default ProductQualitySignal
