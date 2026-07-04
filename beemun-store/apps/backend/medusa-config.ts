import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

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
    }
  },
  modules: [
    {
      resolve: "./src/modules/marketplace",
    },
  ],
})
