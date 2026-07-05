import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../helpers"

const activeStatuses = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
]

const findVendorByEmail = async (marketplace: Record<string, any>, email: string) => {
  const vendors = await marketplace.listVendors({ email })

  return (
    vendors.find((item: Record<string, any>) =>
      activeStatuses.includes(item.status)
    ) ||
    vendors[0] ||
    null
  )
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const email = String(req.query.email || "").trim().toLowerCase()

  if (!email) {
    res.status(400).json({ message: "Applicant email is required." })
    return
  }

  const vendor = await findVendorByEmail(marketplace, email)

  if (!vendor) {
    res.json({
      vendor: null,
      documents: [],
      review_events: [],
      tasks: [],
      messages: [],
    })
    return
  }

  const documents = await marketplace.listVendorDocuments({
    vendor_id: vendor.id,
  })
  const reviewEvents = await marketplace.listVendorReviewEvents({
    vendor_id: vendor.id,
  })
  const applicationTasks = await marketplace.listVendorApplicationTasks({
    vendor_id: vendor.id,
  })
  const applicationMessages = await marketplace.listVendorApplicationMessages({
    vendor_id: vendor.id,
    internal: false,
  })
  const metadata = vendor.metadata || {}

  res.json({
    vendor,
    documents,
    review_events: reviewEvents,
    tasks: applicationTasks.length
      ? applicationTasks
      : metadata.application_tasks || [],
    messages: applicationMessages.length
      ? applicationMessages
      : metadata.application_messages || [],
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const marketplace = marketplaceServiceOf(req)
  const body = (req.body || {}) as Record<string, any>
  const email = String(body.email || "").trim().toLowerCase()
  const action = String(body.action || "")

  if (!email) {
    res.status(400).json({ message: "Applicant email is required." })
    return
  }

  const vendor = await findVendorByEmail(marketplace, email)

  if (!vendor) {
    res.status(404).json({ message: "Maker application was not found." })
    return
  }

  const metadata = vendor.metadata || {}

  if (action === "message") {
    const text = String(body.text || "").trim()

    if (!text) {
      res.status(400).json({ message: "Message text is required." })
      return
    }

    const message = await marketplace.createVendorApplicationMessages({
      vendor_id: vendor.id,
      author_type: "applicant",
      author_user_id: null,
      body: text,
      internal: false,
      metadata: {
        source: "maker_application_portal",
      },
    })

    res.status(201).json({ message })
    return
  }

  if (action === "complete_task") {
    const taskId = String(body.task_id || "")
    const existingTasks = await marketplace.listVendorApplicationTasks({
      id: taskId,
      vendor_id: vendor.id,
    })

    if (!existingTasks[0]) {
      res.status(404).json({ message: "Application task was not found." })
      return
    }

    const task = await marketplace.updateVendorApplicationTasks({
      id: taskId,
      status: "completed",
      completed_at: new Date(),
    })

    res.json({ task })
    return
  }

  if (action === "document") {
    const title = String(body.title || "").trim()

    if (!title) {
      res.status(400).json({ message: "Document title is required." })
      return
    }

    const document = await marketplace.createVendorDocuments({
      vendor_id: vendor.id,
      document_type: body.document_type || "application",
      title,
      file_url: body.file_url || null,
      status: body.file_url ? "submitted" : "draft",
      metadata: {
        source: "maker_application_portal",
        storage_status: body.file_url ? "stored" : "missing",
        applicant_note: body.note || null,
      },
    })

    res.status(201).json({ document })
    return
  }

  res.status(400).json({ message: "Unsupported portal action." })
}
