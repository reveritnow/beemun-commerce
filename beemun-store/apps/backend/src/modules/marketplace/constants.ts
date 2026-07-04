export const BEEMUN_MARKETPLACE_MODULE = "beemun_marketplace"

export const VENDOR_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "suspended",
  "rejected",
  "archived",
]

export const VENDOR_MEMBER_ROLES = [
  "owner",
  "admin",
  "manager",
  "analyst",
]

export const VENDOR_MEMBER_STATUSES = [
  "invited",
  "active",
  "suspended",
  "removed",
]

export const VENDOR_DOCUMENT_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "needs_changes",
  "rejected",
  "expired",
]

export const VENDOR_PRODUCT_RELATIONSHIP_TYPES = [
  "maker",
  "brand_owner",
  "distributor",
  "fulfillment_partner",
]

export const PRODUCT_REVIEW_STATUSES = [
  "draft",
  "submitted",
  "automatic_checks",
  "pending_zps_review",
  "needs_changes",
  "approved",
  "published",
  "hidden",
  "rejected",
  "archived",
]

export const PRODUCT_QUALITY_SIGNAL_TYPES = [
  "zps_score",
  "ai_moderation",
  "ingredient_check",
  "packaging_check",
  "certification_check",
  "customer_quality_report",
  "manual_review",
]

export const REVIEW_EVENT_ACTOR_TYPES = [
  "admin",
  "vendor",
  "system",
  "ai",
]
