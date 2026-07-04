import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import MoreFromMaker from "@modules/products/components/more-from-maker"
import ProductActions from "@modules/products/components/product-actions"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PublicMaker } from "@lib/data/makers"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"
import styles from "./product-page.module.css"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  maker?: PublicMaker | null
}

const trustItems = [
  ["ZP", "Zero Plastic", "Packaging details reviewed before listing."],
  ["ZS", "Zero Synthetic", "Ingredient clarity checked before listing."],
  ["FD", "Full Disclosure", "Ingredients and packaging stay visible."],
  ["BR", "BEEMUN Reviewed", "Listing screened before customers see it."],
]

const notInside = [
  "Hidden synthetic fragrance",
  "Vague natural claims",
  "Unclear packaging language",
  "Anonymous maker context",
]

const fallbackFaqs = [
  [
    "What does ZPS 100 mean on this product?",
    "It means the product is presented with BEEMUN's zero plastic, zero synthetic, full disclosure, and review-led direction.",
  ],
  [
    "Will ingredient and packaging details be visible?",
    "Yes. BEEMUN pages are built to show ingredients, packaging, maker details, and approval context before checkout.",
  ],
  [
    "Who manages the order?",
    "For MVP, BEEMUN operates the curated marketplace centrally while featuring approved makers and their products.",
  ],
]

