import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { Pool } from "pg"

const databaseUrl = process.env.BEEMUN_AUTH_DATABASE_URL || process.env.DATABASE_URL
const authSecret = process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_STOREFRONT_URL ||
  "http://localhost:8000"

if (!databaseUrl && process.env.NODE_ENV === "production") {
  console.warn("BEEMUN auth database URL is not configured.")
}

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    })
  : undefined

const logEmail = async (kind: string, email: string, url: string) => {
  console.info(`[BEEMUN auth] ${kind} email for ${email}: ${url}`)
}

export const auth = betterAuth({
  baseURL,
  secret: authSecret || "beemun-development-auth-secret-change-me",
  database: pool as any,
  user: {
    modelName: "beemun_auth_user",
  },
  account: {
    modelName: "beemun_auth_account",
  },
  verification: {
    modelName: "beemun_auth_verification",
  },
  trustedOrigins: [
    baseURL,
    process.env.NEXT_PUBLIC_STOREFRONT_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean) as string[],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }: any) => {
      await logEmail("Password reset", user.email, url)
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }: any) => {
      await logEmail("Verification", user.email, url)
    },
  },
  socialProviders: {
    google:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }
        : undefined,
  },
  session: {
    modelName: "beemun_auth_session",
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    cookiePrefix: "beemun",
    useSecureCookies: process.env.NODE_ENV === "production",
  },
  plugins: [nextCookies()],
})

export type BeemunSession = Awaited<ReturnType<typeof auth.api.getSession>>
