import { model } from "@medusajs/framework/utils"
import { VENDOR_DOCUMENT_STATUSES } from "../constants"
import Vendor from "./vendor"

const VendorDocument = model
  .define({ name: "VendorDocument", tableName: "beemun_vendor_document" }, {
    id: model.id({ prefix: "bvdoc" }).primaryKey(),
    vendor: model.belongsTo(() => Vendor, {
      mappedBy: "documents",
    }),
    document_type: model.text().searchable(),
    title: model.text().searchable(),
    file_url: model.text().nullable(),
    status: model.enum(VENDOR_DOCUMENT_STATUSES).default("draft"),
    issuer: model.text().nullable(),
    issued_at: model.dateTime().nullable(),
    expires_at: model.dateTime().nullable(),
    reviewed_at: model.dateTime().nullable(),
    reviewer_user_id: model.text().nullable(),
    review_notes: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_beemun_vendor_document_vendor_status",
      on: ["vendor_id", "status"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_vendor_document_type",
      on: ["document_type"],
      where: "deleted_at IS NULL",
    },
  ])

export default VendorDocument
