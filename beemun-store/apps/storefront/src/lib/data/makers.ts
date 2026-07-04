"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { listProducts } from "./products"

export type PublicMaker = {
  id: string
  name: string
  handle: string
  description?: string | null
  logo_url?: string | null
  banner_url?: string | null
  country_code?: string | null
  status: "approved"
  zps_profile_score?: number | null
  story?: string | null
  approved_reason?: string | null
  ingredient_philosophy?: string | null
  packaging_philosophy?: string | null
  review_summary?: string | null
  location?: string | null
  product_ids: string[]
}

const emptyMakerProducts = {
  maker: null as PublicMaker | null,
  products: [] as HttpTypes.StoreProduct[],
}

export const listPublicMakers = async () => {
  return sdk.client
    .fetch<{ makers: PublicMaker[] }>("/store/beemun/makers", {
      method: "GET",
      cache: "no-store",
    })
    .then(({ makers }) => makers.filter((maker) => maker.status === "approved"))
    .catch((error) => {
      console.warn("Unable to load BEEMUN makers.", error)
      return []
    })
}

export const retrieveMakerByHandle = async (handle: string) => {
  return sdk.client
    .fetch<{ maker: PublicMaker | null }>(`/store/beemun/makers/${handle}`, {
      method: "GET",
      cache: "no-store",
    })
    .then(({ maker }) => (maker?.status === "approved" ? maker : null))
    .catch((error) => {
      console.warn("Unable to load BEEMUN maker.", error)
      return null
    })
}

export const retrieveMakerForProduct = async (productId: string) => {
  return sdk.client
    .fetch<{ makers: PublicMaker[] }>("/store/beemun/makers", {
      method: "GET",
      query: {
        product_id: productId,
      },
      cache: "no-store",
    })
    .then(({ makers }) => makers.find((maker) => maker.status === "approved") || null)
    .catch((error) => {
      console.warn("Unable to load BEEMUN maker for product.", error)
      return null
    })
}

export const retrieveMakerWithApprovedProducts = async ({
  handle,
  countryCode,
}: {
  handle: string
  countryCode: string
}) => {
  const maker = await retrieveMakerByHandle(handle)

  if (!maker || !maker.product_ids.length) {
    return emptyMakerProducts
  }

  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: {
      id: maker.product_ids,
      limit: 100,
    },
  })

  return {
    maker,
    products,
  }
}

export const retrieveMoreFromMaker = async ({
  maker,
  currentProductId,
  countryCode,
}: {
  maker: PublicMaker | null
  currentProductId: string
  countryCode: string
}) => {
  if (!maker?.product_ids.length) {
    return []
  }

  const productIds = maker.product_ids.filter((id) => id !== currentProductId)

  if (!productIds.length) {
    return []
  }

  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: {
      id: productIds,
      limit: 8,
    },
  })

  return products.filter((product) => product.id !== currentProductId)
}
