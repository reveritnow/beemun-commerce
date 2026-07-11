import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ModuleRegistrationName } from "@medusajs/framework/utils"

export type BeemunApprovalRole = "super_admin" | "maker_reviewer" | "support"

type AdminResolutionDiagnostics = {
  actorIdExists: boolean
  authIdentityIdExists: boolean
  userResolutionSucceeded: boolean
  authIdentityResolutionSucceeded: boolean
  resolvedEmail: string
  resolvedRoles: BeemunApprovalRole[]
}

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

const text = (value: unknown) => String(value || "").trim()
const lower = (value: unknown) => text(value).toLowerCase()

const emailFrom = (...values: unknown[]) => {
  for (const value of values) {
    if (!value) {
      continue
    }

    if (typeof value === "string" && value.includes("@")) {
      return lower(value)
    }

    if (typeof value === "object") {
      const record = value as Record<string, any>
      const nested = emailFrom(
        record.email,
        record.email_address,
        record.emailAddress,
        record.user?.email,
        record.user_metadata?.email,
        record.metadata?.email,
        record.provider_metadata?.email,
        record.identity_metadata?.email,
        record.app_metadata?.email
      )

      if (nested) {
        return nested
      }
    }
  }

  return ""
}

const resolveLogger = (req: MedusaRequest) => {
  try {
    return req.scope.resolve("logger") as { info?: (message: string, meta?: any) => void }
  } catch {
    return null
  }
}

const safeResolve = <T = any>(req: MedusaRequest, key: string): T | null => {
  try {
    return req.scope.resolve(key) as T
  } catch {
    return null
  }
}

const retrieveUserById = async (req: MedusaRequest, id: string) => {
  if (!id) {
    return null
  }

  try {
    const userService = req.scope.resolve(ModuleRegistrationName.USER) as Record<string, any>
    return await userService.retrieveUser(id)
  } catch {
    return null
  }
}

const resolveAuthIdentity = async (req: MedusaRequest, identityId: string) => {
  if (!identityId) {
    return null
  }

  const authService =
    safeResolve<Record<string, any>>(req, (ModuleRegistrationName as any).AUTH) ||
    safeResolve<Record<string, any>>(req, "auth")

  if (!authService) {
    return null
  }

  try {
    if (typeof authService.retrieveAuthIdentity === "function") {
      return await authService.retrieveAuthIdentity(identityId, {
        relations: ["provider_identities"],
      })
    }
  } catch {
    // Continue to list-based fallback below.
  }

  try {
    if (typeof authService.listAuthIdentities === "function") {
      const identities = await authService.listAuthIdentities(
        { id: identityId },
        { relations: ["provider_identities"], take: 1 }
      )
      return identities?.[0] || null
    }
  } catch {
    return null
  }

  return null
}

const resolveProviderIdentities = async (req: MedusaRequest, authIdentityId: string) => {
  if (!authIdentityId) {
    return []
  }

  const authService =
    safeResolve<Record<string, any>>(req, (ModuleRegistrationName as any).AUTH) ||
    safeResolve<Record<string, any>>(req, "auth")

  if (!authService || typeof authService.listProviderIdentities !== "function") {
    return []
  }

  try {
    return await authService.listProviderIdentities({ auth_identity_id: authIdentityId })
  } catch {
    return []
  }
}

const authContextIds = (authContext: Record<string, any>) => {
  const actorId = text(authContext.actor_id)
  const authIdentityId = text(
    authContext.auth_identity_id ||
      authContext.authIdentityId ||
      authContext.auth_identity?.id ||
      authContext.authIdentity?.id ||
      (actorId.startsWith("authid_") ? actorId : "")
  )

  return { actorId, authIdentityId }
}

