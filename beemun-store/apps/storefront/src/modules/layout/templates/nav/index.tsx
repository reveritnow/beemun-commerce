import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b duration-200 bg-[#fffaf0]/95 backdrop-blur border-[#e2d5bb]">
        <nav className="content-container text-[#31452b] flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center gap-6">
            <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            <div className="hidden small:flex items-center gap-6 font-semibold">
              <LocalizedClientLink href="/store">Shop</LocalizedClientLink>
              <a href="#categories">Categories</a>
              <a href="#zps">ZPS 100</a>
              <a href="#partner">Partner</a>
            </div>
          </div>

          <LocalizedClientLink href="/" className="text-lg font-black tracking-[0.18em] text-[#1f2a1f]" data-testid="nav-store-link">
            BEEMUN
          </LocalizedClientLink>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <LocalizedClientLink className="hidden small:block hover:text-[#1f2a1f]" href="/account" data-testid="nav-account-link">
              Account
            </LocalizedClientLink>
            <Suspense fallback={<LocalizedClientLink className="hover:text-[#1f2a1f] flex gap-2" href="/cart" data-testid="nav-cart-link">Cart (0)</LocalizedClientLink>}>
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
