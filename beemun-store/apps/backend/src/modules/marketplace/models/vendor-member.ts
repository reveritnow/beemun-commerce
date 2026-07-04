import { model } from "@medusajs/framework/utils"
import {
  VENDOR_MEMBER_ROLES,
  VENDOR_MEMBER_STATUSES,
} from "../constants"
import Vendor from "./vendor"

const VendorMember = model
  .define({ name: "VendorMember", tableName: "beemun_vendor_member" }, {
    id: model.id({ prefix: "bvmem" }).primaryKey(),
    vendor: model.belongsTo(() => Vendor, {
      mappedBy: "members",
    }),
    email: model.text().searchable(),
    first_name: model.text().nullable(),
    last_name: model.text().nullable(),
    role: model.enum(VENDOR_MEMBER_ROLES).default("owner"),
    status: model.enum(VENDOR_MEMBER_STATUSES).default("invited"),
    external_auth_id: model.text().nullable(),
    invited_at: model.dateTime().nullable(),
    accepted_at: model.dateTime().nullable(),
    suspended_at: model.dateTime().nullable(),
    removed_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_beemun_vendor_member_vendor_email_unique",
      on: ["vendor_id", "email"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_vendor_member_external_auth",
      on: ["external_auth_id"],
      where: "deleted_at IS NULL",
    },
  ])

export default VendorMember
