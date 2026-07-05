import { defineMiddlewares } from "@medusajs/framework/http"

const makerApplicationUploadBodyParser = {
  sizeLimit: "8mb",
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/vendor/beemun/onboarding",
      methods: ["POST"],
      bodyParser: makerApplicationUploadBodyParser,
    },
    {
      matcher: "/vendor/beemun/portal",
      methods: ["POST"],
      bodyParser: makerApplicationUploadBodyParser,
    },
  ],
})
