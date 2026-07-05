import { MedusaService } from "@medusajs/framework/utils"
import {
  ProductQualitySignal,
  ProductReview,
  ProductReviewEvent,
  Vendor,
  VendorApplicationMessage,
  VendorApplicationTask,
  VendorDocument,
  VendorInvite,
  VendorMember,
  VendorProduct,
  VendorReviewEvent,
} from "./models"

class MarketplaceModuleService extends MedusaService({
  ProductQualitySignal,
  ProductReview,
  ProductReviewEvent,
  Vendor,
  VendorApplicationMessage,
  VendorApplicationTask,
  VendorDocument,
  VendorInvite,
  VendorMember,
  VendorProduct,
  VendorReviewEvent,
}) {}

export default MarketplaceModuleService
