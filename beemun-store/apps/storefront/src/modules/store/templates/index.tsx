import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

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
    <div className="beemun-listing-page content-container" data-testid="category-container">
      <div className="beemun-listing-hero">
        <p className="beemun-eyebrow">Shop BEEMUN</p>
        <h1 data-testid="store-page-title">All ZPS 100 products</h1>
        <p>
          Browse products reviewed for zero plastic intent, zero synthetic intent,
          full disclosure, and maker accountability.
        </p>
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
    </div>
  )
}

export default StoreTemplate
