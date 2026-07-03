"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "gb"

const fallbackRegion = {
  id: `fallback-${DEFAULT_REGION}`,
  name: "BEEMUN Default Region",
  currency_code: "gbp",
  countries: [
    {
      id: `fallback-country-${DEFAULT_REGION}`,
      iso_2: DEFAULT_REGION,
      iso_3: "gbr",
      num_code: "826",
      name: "United Kingdom",
      display_name: "United Kingdom",
    },
  ],
} as unknown as HttpTypes.StoreRegion

const getFallbackRegions = () => [fallbackRegion]

export const listRegions = async () => {
  const next = {
    ...(await getCacheOptions("regions")),
  }

  return await sdk.client
    .fetch<{ regions: HttpTypes.StoreRegion[] }>(`/store/regions`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ regions }) => (regions?.length ? regions : getFallbackRegions()))
    .catch((error) => {
      console.warn("Unable to load Medusa regions. Using BEEMUN fallback region.", error)
      return getFallbackRegions()
    })
}

export const retrieveRegion = async (id: string) => {
  const next = {
    ...(await getCacheOptions(["regions", id].join("-"))),
  }

  return await sdk.client
    .fetch<{ region: HttpTypes.StoreRegion }>(`/store/regions/${id}`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ region }) => region || fallbackRegion)
    .catch((error) => {
      console.warn("Unable to retrieve Medusa region. Using BEEMUN fallback region.", error)
      return fallbackRegion
    })
}

const regionMap = new Map<string, HttpTypes.StoreRegion>()

export const getRegion = async (countryCode: string) => {
  const normalizedCountryCode = countryCode?.toLowerCase() || DEFAULT_REGION

  if (regionMap.has(normalizedCountryCode)) {
    return regionMap.get(normalizedCountryCode)
  }

  const regions = await listRegions()

  regions.forEach((region) => {
    region.countries?.forEach((c) => {
      if (c?.iso_2) {
        regionMap.set(c.iso_2.toLowerCase(), region)
      }
    })
  })

  const region = regionMap.get(normalizedCountryCode) || regionMap.get(DEFAULT_REGION)

  return region || fallbackRegion
}
