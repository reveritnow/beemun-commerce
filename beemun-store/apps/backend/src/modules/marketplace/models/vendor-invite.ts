import { model } from "@medusajs/framework/utils"
import { VENDOR_MEMBER_ROLES } from "../constants"
import Vendor from "./vendor"

const VendorInvite = model
  .define({ name: "VendorInvite", tableName: "beemun_vendor_invite" }, {
    id: model.id({ prefix: "bvinv" }).primaryKey(),
    vendor: model.belongsTo(() => Vendor, {
      mappedBy: "invites",
    }),
    email: model.text().searchable(),
    role: model.enum(VENDOR_MEMBER_ROLES).default("manager"),
    token_hash: model.text(),
    expires_at: model.dateTime(),
    accepted_at: model.dateTime().nullable(),
    revoked_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_beemun_vendor_invite_token_unique",
      on: ["token_hash"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_vendor_invite_vendor_email",
      on: ["vendor_id", "email"],
      where: "deleted_at IS NULL",
    },
  ])

export default VendorInvite
