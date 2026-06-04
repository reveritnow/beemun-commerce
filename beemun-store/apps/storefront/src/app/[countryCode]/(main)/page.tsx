import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "BEEMUN — Zero Plastic Zero Synthetic Marketplace",
  description: "A curated ZPS 100 marketplace for products reviewed for ingredient clarity, packaging transparency, and maker accountability.",
}

const trust = [
  ["Zero Plastic", "Packaging is reviewed before products go live."],
  ["Zero Synthetic", "Ingredient labels are checked for hidden synthetic claims."],
  ["Full Disclosure", "Ingredients, packaging, and maker details stay visible."],
  ["Maker Reviewed", "Sellers and products go through BEEMUN review."],
]

const categories = [
  ["Skin & Body", "Clean everyday care with ingredient transparency."],
  ["Hair Care", "Oils, cleansers, and routines with clearer labels."],
  ["Home Care", "Useful home products with packaging visibility."],
  ["Wellness", "Simple, reviewed essentials from accountable makers."],
]

const zps = [
  ["Ingredient clarity", "No vague blends or unclear claims before checkout."],
  ["Packaging clarity", "Primary and shipping packaging notes are disclosed."],
  ["Review trail", "BEEMUN review signals help customers buy with context."],
]

export default async function Home(props: { params: Promise<{ countryCode: string }> }) {
  const params = await props.params
  const { countryCode } = params
  const region = await getRegion(countryCode)
  const { collections } = await listCollections({ fields: "id, handle, title" })

  return (
    <>
      <Hero />
      <section className="beemun-section">
        <div className="beemun-section-head"><p className="beemun-eyebrow">Trust first</p><h2>Not just natural. Reviewed for purity.</h2><p>BEEMUN is built for customers who want to know what is inside the product, how it is packed, and who made it.</p></div>
        <div className="beemun-four-grid">{trust.map(([title, text]) => <article className="beemun-card" key={title}><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section className="beemun-section beemun-soft-section" id="categories">
        <div className="beemun-section-head"><p className="beemun-eyebrow">Shop by category</p><h2>Start with what you use every day.</h2><p>Explore essentials through a ZPS lens, from personal care to home care and wellness basics.</p></div>
        <div className="beemun-four-grid">{categories.map(([title, text]) => <article className="beemun-card beemun-category-card" key={title}><div className="beemun-card-image" /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section className="beemun-section" id="zps">
        <div className="beemun-zps-grid"><div><p className="beemun-eyebrow">How ZPS works</p><h2>Three checks before a product earns attention.</h2><p>BEEMUN does not rely on pretty packaging or broad natural claims. Each listing is designed around visible proof and customer clarity.</p></div><div className="beemun-three-grid">{zps.map(([title, text]) => <article className="beemun-card" key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></div>
      </section>
      <section className="beemun-section" id="featured">
        <div className="beemun-section-head"><p className="beemun-eyebrow">Featured products</p><h2>ZPS 100 products will appear here.</h2><p>Once BEEMUN products are added in Medusa, this section will use the native product system instead of custom static cards.</p></div>
        {collections && region ? <div className="beemun-medusa-products"><ul><FeaturedProducts collections={collections} region={region} /></ul></div> : <div className="beemun-three-grid"><article className="beemun-card"><h3>Cold Pressed Coconut Oil</h3><p>Single ingredient · maker reviewed · packaging disclosed.</p></article><article className="beemun-card"><h3>Natural Body Butter</h3><p>Ingredient-first product card placeholder.</p></article><article className="beemun-card"><h3>Herbal Hair Oil</h3><p>ZPS listing placeholder for early design preview.</p></article></div>}
      </section>
      <section className="beemun-section beemun-soft-section">
        <div className="beemun-section-head"><p className="beemun-eyebrow">Meet the makers</p><h2>Products with people behind them.</h2><p>BEEMUN highlights makers who can stand behind their ingredients, packaging, and product claims.</p></div>
        <div className="beemun-three-grid"><article className="beemun-card"><h3>Earth Roots</h3><p>Single-ingredient oils and transparent natural care essentials.</p></article><article className="beemun-card"><h3>Pure Home Co.</h3><p>Home care essentials with packaging visibility.</p></article><article className="beemun-card"><h3>Botanical Works</h3><p>Small-batch care products built around clear labels.</p></article></div>
      </section>
      <section className="beemun-seller-cta"><h2>Want to sell on BEEMUN?</h2><p>Apply as a maker and submit products for ZPS review before they go live.</p><a className="beemun-btn-primary" href="#">Partner with BEEMUN</a></section>
    </>
  )
}
