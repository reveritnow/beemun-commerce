import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getRegion } from "@lib/data/regions"
import { retrieveMakerWithApprovedProducts } from "@lib/data/makers"
import ProductPreview from "@modules/products/components/product-preview"

export const dynamic = "force-dynamic"
export const revalidate = 0

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode, handle } = await props.params
  const { maker } = await retrieveMakerWithApprovedProducts({
    handle,
    countryCode,
  })

  return {
    title: maker ? `${maker.name} - BEEMUN Maker` : "BEEMUN Maker",
    description:
      maker?.description ||
      "A BEEMUN approved maker with public ZPS 100 products.",
  }
}

export default async function MakerPage(props: Props) {
  const { countryCode, handle } = await props.params
  const region = await getRegion(countryCode).catch(() => null)

  if (!region) {
    notFound()
  }

  const { maker, products } = await retrieveMakerWithApprovedProducts({
    handle,
    countryCode,
  })

  if (!maker || !products.length) {
    notFound()
  }

  return (
    <main className="beemun-maker-page">
      <section className="beemun-info-hero beemun-maker-hero">
        <p className="beemun-eyebrow">BEEMUN Approved Maker</p>
        <h1>{maker.name}</h1>
        <p>
          {maker.story ||
            maker.description ||
            "An approved BEEMUN maker with public products that pass the ZPS 100 visibility standard."}
        </p>
        <div className="beemun-pill-row">
          <span>ZPS 100 Approved Maker</span>
          {maker.location && <span>{maker.location}</span>}
          <Link href={`/${countryCode}/zps-100`}>What approval means</Link>
        </div>
      </section>

      <section className="beemun-section beemun-product-split">
        <article className="beemun-product-story-card dark">
          <p className="beemun-eyebrow">Why BEEMUN approved this maker</p>
          <h2>Disclosure before discovery.</h2>
          <p>
            {maker.approved_reason ||
              "BEEMUN approved this maker because their public products can be presented with ingredient clarity, packaging accountability, and review context."}
          </p>
        </article>
        <article className="beemun-product-story-card">
          <p className="beemun-eyebrow">BEEMUN review summary</p>
          <h2>Reviewed for the marketplace standard.</h2>
          <p>
            {maker.review_summary ||
              "This maker is public only while approved by BEEMUN and connected to products that pass the ZPS 100 product visibility gate."}
          </p>
        </article>
      </section>

      <section className="beemun-section">
        <div className="beemun-three-grid">
          <article className="beemun-card">
            <div className="beemun-seal-icon">IN</div>
            <h3>Ingredient and material philosophy</h3>
            <p>
              {maker.ingredient_philosophy ||
                "This maker is expected to keep ingredient and material choices legible before checkout."}
            </p>
          </article>
          <article className="beemun-card">
            <div className="beemun-seal-icon">PK</div>
            <h3>Packaging philosophy</h3>
            <p>
              {maker.packaging_philosophy ||
                "BEEMUN expects packaging details to remain specific, visible, and accountable."}
            </p>
          </article>
          <article className="beemun-card">
            <div className="beemun-seal-icon">BR</div>
            <h3>Approval status</h3>
            <p>
              ZPS 100 Approved Maker. Public products shown here are filtered
              through the same BEEMUN product visibility gate used across the
              storefront.
            </p>
          </article>
        </div>
      </section>

      <section className="beemun-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Approved public products</p>
          <h2>Products from {maker.name}.</h2>
          <p>
            Only products that are Medusa published and BEEMUN ZPS approved are
            shown here.
          </p>
        </div>
        <ul className="beemun-maker-product-grid">
          {products.map((product) => (
            <li key={product.id}>
              <ProductPreview product={product} region={region} makerName={maker.name} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
