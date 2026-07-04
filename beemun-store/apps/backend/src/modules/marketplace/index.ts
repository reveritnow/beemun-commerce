import { Module } from "@medusajs/framework/utils"
import { BEEMUN_MARKETPLACE_MODULE } from "./constants"
import MarketplaceModuleService from "./service"

export { BEEMUN_MARKETPLACE_MODULE }

export default Module(BEEMUN_MARKETPLACE_MODULE, {
  service: MarketplaceModuleService,
})
