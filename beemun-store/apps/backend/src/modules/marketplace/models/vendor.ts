import { model } from "@medusajs/framework/utils"
import { VENDOR_STATUSES } from "../constants"

const Vendor = model
  .define({ name: "Vendor", tableName: "beemun_vendor" }, {
    id: model.id({ prefix: "bven" }).primaryKey(),
    name: model.text().searchable(),
    handle: model.text().searchable(),
    email: model.text().searchable(),
    phone: model.text().nullable(),
    description: model.text().nullable(),
    logo_url: model.text().nullable(),
    banner_url: model.text().nullable(),
    website_url: model.text().nullable(),
    country_code: model.text().nullable(),
    status: model.enum(VENDOR_STATUSES).default("draft"),
    status_reason: model.text().nullable(),
    submitted_at: model.dateTime().nullable(),
    reviewed_at: model.dateTime().nullable(),
    approved_at: model.dateTime().nullable(),
    suspended_at: model.dateTime().nullable(),
    rejected_at: model.dateTime().nullable(),
    archived_at: model.dateTime().nullable(),
    zps_profile_score: model.number().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_beemun_vendor_handle_unique",
      on: ["handle"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_vendor_email",
      on: ["email"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_vendor_status",
      on: ["status"],
      where: "deleted_at IS NULL",
    },
  ])

export default Vendor
