import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import MarketplaceModule from "../modules/marketplace"

export default defineLink(
  {
    linkable: ProductModule.linkable.product,
    isList: true,
  },
  {
    linkable: MarketplaceModule.linkable.vendorProduct,
    isList: true,
  },
  {
    database: {
      table: "beemun_product_vendor_product",
    },
  }
)
