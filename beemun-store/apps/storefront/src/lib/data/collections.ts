"use server"

import { sdk } from "@lib/config"
import { filterBeemunApprovedProducts } from "@lib/util/beemun-product-visibility"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

export const retrieveCollection = async (id: string) => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  return await sdk.client
    .fetch<{ collection: HttpTypes.StoreCollection }>(
      `/store/collections/${id}`,
      {
        query: {
          fields: "*products,+products.metadata,+products.status",
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ collection }) => ({
      ...collection,
      products: filterBeemunApprovedProducts(collection.products),
    }))
    .catch((error) => {
      console.warn("Unable to retrieve Medusa collection. Rendering BEEMUN fallback state.", error)
      return null
    })
}

export const listCollections = async (
  queryParams: Record<string, string> = {}
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  queryParams.limit = queryParams.limit || "100"
  queryParams.offset = queryParams.offset || "0"

  return await sdk.client
    .fetch<{ collections: HttpTypes.StoreCollection[]; count: number }>(
      "/store/collections",
      {
        query: queryParams,
        next,
        cache: "force-cache",
      }
    )
    .then(({ collections }) => ({ collections, count: collections.length }))
    .catch((error) => {
      console.warn("Unable to load Medusa collections. Rendering empty BEEMUN collection state.", error)
      return { collections: [], count: 0 }
    })
}

export const getCollectionByHandle = async (
  handle: string
): Promise<HttpTypes.StoreCollection | null> => {
  const next = {
    ...(await getCacheOptions("collections")),
  }

  return await sdk.client
    .fetch<HttpTypes.StoreCollectionListResponse>(`/store/collections`, {
      query: { handle, fields: "*products,+products.metadata,+products.status" },
      next,
      cache: "force-cache",
    })
    .then(({ collections }) => {
      const collection = collections[0]

      if (!collection) {
        return null
      }

      return {
        ...collection,
        products: filterBeemunApprovedProducts(collection.products),
      }
    })
    .catch((error) => {
      console.warn("Unable to load Medusa collection. Rendering BEEMUN fallback state.", error)
      return null
    })
}
