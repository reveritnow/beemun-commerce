import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"
import styles from "./listing-page.module.css"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div className={`beemun-listing-page ${styles.listingTheme}`} data-testid="category-container">
      <div className="beemun-listing-inner">
      <div className="beemun-listing-hero">
        <div>
          <p className="beemun-eyebrow">Shop BEEMUN</p>
          <h1 data-testid="store-page-title">All ZPS 100 products</h1>
          <p>
            Browse products reviewed for zero plastic intent, zero synthetic intent,
            full disclosure, and maker accountability.
          </p>
          <div className="beemun-listing-hero-meta">
            <span>BEEMUN Reviewed</span>
            <span>Full disclosure first</span>
            <span>Maker accountable</span>
          </div>
        </div>
        <div className="beemun-listing-hero-panel">
          <strong>ZPS 100</strong>
          <span>Curated shopping with visible ingredients, packaging notes, trust signals, and real Medusa pricing.</span>
        </div>
      </div>
      <div className="beemun-listing-layout">
        <RefinementList sortBy={sort} />
        <div className="beemun-listing-grid">
          <Suspense fallback={<SkeletonProductGrid />}>
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              countryCode={countryCode}
            />
          </Suspense>
        </div>
      </div>
      <section className="beemun-listing-bottom" aria-label="BEEMUN shopping guidance">
        <article><h3>Editorial recommendations</h3><p>Start with everyday essentials where disclosure changes the buying decision.</p></article>
        <article><h3>Related collections</h3><p>Explore maker-led edits, newly reviewed products, and low-waste routine builders.</p></article>
        <article><h3>Continue exploring</h3><p>Return to ingredient-led discovery when you want to compare purity signals.</p></article>
      </section>
      </div>
    </div>
  )
}

export default StoreTemplate
