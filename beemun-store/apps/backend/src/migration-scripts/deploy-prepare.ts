import { spawn } from "child_process"
import { Client } from "pg"

import {
  createDocumentStorageSql,
  DOCUMENT_STORAGE_TABLE_NAME,
} from "./document-storage-sql"

const log = (message: string) => {
  console.log(`[BEEMUN deploy] ${message}`)
}

const errorLog = (message: string) => {
  console.error(`[BEEMUN deploy] ${message}`)
}

const numberFromEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const runMedusaMigrations = async () => {
  log("migrations started")

  const command = process.platform === "win32" ? "npx.cmd" : "npx"
  const idleExitMs = numberFromEnv("BEEMUN_DEPLOY_MIGRATION_IDLE_EXIT_MS", 45_000)
  const hardTimeoutMs = numberFromEnv("BEEMUN_DEPLOY_MIGRATION_TIMEOUT_MS", 8 * 60_000)

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, ["medusa", "db:migrate"], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let settled = false
    let sawMigrationsCompleted = false
    let sawLinkSync = false
    let lastOutputAt = Date.now()
    let idleTimer: NodeJS.Timeout
    let hardTimer: NodeJS.Timeout

    const finish = (error?: Error) => {
      if (settled) {
        return
      }

      settled = true
      if (idleTimer) {
        clearInterval(idleTimer)
      }

      if (hardTimer) {
        clearTimeout(hardTimer)
      }

      if (!child.killed) {
        child.kill("SIGTERM")
      }

      if (error) {
        reject(error)
      } else {
        resolve()
      }
    }

    const observe = (chunk: Buffer, stream: NodeJS.WriteStream) => {
      const output = chunk.toString()
      lastOutputAt = Date.now()
      stream.write(output)

      if (/Migrations completed/i.test(output)) {
        sawMigrationsCompleted = true
      }

      if (/Syncing links/i.test(output)) {
        sawLinkSync = true
      }
    }

    child.stdout.on("data", (chunk) => observe(chunk, process.stdout))
    child.stderr.on("data", (chunk) => observe(chunk, process.stderr))

    child.on("error", (error) => {
      finish(error)
    })

    child.on("exit", (code, signal) => {
      if (settled) {
        return
      }

      if (code === 0) {
        log("migrations completed")
        finish()
        return
      }

      finish(
        new Error(
          `Medusa migrations failed with code ${code ?? "null"} and signal ${signal ?? "null"}.`
        )
      )
    })

    idleTimer = setInterval(() => {
      const idleForMs = Date.now() - lastOutputAt

      if (sawMigrationsCompleted && sawLinkSync && idleForMs >= idleExitMs) {
        log(
          `migrations completed and link sync became idle for ${idleForMs}ms; ending pre-deploy migration process cleanly`
        )
        finish()
      }
    }, 1_000)

    hardTimer = setTimeout(() => {
      finish(
        new Error(
          `Medusa migrations did not finish within ${hardTimeoutMs}ms. Last state: migrations_completed=${sawMigrationsCompleted}, link_sync_seen=${sawLinkSync}.`
        )
      )
    }, hardTimeoutMs)
  })
}

const verifyDocumentStorage = async () => {
  log("document storage verification started")

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for deploy preparation.")
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes("sslmode=require") || databaseUrl.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : undefined,
  })

  await client.connect()

  try {
    await client.query(createDocumentStorageSql)

    const result = await client.query(
      "select to_regclass('public.beemun_vendor_document_file') as table_name"
    )
    const tableName = result.rows[0]?.table_name

    if (tableName !== DOCUMENT_STORAGE_TABLE_NAME) {
      throw new Error(
        `Document storage verification failed. Expected ${DOCUMENT_STORAGE_TABLE_NAME}, got ${tableName || "null"}.`
      )
    }

    log("document storage verified")
  } finally {
    await client.end()
  }
}

const main = async () => {
  log("deploy preparation started")
  await runMedusaMigrations()
  await verifyDocumentStorage()
  log("deploy preparation completed")
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    errorLog(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })