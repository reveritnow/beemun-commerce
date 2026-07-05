import pg from "pg"

const { Pool } = pg

const databaseUrl = process.env.BEEMUN_AUTH_DATABASE_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  console.error(
    "BEEMUN_AUTH_DATABASE_URL is required to set up BEEMUN auth tables."
  )
  process.exit(1)
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
})

const sql = `
CREATE TABLE IF NOT EXISTS "beemun_auth_user" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "emailVerified" boolean NOT NULL DEFAULT false,
  "image" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "beemun_auth_session" (
  "id" text PRIMARY KEY,
  "expiresAt" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" text NOT NULL REFERENCES "beemun_auth_user"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "beemun_auth_session_user_id_idx"
  ON "beemun_auth_session" ("userId");

CREATE TABLE IF NOT EXISTS "beemun_auth_account" (
  "id" text PRIMARY KEY,
  "accountId" text NOT NULL,
  "providerId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "beemun_auth_user"("id") ON DELETE CASCADE,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamp,
  "refreshTokenExpiresAt" timestamp,
  "scope" text,
  "password" text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "beemun_auth_account_user_id_idx"
  ON "beemun_auth_account" ("userId");

CREATE TABLE IF NOT EXISTS "beemun_auth_verification" (
  "id" text PRIMARY KEY,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "beemun_auth_verification_identifier_idx"
  ON "beemun_auth_verification" ("identifier");
`

try {
  await pool.query(sql)
  console.log("BEEMUN auth tables are ready.")
} catch (error) {
  console.error("Failed to set up BEEMUN auth tables.")
  console.error(error)
  process.exitCode = 1
} finally {
  await pool.end()
}
