import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  productsIds,
  countryCode,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  productsIds?: string[]
  countryCode: string
}) {
  const queryParams: PaginatedProductsParams = {
    limit: 12,
  }

  if (collectionId) {
    queryParams["collection_id"] = [collectionId]
  }

  if (categoryId) {
    queryParams["category_id"] = [categoryId]
  }

  if (productsIds) {
    queryParams["id"] = productsIds
  }

  if (sortBy === "created_at") {
    queryParams["order"] = "created_at"
  }

  const region = await getRegion(countryCode).catch(() => null)

  if (!region) {
    return null
  }

  const productResult = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
  }).catch((error) => {
    console.error("Unable to load products", error)
    return null
  })

  if (!productResult) {
    return null
  }

  const {
    response: { products, count },
  } = productResult

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)
  const sortLabel =
    sortBy === "price_asc"
      ? "Price: Low to High"
      : sortBy === "price_desc"
      ? "Price: High to Low"
      : "Latest Arrivals"

  return (
    <>
      <div className="beemun-toolbar">
        <div>
          <h2>{count} reviewed products</h2>
          <p>Sorted by {sortLabel}. Pricing and availability are pulled from Medusa.</p>
        </div>
        <div className="beemun-toolbar-actions">
          <span>Filter</span>
          <span>{sortLabel}</span>
          <span>Grid</span>
          <span>Editorial</span>
          <span className="beemun-active-filter">ZPS 100</span>
        </div>
      </div>
      <ul
        className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
        data-testid="products-list"
      >
        {products.map((p) => {
          return (
            <li key={p.id}>
              <ProductPreview product={p} region={region} />
            </li>
          )
        })}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}
