import { model } from "@medusajs/framework/utils"
import { VENDOR_STATUSES } from "../constants"
import VendorApplicationMessage from "./vendor-application-message"
import VendorApplicationTask from "./vendor-application-task"
import VendorDocument from "./vendor-document"
import VendorInvite from "./vendor-invite"
import VendorMember from "./vendor-member"
import VendorProduct from "./vendor-product"
import VendorReviewEvent from "./vendor-review-event"

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
    members: model.hasMany(() => VendorMember, {
      mappedBy: "vendor",
    }),
    invites: model.hasMany(() => VendorInvite, {
      mappedBy: "vendor",
    }),
    documents: model.hasMany(() => VendorDocument, {
      mappedBy: "vendor",
    }),
    application_messages: model.hasMany(() => VendorApplicationMessage, {
      mappedBy: "vendor",
    }),
    application_tasks: model.hasMany(() => VendorApplicationTask, {
      mappedBy: "vendor",
    }),
    review_events: model.hasMany(() => VendorReviewEvent, {
      mappedBy: "vendor",
    }),
    products: model.hasMany(() => VendorProduct, {
      mappedBy: "vendor",
    }),
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
