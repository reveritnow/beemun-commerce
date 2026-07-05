import { model } from "@medusajs/framework/utils"

const VendorDocumentFile = model
  .define(
    { name: "VendorDocumentFile", tableName: "beemun_vendor_document_file" },
    {
      id: model.id({ prefix: "bvfile" }).primaryKey(),
      document_id: model.text().searchable(),
      vendor_id: model.text().searchable(),
      storage_provider: model.text().default("database_mvp"),
      storage_key: model.text().searchable(),
      original_filename: model.text(),
      mime_type: model.text(),
      file_size: model.bigNumber(),
      content_base64: model.text(),
      metadata: model.json().nullable(),
    }
  )
  .indexes([
    {
      name: "IDX_beemun_vendor_document_file_document",
      on: ["document_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_beemun_vendor_document_file_vendor",
      on: ["vendor_id"],
      where: "deleted_at IS NULL",
    },
  ])

export default VendorDocumentFile
