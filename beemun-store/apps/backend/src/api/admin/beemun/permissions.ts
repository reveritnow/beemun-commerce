import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ModuleRegistrationName } from "@medusajs/framework/utils"

export type BeemunApprovalRole = "super_admin" | "maker_reviewer" | "support"

const splitList = (value?: string) =>
  (value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

const superAdminEmails = () => splitList(process.env.BEEMUN_APPROVAL_SUPER_ADMIN_EMAILS)
const reviewerEmails = () => splitList(process.env.BEEMUN_APPROVAL_MAKER_REVIEWER_EMAILS)
const supportEmails = () => splitList(process.env.BEEMUN_APPROVAL_SUPPORT_EMAILS)
const superAdminIds = () => splitList(process.env.BEEMUN_APPROVAL_SUPER_ADMIN_IDS)
const reviewerIds = () => splitList(process.env.BEEMUN_APPROVAL_MAKER_REVIEWER_IDS)
const supportIds = () => splitList(process.env.BEEMUN_APPROVAL_SUPPORT_IDS)

const metadataRoles = (metadata?: Record<string, any> | null) => {
  const raw = metadata?.beemun_approval_role || metadata?.beemun_approval_roles
  const roles = Array.isArray(raw) ? raw : raw ? [raw] : []

  return roles.map((role) => String(role).trim().toLowerCase()).filter(Boolean)
}

const resolveAdminUser = async (req: MedusaRequest) => {
  const authContext = (req as any).auth_context || {}
  const actorId = String(authContext.actor_id || authContext.auth_identity_id || "").trim()
  const authMetadata = authContext.user_metadata || authContext.metadata || {}
  let user: Record<string, any> | null = null

  if (actorId) {
    try {
      const userService = req.scope.resolve(ModuleRegistrationName.USER)
      user = await userService.retrieveUser(actorId)
    } catch {
      user = null
    }
  }

  return {
    actorId: actorId.toLowerCase(),
    email: String(user?.email || authMetadata?.email || "").trim().toLowerCase(),
    metadata: {
      ...(authMetadata || {}),
      ...(user?.metadata || {}),
    },
  }
}

export const resolveBeemunApprovalRoles = async (
  req: MedusaRequest
): Promise<BeemunApprovalRole[]> => {
  const admin = await resolveAdminUser(req)
  const roles = new Set<BeemunApprovalRole>()

  if (
    (admin.email && superAdminEmails().includes(admin.email)) ||
    (admin.actorId && superAdminIds().includes(admin.actorId)) ||
    metadataRoles(admin.metadata).includes("super_admin")
  ) {
    roles.add("super_admin")
  }

  if (
    (admin.email && reviewerEmails().includes(admin.email)) ||
    (admin.actorId && reviewerIds().includes(admin.actorId)) ||
    metadataRoles(admin.metadata).includes("maker_reviewer")
  ) {
    roles.add("maker_reviewer")
  }

  if (
    (admin.email && supportEmails().includes(admin.email)) ||
    (admin.actorId && supportIds().includes(admin.actorId)) ||
    metadataRoles(admin.metadata).includes("support")
  ) {
    roles.add("support")
  }

  if (process.env.NODE_ENV !== "production" && !roles.size) {
    roles.add("super_admin")
  }

  return Array.from(roles)
}

export const requireBeemunApprovalRole = async (
  req: MedusaRequest,
  res: MedusaResponse,
  allowed: BeemunApprovalRole[] = ["super_admin", "maker_reviewer"]
) => {
  const roles = await resolveBeemunApprovalRoles(req)
  const isAllowed = roles.some((role) => allowed.includes(role))

  if (!isAllowed) {
    res.status(403).json({
      message:
        "You do not have permission to access the BEEMUN maker approval workflow.",
      code: "beemun_approval_forbidden",
    })
    return false
  }

  return true
}
