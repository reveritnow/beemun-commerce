import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  createVendorFromOnboarding,
  onboardingErrorFromUnknown,
} from "../helpers"
import {
  assertPortalDocumentAccess,
  DocumentUploadError,
} from "../document-storage"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    assertPortalDocumentAccess(req.headers)
    const result = await createVendorFromOnboarding(req)

    res.status(201).json(result)
  } catch (error) {
    if (error instanceof DocumentUploadError) {
      res.status(error.status).json({
        message: error.message,
        code: error.code,
      })
      return
    }

    const logger = req.scope.resolve("logger")
    const publicError = onboardingErrorFromUnknown(error)
    const technicalMessage =
      error instanceof Error ? error.stack || error.message : String(error)

    if (publicError.status >= 500) {
      logger.error(`BEEMUN maker onboarding failed: ${technicalMessage}`)
    } else {
      logger.warn(
        `BEEMUN maker onboarding rejected (${publicError.code}): ${technicalMessage}`
      )
    }

    res.status(publicError.status).json({
      message: publicError.message,
      code: publicError.code,
    })
  }
}
