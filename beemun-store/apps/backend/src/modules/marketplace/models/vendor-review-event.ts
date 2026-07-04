import { model } from "@medusajs/framework/utils"
import { REVIEW_EVENT_ACTOR_TYPES, VENDOR_STATUSES } from "../constants"
import Vendor from "./vendor"

const VendorReviewEvent = model
  .define({ name: "VendorReviewEvent", tableName: "beemun_vendor_review_event" }, {
    id: model.id({ prefix: "bvrevt" }).primaryKey(),
    vendor: model.belongsTo(() => Vendor, {
      mappedBy: "review_events",
    }),
    from_status: model.enum(VENDOR_STATUSES).nullable(),
    to_status: model.enum(VENDOR_STATUSES),
    actor_type: model.enum(REVIEW_EVENT_ACTOR_TYPES).default("admin"),
    actor_user_id: model.text().nullable(),
    reason: model.text().nullable(),
    notes: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_beemun_vendor_review_event_vendor",
      on: ["vendor_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_vendor_review_event_to_status",
      on: ["to_status"],
      where: "deleted_at IS NULL",
    },
  ])

export default VendorReviewEvent
