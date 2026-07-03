"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

import SortProducts, { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  'data-testid'?: string
}

const RefinementList = ({ sortBy, 'data-testid': dataTestId }: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const setQueryParams = (name: string, value: string) => {
    const query = createQueryString(name, value)
    router.push(`${pathname}?${query}`)
  }

  return (
    <aside className="beemun-refinement-panel">
      <div className="beemun-refinement-head">
        <p className="beemun-eyebrow">Curate</p>
        <h2>Refine by trust signal.</h2>
        <p>Use sorting now, then compare products by the BEEMUN disclosure markers below.</p>
      </div>
      <SortProducts sortBy={sortBy} setQueryParams={setQueryParams} data-testid={dataTestId} />
      {[
        ["Ingredient", ["Neem", "Rose", "Coconut", "Amla"]],
        ["Product Type", ["Oil", "Balm", "Powder", "Cleanser"]],
        ["Purpose", ["Daily care", "Scalp", "Body", "Home"]],
        ["Packaging", ["Glass", "Paper", "Refill", "Plastic-free"]],
        ["ZPS Standard", ["Zero Plastic", "Zero Synthetic", "Full Disclosure"]],
        ["Price", ["Under 500", "500-1000", "1000+"]],
        ["Availability", ["In stock", "Newly reviewed"]],
      ].map(([title, items]) => (
        <div className="beemun-filter-group" key={title as string}>
          <h3>{title as string}</h3>
          <div className="beemun-filter-pills">
            {(items as string[]).map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      ))}
      <div className="beemun-sidebar-card">
        <h3>Why this collection exists</h3>
        <p>BEEMUN narrows browsing around proof: ingredients, packaging, maker accountability, and claim clarity.</p>
      </div>
      <div className="beemun-sidebar-card">
        <h3>Buying tip</h3>
        <p>Read the trust badges before comparing price. The cleanest product is the one with the least guessing.</p>
      </div>
    </aside>
  )
}

export default RefinementList
