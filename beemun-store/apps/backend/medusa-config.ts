import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const beemunFileUrl =
  process.env.BEEMUN_FILE_PUBLIC_URL ||
  process.env.S3_FILE_URL ||
  "https://private-media.beemun.invalid"

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
        provider: {
          resolve: "@medusajs/file-s3",
          id: "beemun-r2",
          options: {
            fileUrl: beemunFileUrl,
            file_url: beemunFileUrl,
            accessKeyId:
              process.env.BEEMUN_FILE_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
            access_key_id:
              process.env.BEEMUN_FILE_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
            secretAccessKey:
              process.env.BEEMUN_FILE_SECRET_ACCESS_KEY ||
              process.env.S3_SECRET_ACCESS_KEY,
            secret_access_key:
              process.env.BEEMUN_FILE_SECRET_ACCESS_KEY ||
              process.env.S3_SECRET_ACCESS_KEY,
            region: process.env.BEEMUN_FILE_REGION || process.env.S3_REGION || "auto",
            bucket: process.env.BEEMUN_FILE_BUCKET || process.env.S3_BUCKET,
            endpoint: process.env.BEEMUN_FILE_ENDPOINT || process.env.S3_ENDPOINT,
            prefix: process.env.BEEMUN_FILE_PREFIX || "product-media",
            cacheControl: "public, max-age=31536000, immutable",
            cache_control: "public, max-age=31536000, immutable",
            additionalClientConfig: {
              forcePathStyle:
                (process.env.BEEMUN_FILE_FORCE_PATH_STYLE || "true") !== "false",
            },
            additional_client_config: {
              forcePathStyle:
                (process.env.BEEMUN_FILE_FORCE_PATH_STYLE || "true") !== "false",
            },
          },
        },
      },
    },
  ],
})

