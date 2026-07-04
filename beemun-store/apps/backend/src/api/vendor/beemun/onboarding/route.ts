import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OnboardingError, createVendorFromOnboarding } from "../helpers"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const result = await createVendorFromOnboarding(req)

    res.status(201).json(result)
  } catch (error) {
    const logger = req.scope.resolve("logger")
    const message =
      error instanceof Error
        ? error.message
        : "The maker application could not be submitted."
    const status = error instanceof OnboardingError ? error.status : 500

    logger.warn(`BEEMUN maker onboarding failed: ${message}`)

    res.status(status).json({
      message:
        status === 500
          ? "The maker application could not be submitted. Please try again or contact BEEMUN."
          : message,
    })
  }
}
