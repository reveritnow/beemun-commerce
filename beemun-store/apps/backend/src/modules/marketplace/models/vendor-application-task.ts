import { model } from "@medusajs/framework/utils"
import { VENDOR_APPLICATION_TASK_STATUSES } from "../constants"
import Vendor from "./vendor"

const VendorApplicationTask = model
  .define(
    { name: "VendorApplicationTask", tableName: "beemun_vendor_application_task" },
    {
      id: model.id({ prefix: "bvtsk" }).primaryKey(),
      vendor: model.belongsTo(() => Vendor, {
        mappedBy: "application_tasks",
      }),
      title: model.text().searchable(),
      description: model.text().nullable(),
      status: model.enum(VENDOR_APPLICATION_TASK_STATUSES).default("pending"),
      requested_by_user_id: model.text().nullable(),
      completed_at: model.dateTime().nullable(),
      due_at: model.dateTime().nullable(),
      metadata: model.json().nullable(),
    }
  )
  .indexes([
    {
      name: "IDX_beemun_vendor_application_task_vendor_status",
      on: ["vendor_id", "status"],
      where: "deleted_at IS NULL",
    },
  ])

export default VendorApplicationTask
