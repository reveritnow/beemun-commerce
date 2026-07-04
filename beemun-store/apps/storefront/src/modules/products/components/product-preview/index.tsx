import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  makerName,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  makerName?: string
  region: HttpTypes.StoreRegion
}) {
  // const pricedProduct = await listProducts({
  //   regionId: region.id,
  //   queryParams: { id: [product.id!] },
  // }).then(({ response }) => response.products[0])

  // if (!pricedProduct) {
  //   return null
  // }

  const { cheapestPrice } = getProductPrice({
    product,
  })

  const maker = makerName || product.collection?.title || "BEEMUN Maker"

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group beemun-listing-product-card">
      <article data-testid="product-wrapper">
        <div className="beemun-card-media">
          <span className="beemun-card-badge">ZPS 100</span>
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
          />
        </div>
        <div className="beemun-card-body">
          <span className="beemun-card-maker">by {maker}</span>
          <div className="beemun-card-title-row">
            <h3 className="beemun-card-title" data-testid="product-title">
              {product.title}
            </h3>
            <div className="beemun-card-price">
              {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
            </div>
          </div>
          <div className="beemun-card-trust">
            <span>ZP</span>
            <span>ZS</span>
            <span>FD</span>
            <span>BR</span>
          </div>
        </div>
      </article>
    </LocalizedClientLink>
  )
}
