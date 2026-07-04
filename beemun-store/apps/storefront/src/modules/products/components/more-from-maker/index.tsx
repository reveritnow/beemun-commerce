import Link from "next/link"
import { PublicMaker, retrieveMoreFromMaker } from "@lib/data/makers"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "../product-preview"

type MoreFromMakerProps = {
  maker: PublicMaker | null
  currentProductId: string
  countryCode: string
}

export default async function MoreFromMaker({
  maker,
  currentProductId,
  countryCode,
}: MoreFromMakerProps) {
  if (!maker) {
    return null
  }

  const region = await getRegion(countryCode).catch(() => null)

  if (!region) {
    return null
  }

  const products = await retrieveMoreFromMaker({
    maker,
    currentProductId,
    countryCode,
  })

  if (!products.length) {
    return null
  }

  return (
    <section className="beemun-product-section beemun-more-from-maker">
      <div className="beemun-product-section-head">
        <p className="beemun-eyebrow">More from this maker</p>
        <h2>More approved products from {maker.name}.</h2>
        <p>
          Every product here passes the same Medusa published and BEEMUN ZPS
          approval gate.
        </p>
        <Link href={`/${countryCode}/makers/${maker.handle}`}>
          Visit {maker.name}
        </Link>
      </div>
      <ul className="beemun-maker-product-grid">
        {products.map((product) => (
          <li key={product.id}>
            <ProductPreview product={product} region={region} makerName={maker.name} />
          </li>
        ))}
      </ul>
    </section>
  )
}
