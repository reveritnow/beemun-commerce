import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Client } from "pg"

import {
  createDocumentStorageSql,
  DOCUMENT_STORAGE_TABLE_NAME,
} from "./document-storage-sql"

export default async function ensure_document_storage({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required to verify BEEMUN document storage."
    )
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl:
      databaseUrl.includes("sslmode=require") ||
      databaseUrl.includes("neon.tech")
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
        `BEEMUN document storage table verification failed. Expected ${DOCUMENT_STORAGE_TABLE_NAME}, got ${tableName || "null"}.`
      )
    }

    logger.info(
      "BEEMUN document storage verified: public.beemun_vendor_document_file exists."
    )
  } finally {
    await client.end()
  }
}