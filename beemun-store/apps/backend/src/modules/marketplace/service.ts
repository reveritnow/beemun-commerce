import { MedusaService } from "@medusajs/framework/utils"
import {
  ProductQualitySignal,
  ProductReview,
  ProductReviewEvent,
  Vendor,
  VendorDocument,
  VendorInvite,
  VendorMember,
  VendorProduct,
} from "./models"

class MarketplaceModuleService extends MedusaService({
  ProductQualitySignal,
  ProductReview,
  ProductReviewEvent,
  Vendor,
  VendorDocument,
  VendorInvite,
  VendorMember,
  VendorProduct,
}) {}

export default MarketplaceModuleService