const resolveAdminUser = async (req: MedusaRequest) => {
  const authContext = ((req as any).auth_context || {}) as Record<string, any>
  const { actorId, authIdentityId } = authContextIds(authContext)
  const authMetadata = authContext.user_metadata || authContext.metadata || {}
  const possibleUserIds = Array.from(
    new Set(
      [
        authContext.user_id,
        authContext.userId,
        authContext.user?.id,
        authContext.actor?.id,
        actorId && !actorId.startsWith("authid_") ? actorId : "",
      ]
        .map(text)
        .filter(Boolean)
    )
  )

  let user: Record<string, any> | null = null

  for (const id of possibleUserIds) {
    user = await retrieveUserById(req, id)

    if (user) {
      break
    }
  }

  let authIdentity: Record<string, any> | null = null
  const identityId = authIdentityId || (actorId.startsWith("authid_") ? actorId : "")

  if (identityId) {
    authIdentity = await resolveAuthIdentity(req, identityId)
  }

  const providerIdentities =
    authIdentity?.provider_identities ||
    authIdentity?.providerIdentities ||
    (await resolveProviderIdentities(req, identityId))

  const email = emailFrom(
    user,
    authMetadata,
    authContext,
    authIdentity,
    ...(Array.isArray(providerIdentities) ? providerIdentities : [])
  )

  const metadata = {
    ...(authMetadata || {}),
    ...(authIdentity?.metadata || {}),
    ...(user?.metadata || {}),
  }

  return {
    actorId: lower(actorId),
    authIdentityId: lower(identityId),
    userId: lower(user?.id),
    email,
    metadata,
    diagnostics: {
      actorIdExists: Boolean(actorId),
      authIdentityIdExists: Boolean(identityId),
      userResolutionSucceeded: Boolean(user),
      authIdentityResolutionSucceeded: Boolean(authIdentity),
      resolvedEmail: email,
      resolvedRoles: [] as BeemunApprovalRole[],
    },
  }
}

const logPermissionDiagnostics = (
  req: MedusaRequest,
  diagnostics: AdminResolutionDiagnostics
) => {
  const logger = resolveLogger(req)
  const payload = {
    actor_id_exists: diagnostics.actorIdExists,
    auth_identity_id_exists: diagnostics.authIdentityIdExists,
    user_resolution_succeeded: diagnostics.userResolutionSucceeded,
    auth_identity_resolution_succeeded: diagnostics.authIdentityResolutionSucceeded,
    resolved_email: diagnostics.resolvedEmail || null,
    resolved_roles: diagnostics.resolvedRoles,
  }

  if (logger?.info) {
    logger.info("BEEMUN admin permission resolution", payload)
  } else {
    console.info("BEEMUN admin permission resolution", payload)
  }
}

export const resolveBeemunApprovalRoles = async (
  req: MedusaRequest
): Promise<BeemunApprovalRole[]> => {
  const admin = await resolveAdminUser(req)
  const roles = new Set<BeemunApprovalRole>()
  const candidateIds = [admin.actorId, admin.authIdentityId, admin.userId].filter(Boolean)

  if (
    (admin.email && superAdminEmails().includes(admin.email)) ||
    candidateIds.some((id) => superAdminIds().includes(id)) ||
    metadataRoles(admin.metadata).includes("super_admin")
  ) {
    roles.add("super_admin")
  }

  if (
    (admin.email && reviewerEmails().includes(admin.email)) ||
    candidateIds.some((id) => reviewerIds().includes(id)) ||
    metadataRoles(admin.metadata).includes("maker_reviewer")
  ) {
    roles.add("maker_reviewer")
  }

  if (
    (admin.email && supportEmails().includes(admin.email)) ||
    candidateIds.some((id) => supportIds().includes(id)) ||
    metadataRoles(admin.metadata).includes("support")
  ) {
    roles.add("support")
  }

  if (process.env.NODE_ENV !== "production" && !roles.size) {
    roles.add("super_admin")
  }

  const resolvedRoles = Array.from(roles)
  logPermissionDiagnostics(req, {
    ...admin.diagnostics,
    resolvedRoles,
  })

  return resolvedRoles
}

export const requireBeemunApprovalRole = async (
  req: MedusaRequest,
  res: MedusaResponse,
  allowed: BeemunApprovalRole[] = ["super_admin", "maker_reviewer"]
) => {
  const roles = await resolveBeemunApprovalRoles(req)
  const isAllowed = roles.some((role) => allowed.includes(role))

  if (!isAllowed) {
    const admin = process.env.NODE_ENV !== "production" ? await resolveAdminUser(req) : null

    res.status(403).json({
      message:
        process.env.NODE_ENV !== "production" && admin?.email
          ? `You do not have permission to access the BEEMUN maker approval workflow. Resolved admin email: ${admin.email}.`
          : "You do not have permission to access the BEEMUN maker approval workflow.",
      code: "beemun_approval_forbidden",
    })
    return false
  }

  return true
}