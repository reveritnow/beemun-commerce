import { notFound } from "next/navigation"
import { Suspense } from "react"

import InteractiveLink from "@modules/common/components/interactive-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import styles from "@modules/store/templates/listing-page.module.css"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]

  const getParents = (category: HttpTypes.StoreProductCategory) => {
    if (category.parent_category) {
      parents.push(category.parent_category)
      getParents(category.parent_category)
    }
  }

  getParents(category)

  return (
    <div className={`beemun-listing-page ${styles.listingTheme}`} data-testid="category-container">
      <div className="beemun-listing-inner">
      <div className="beemun-listing-hero">
        <div>
          <p className="beemun-eyebrow">BEEMUN category</p>
          <div className="beemun-category-breadcrumbs">
            {parents &&
              parents.map((parent) => (
                <span key={parent.id}>
                  <LocalizedClientLink
                    href={`/categories/${parent.handle}`}
                    data-testid="sort-by-link"
                  >
                    {parent.name}
                  </LocalizedClientLink>
                  /
                </span>
              ))}
          </div>
          <h1 data-testid="category-page-title">{category.name}</h1>
          <p>{category.description || "Curated BEEMUN products reviewed through ingredients, packaging, and maker accountability."}</p>
          <div className="beemun-listing-hero-meta">
            <span>{category.products?.length ?? 0} products indexed</span>
            <span>Category guidance</span>
            <span>ZPS trust markers</span>
          </div>
        </div>
        <div className="beemun-listing-hero-panel">
          <strong>{category.category_children?.length || "ZPS"}</strong>
          <span>Browse this category with ingredient, purpose, packaging, and disclosure cues in mind.</span>
        </div>
      </div>
      <div className="beemun-listing-layout">
        <RefinementList sortBy={sort} data-testid="sort-by-container" />
        <div className="beemun-listing-grid">
          {category.category_children && (
            <div className="beemun-subcategory-panel">
              <ul className="grid grid-cols-1 small:grid-cols-2 gap-2">
                {category.category_children?.map((c) => (
                  <li key={c.id}>
                    <InteractiveLink href={`/categories/${c.handle}`}>
                      {c.name}
                    </InteractiveLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Suspense
            fallback={
              <SkeletonProductGrid
                numberOfProducts={category.products?.length ?? 8}
              />
            }
          >
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              categoryId={category.id}
              countryCode={countryCode}
            />
          </Suspense>
        </div>
      </div>
      <section className="beemun-listing-bottom" aria-label="Category recommendations">
        <article><h3>Buying tips</h3><p>Compare ingredient clarity, packaging claims, and maker context before sorting by price.</p></article>
        <article><h3>Related collections</h3><p>Look for founder favorites, newly reviewed products, and routine-based edits.</p></article>
        <article><h3>Continue exploring</h3><p>Move across categories when a purpose matters more than a product type.</p></article>
      </section>
      </div>
    </div>
  )
}
