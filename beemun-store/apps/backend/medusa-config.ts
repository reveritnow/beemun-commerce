import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const isProduction = process.env.NODE_ENV === "production"
const r2FileUrl =
  process.env.BEEMUN_FILE_PUBLIC_URL ||
  process.env.S3_FILE_URL ||
  "https://private-media.beemun.invalid"

const r2Config = {
  bucket: process.env.BEEMUN_FILE_BUCKET || process.env.S3_BUCKET,
  endpoint: process.env.BEEMUN_FILE_ENDPOINT || process.env.S3_ENDPOINT,
  accessKeyId:
    process.env.BEEMUN_FILE_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
  secretAccessKey:
    process.env.BEEMUN_FILE_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.BEEMUN_FILE_REGION || process.env.S3_REGION || "auto",
  prefix: process.env.BEEMUN_FILE_PREFIX || "product-media",
  forcePathStyle: (process.env.BEEMUN_FILE_FORCE_PATH_STYLE || "true") !== "false",
}

const missingR2Env = [
  ["BEEMUN_FILE_BUCKET", r2Config.bucket],
  ["BEEMUN_FILE_ENDPOINT", r2Config.endpoint],
  ["BEEMUN_FILE_ACCESS_KEY_ID", r2Config.accessKeyId],
  ["BEEMUN_FILE_SECRET_ACCESS_KEY", r2Config.secretAccessKey],
].filter(([, value]) => !value)

if (isProduction && missingR2Env.length) {
  throw new Error(
    `BEEMUN production file storage is not configured. Missing backend env: ${missingR2Env
      .map(([name]) => name)
      .join(", ")}.`
  )
}

const fileProvider = missingR2Env.length
  ? {
      resolve: "@medusajs/file-local",
      id: "beemun-local",
      options: {
        upload_dir: "static",
        private_upload_dir: "static",
        backend_url:
          process.env.MEDUSA_BACKEND_URL || "http://localhost:9000/static",
      },
    }
  : {
      resolve: "@medusajs/file-s3",
      id: "beemun-r2",
      options: {
        file_url: r2FileUrl,
        access_key_id: r2Config.accessKeyId,
        secret_access_key: r2Config.secretAccessKey,
        region: r2Config.region,
        bucket: r2Config.bucket,
        endpoint: r2Config.endpoint,
        prefix: r2Config.prefix,
        cache_control: "public, max-age=31536000, immutable",
        additional_client_config: {
          forcePathStyle: r2Config.forcePathStyle,
        },
      },
    }

const defaultStoreCors = [
  "http://localhost:8000",
  "http://localhost:3000",
  "http://localhost:3001",
].join(",")

const defaultAdminCors = [
  "http://localhost:7001",
  "http://localhost:9000",
  "http://localhost:5173",
].join(",")

module.exports = defineConfig({
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    storefrontUrl: process.env.MEDUSA_STOREFRONT_URL,
    vite: () => ({
      resolve: {
        alias: [
          {
            find: /^date-fns\/locale$/,
            replacement: require.resolve("date-fns/locale"),
          },
          {
            find: /^date-fns$/,
            replacement: require.resolve("date-fns"),
          },
          {
            find: /^react-aria$/,
            replacement: require.resolve("react-aria"),
          },
        ],
      },
    }),
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS || defaultStoreCors,
      adminCors: process.env.ADMIN_CORS || defaultAdminCors,
      authCors: process.env.AUTH_CORS || defaultAdminCors,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  modules: [
    {
      resolve: "./src/modules/marketplace",
    },
    {
      resolve: "@medusajs/file",
      options: {
        providers: [fileProvider],
      },
    },
  ],
})