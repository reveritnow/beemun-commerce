import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import { HttpTypes } from "@medusajs/types"
import styles from "@modules/store/templates/listing-page.module.css"

export default function CollectionTemplate({
  sortBy,
  collection,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  collection: HttpTypes.StoreCollection
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div className={`beemun-listing-page ${styles.listingTheme}`}>
      <div className="beemun-listing-inner">
      <div className="beemun-listing-hero">
        <div>
          <p className="beemun-eyebrow">BEEMUN collection</p>
          <h1>{collection.title}</h1>
          <p>Curated products grouped for clearer discovery and trust-first shopping.</p>
          <div className="beemun-listing-hero-meta">
            <span>{collection.products?.length ?? 0} products indexed</span>
            <span>ZPS 100 lens</span>
            <span>Disclosure-led browsing</span>
          </div>
        </div>
        <div className="beemun-listing-hero-panel">
          <strong>{collection.products?.length ?? "Curated"}</strong>
          <span>Products in this collection are presented around trust, maker context, and visible purchase details.</span>
        </div>
      </div>
      <div className="beemun-listing-layout">
        <RefinementList sortBy={sort} />
        <div className="beemun-listing-grid">
          <Suspense
            fallback={
              <SkeletonProductGrid
                numberOfProducts={collection.products?.length}
              />
            }
          >
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              collectionId={collection.id}
              countryCode={countryCode}
            />
          </Suspense>
        </div>
      </div>
      <section className="beemun-listing-bottom" aria-label="Collection recommendations">
        <article><h3>Why this collection exists</h3><p>To help customers compare products through purpose, disclosure, and routine fit.</p></article>
        <article><h3>Related collections</h3><p>Move between founder picks, newly reviewed products, and gifting edits with the same trust lens.</p></article>
        <article><h3>Recently viewed</h3><p>Use maker names, packaging notes, and product claims as your comparison trail.</p></article>
      </section>
      </div>
    </div>
  )
}
