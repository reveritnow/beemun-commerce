import { model } from "@medusajs/framework/utils"
import { VENDOR_APPLICATION_MESSAGE_AUTHOR_TYPES } from "../constants"
import Vendor from "./vendor"

const VendorApplicationMessage = model
  .define(
    { name: "VendorApplicationMessage", tableName: "beemun_vendor_application_message" },
    {
      id: model.id({ prefix: "bvmsg" }).primaryKey(),
      vendor: model.belongsTo(() => Vendor, {
        mappedBy: "application_messages",
      }),
      author_type: model.enum(VENDOR_APPLICATION_MESSAGE_AUTHOR_TYPES).default("admin"),
      author_user_id: model.text().nullable(),
      body: model.text(),
      internal: model.boolean().default(false),
      metadata: model.json().nullable(),
    }
  )
  .indexes([
    {
      name: "IDX_beemun_vendor_application_message_vendor",
      on: ["vendor_id"],
      where: "deleted_at IS NULL",
    },
  ])

export default VendorApplicationMessage
