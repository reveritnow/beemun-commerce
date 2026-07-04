import { sdk } from "@lib/config"
import { filterBeemunApprovedProducts } from "@lib/util/beemun-product-visibility"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const listCategories = async (query?: Record<string, unknown>) => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields:
            "*category_children,*products,+products.metadata,+products.status,*parent_category,*parent_category.parent_category",
          limit,
          ...query,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) =>
      product_categories.map((category) => ({
        ...category,
        products: filterBeemunApprovedProducts(category.products),
      }))
    )
    .catch((error) => {
      console.warn("Unable to load Medusa categories. Rendering empty BEEMUN category state.", error)
      return []
    })
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`

  const next = {
    ...(await getCacheOptions("categories")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreProductCategoryListResponse>(
      `/store/product-categories`,
      {
        query: {
          fields: "*category_children,*products,+products.metadata,+products.status",
          handle,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => {
      const category = product_categories[0]

      if (!category) {
        return null
      }

      return {
        ...category,
        products: filterBeemunApprovedProducts(category.products),
      }
    })
    .catch((error) => {
      console.warn("Unable to load Medusa category. Rendering BEEMUN fallback state.", error)
      return null
    })
}
