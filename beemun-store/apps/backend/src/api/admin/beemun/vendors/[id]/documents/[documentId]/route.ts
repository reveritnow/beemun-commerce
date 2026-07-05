import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { marketplaceServiceOf } from "../../../../marketplace/helpers"
import { requireBeemunApprovalRole } from "../../../../permissions"

const actionConfig = {
  verify: {
    status: "approved",
    reason: "Document verified",
  },
  reject: {
    status: "rejected",
    reason: "Document rejected",
  },
  request_replacement: {
    status: "needs_changes",
    reason: "Document replacement requested",
  },
} as const

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  if (!(await requireBeemunApprovalRole(req, res))) {
    return
  }

  const marketplace = marketplaceServiceOf(req)
  const vendorId = String(req.params.id || "")
  const documentId = String(req.params.documentId || "")
  const body = (req.body || {}) as Record<string, any>
  const action = String(body.action || "") as keyof typeof actionConfig
  const config = actionConfig[action]

  if (!config) {
    res.status(400).json({
      message: "Document action must be verify, reject, or request_replacement.",
    })
    return
  }

  const documents = await marketplace.listVendorDocuments({
    id: documentId,
    vendor_id: vendorId,
  })
  const vendor = await marketplace.retrieveVendor(vendorId)
  const document = documents[0]

  if (!document) {
    res.status(404).json({ message: "Document was not found for this maker." })
    return
  }

  const note = String(body.note || "").trim()
  const actorId = (req as any).auth_context?.actor_id || null
  const updated = await marketplace.updateVendorDocuments({
    id: document.id,
    status: config.status,
    reviewed_at: new Date(),
    reviewer_user_id: actorId,
    review_notes: note || config.reason,
    metadata: {
      ...(document.metadata || {}),
      review_action: action,
      review_note: note || null,
      reviewed_at: new Date().toISOString(),
    },
  })

  if (action === "request_replacement") {
    const title = `Replace ${document.title}`
    const description =
      note ||
      "Please upload a clearer replacement document so BEEMUN can continue the review."

    const task = await marketplace.createVendorApplicationTasks({
      vendor_id: vendorId,
      title,
      description,
      status: "pending",
      requested_by_user_id: actorId,
      metadata: {
        source: "document_review",
        document_id: document.id,
        document_type: document.document_type,
      },
    })

    await marketplace.createVendorApplicationMessages({
      vendor_id: vendorId,
      author_type: "admin",
      author_user_id: actorId,
      body: `BEEMUN requested a replacement for ${document.title}. ${description}`,
      internal: false,
      metadata: {
        source: "document_review",
        document_id: document.id,
        task_id: task.id,
      },
    })
  }

  await marketplace.createVendorReviewEvents({
    vendor_id: vendorId,
    from_status: vendor.status,
    to_status: vendor.status,
    actor_type: "admin",
    actor_user_id: actorId,
    reason: config.reason,
    notes: note || null,
    metadata: {
      source: "document_review",
      document_id: document.id,
      document_type: document.document_type,
      action,
    },
  })

  res.json({ document: updated })
}