const readMeta = (
  metadata: Record<string, unknown> | null | undefined,
  key: string,
  fallback: string
) => {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value : fallback
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({ product, region, countryCode, images, maker }) => {
  if (!product || !product.id) {
    return notFound()
  }

  const metadata = product.metadata as Record<string, unknown> | null | undefined
  const makerName = maker?.name || product.collection?.title || "BEEMUN Approved Maker"
  const makerHref = maker?.handle ? `/${countryCode}/makers/${maker.handle}` : null
  const description = product.description || "A BEEMUN-reviewed product listed with ingredient clarity, packaging transparency, and maker accountability."
  const ingredients = readMeta(metadata, "ingredients", "Full ingredient disclosure will appear here once BEEMUN product fields are added. Until then, this product page preserves the Medusa product data and shows the disclosure area customers should expect.")
  const packaging = readMeta(metadata, "packaging", "Primary packaging, label, and shipping packaging notes will appear here as maker disclosures are added.")
  const approval = readMeta(metadata, "beemun_approval", "BEEMUN approved this listing format because it keeps product claims, ingredients, packaging, maker context, and purchase actions visible in one clear flow.")
  const makerStory = readMeta(metadata, "maker_story", "BEEMUN highlights makers who can stand behind their product choices, ingredient clarity, and packaging decisions.")
  const howToUse = readMeta(metadata, "how_to_use", "Use as directed by the maker. Storage guidance, routine notes, and usage instructions will appear here when provided.")
  const shippingReturns = readMeta(metadata, "shipping_returns", "Shipping, returns, and fulfillment details are handled through the BEEMUN checkout flow and Medusa order logic.")

  return (
    <main className={`beemun-product-page ${styles.productTheme}`} data-testid="product-container">
      <section className="beemun-product-kicker">
        <span>Pure for You. Pure for Earth.</span>
        <Link href={`/${countryCode}/zps-100`}>ZPS 100 marketplace product</Link>
      </section>

      <section className="beemun-product-hero">
        <div className="beemun-product-gallery">
          <ImageGallery images={images} />
        </div>
        <aside className="beemun-product-buybox">
          <div className="beemun-product-buybox-top">
            <Link className="beemun-product-zps-link" href={`/${countryCode}/zps-100`}>ZPS 100 Product</Link>
            <Link href={`/${countryCode}/zps-100`}>BEEMUN Reviewed</Link>
          </div>
          <h1>{product.title}</h1>
          <p className="beemun-product-maker">
            by{" "}
            {makerHref ? (
              <Link href={makerHref}>{makerName}</Link>
            ) : (
              <span>{makerName}</span>
            )}
          </p>
          <p className="beemun-product-summary">{description}</p>
          <div className="beemun-product-trust-row">
            <span>Zero Plastic</span>
            <span>Zero Synthetic</span>
            <span>Full Disclosure</span>
            <span>Maker Accountable</span>
          </div>
          <div className="beemun-buybox-divider" />
          <Suspense fallback={<ProductActions disabled={true} product={product} region={region} />}>
            <ProductActionsWrapper id={product.id} region={region} />
          </Suspense>
          <div className="beemun-buybox-note">
            <strong>BEEMUN Promise</strong>
            <p>Know more before you buy: ingredients, packaging, maker, and review signals stay visible.</p>
          </div>
        </aside>
      </section>

      <section className="beemun-product-section beemun-product-trust-panel">
        <div className="beemun-product-section-head">
          <Link className="beemun-eyebrow beemun-text-link" href={`/${countryCode}/zps-100`}>ZPS 100 trust panel</Link>
          <h2>What customers should know before adding to cart.</h2>
          <p>BEEMUN product pages make the review language visible next to real commerce controls, pricing, variants, and purchase flow.</p>
        </div>
        <div className="beemun-four-grid">
          {trustItems.map(([icon, title, text]) => (
            <article className="beemun-card beemun-product-trust-card" key={title}>
              <div className="beemun-seal-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-product-section beemun-product-split">
        <article className="beemun-product-story-card dark">
          <p className="beemun-eyebrow">Why BEEMUN approved this</p>
          <h2>Reviewed for clarity, not just claims.</h2>
          <p>{approval}</p>
        </article>
        <article className="beemun-product-story-card">
          <p className="beemun-eyebrow">Maker story</p>
          <h2>{makerName}</h2>
          <p>{makerStory}</p>
        </article>
      </section>

      <section className="beemun-product-section beemun-product-disclosure">
        <div className="beemun-product-section-head">
          <p className="beemun-eyebrow">Disclosure</p>
          <h2>Ingredients, packaging, and use.</h2>
        </div>
        <div className="beemun-three-grid">
          <article className="beemun-card"><div className="beemun-seal-icon">IN</div><h3>Ingredient disclosure</h3><p>{ingredients}</p></article>
          <article className="beemun-card"><div className="beemun-seal-icon">PK</div><h3>Packaging disclosure</h3><p>{packaging}</p></article>
          <article className="beemun-card"><div className="beemun-seal-icon">US</div><h3>How to use</h3><p>{howToUse}</p></article>
        </div>
      </section>

      <section className="beemun-product-section beemun-product-split">
        <article className="beemun-product-story-card beemun-product-not-inside">
          <p className="beemun-eyebrow">What is not inside</p>
          <h2>No hidden surprises.</h2>
          <ul>
            {notInside.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className="beemun-product-story-card">
          <p className="beemun-eyebrow">Shipping and returns</p>
          <h2>Clear order flow.</h2>
          <p>{shippingReturns}</p>
        </article>
      </section>

      <section className="beemun-product-section beemun-product-details">
        <div className="beemun-product-section-head"><p className="beemun-eyebrow">Medusa product details</p><h2>Product information.</h2><p>These details are rendered from the existing Medusa product component.</p></div>
        <ProductTabs product={product} />
      </section>

      <section className="beemun-product-section beemun-product-faq">
        <div className="beemun-product-section-head"><p className="beemun-eyebrow">Before you buy</p><h2>Questions customers ask.</h2></div>
        <div className="beemun-faq-list">
          {fallbackFaqs.map(([question, answer]) => (
            <details key={question}><summary>{question}</summary><p>{answer}</p></details>
          ))}
        </div>
      </section>

      <Suspense fallback={null}>
        <MoreFromMaker maker={maker || null} currentProductId={product.id} countryCode={countryCode} />
      </Suspense>

      <section className="beemun-product-section" data-testid="related-products-container">
        <div className="beemun-product-section-head">
          <p className="beemun-eyebrow">Similar ZPS 100 products</p>
          <h2>Related products.</h2>
        </div>
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </section>
    </main>
  )
}

export default ProductTemplate
