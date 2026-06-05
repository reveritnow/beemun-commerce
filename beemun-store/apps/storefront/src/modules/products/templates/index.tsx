import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductTabs from "@modules/products/components/product-tabs"
import RelatedProducts from "@modules/products/components/related-products"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const trustItems = [
  ["ZP", "Zero Plastic", "Packaging details reviewed before listing."],
  ["ZS", "Zero Synthetic", "Ingredient clarity checked before listing."],
  ["FD", "Full Disclosure", "Ingredients and packaging stay visible."],
  ["BR", "BEEMUN Reviewed", "Listing screened before customers see it."],
]

const ProductTemplate: React.FC<ProductTemplateProps> = ({ product, region, countryCode, images }) => {
  if (!product || !product.id) {
    return notFound()
  }

  const maker = product.collection?.title || "BEEMUN Approved Maker"
  const description = product.description || "A BEEMUN-reviewed product listed with ingredient clarity, packaging transparency, and maker accountability."

  return (
    <main className="beemun-product-page" data-testid="product-container">
      <section className="beemun-product-hero">
        <div className="beemun-product-gallery">
          <ImageGallery images={images} />
        </div>
        <aside className="beemun-product-buybox">
          <p className="beemun-eyebrow">ZPS 100 Product</p>
          <h1>{product.title}</h1>
          <p className="beemun-product-maker">by {maker}</p>
          <p className="beemun-product-summary">{description}</p>
          <div className="beemun-product-trust-row">
            <span>Zero Plastic</span>
            <span>Zero Synthetic</span>
            <span>Full Disclosure</span>
          </div>
          <Suspense fallback={<ProductActions disabled={true} product={product} region={region} />}>
            <ProductActionsWrapper id={product.id} region={region} />
          </Suspense>
          <div className="beemun-buybox-note">
            <strong>BEEMUN Promise</strong>
            <p>Know more before you buy: ingredients, packaging, maker, and review signals stay visible.</p>
          </div>
        </aside>
      </section>

      <section className="beemun-product-section">
        <div className="beemun-product-section-head">
          <p className="beemun-eyebrow">Trust signals</p>
          <h2>Why this product fits BEEMUN.</h2>
        </div>
        <div className="beemun-four-grid">
          {trustItems.map(([icon, title, text]) => (
            <article className="beemun-card" key={title}>
              <div className="beemun-icon">{icon}</div>
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
          <p>This listing is designed to show what matters before checkout: ingredients, packaging, maker context, and product details.</p>
        </article>
        <article className="beemun-product-story-card">
          <p className="beemun-eyebrow">Maker story</p>
          <h2>{maker}</h2>
          <p>BEEMUN highlights makers who can stand behind their product choices, ingredient clarity, and packaging decisions.</p>
        </article>
      </section>

      <section className="beemun-product-section">
        <div className="beemun-three-grid">
          <article className="beemun-card"><div className="beemun-icon">IN</div><h3>Ingredients</h3><p>Full ingredient disclosure will appear here once BEEMUN product fields are added.</p></article>
          <article className="beemun-card"><div className="beemun-icon">PK</div><h3>Packaging</h3><p>Primary packaging, label, and shipping packaging notes will appear here.</p></article>
          <article className="beemun-card"><div className="beemun-icon">US</div><h3>How to use</h3><p>Usage instructions, storage guidance, and care notes will appear here.</p></article>
        </div>
      </section>

      <section className="beemun-product-section beemun-product-details">
        <div className="beemun-product-section-head"><p className="beemun-eyebrow">Details and shipping</p><h2>Product information.</h2></div>
        <ProductTabs product={product} />
      </section>

      <section className="beemun-product-section beemun-product-faq">
        <div className="beemun-product-section-head"><p className="beemun-eyebrow">Before you buy</p><h2>Questions customers ask.</h2></div>
        <div className="beemun-faq-list">
          <details><summary>What does ZPS 100 mean on this product?</summary><p>It means the product is presented with BEEMUN's zero plastic, zero synthetic, full disclosure, and review-led direction.</p></details>
          <details><summary>Will ingredient and packaging details be visible?</summary><p>Yes. BEEMUN pages are built to show ingredients, packaging, maker details, and approval context before checkout.</p></details>
          <details><summary>Who manages the order?</summary><p>For MVP, BEEMUN operates the curated marketplace centrally while featuring approved makers and their products.</p></details>
        </div>
      </section>

      <section className="beemun-product-section" data-testid="related-products-container">
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </section>
    </main>
  )
}

export default ProductTemplate
