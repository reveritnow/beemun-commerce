import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import "styles/public-trust.css"
import "styles/public-pages.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: {
    default: "BEEMUN | ZPS 100 Marketplace",
    template: "%s | BEEMUN",
  },
  description:
    "Pure for You. Pure for Earth. A curated ZPS 100 marketplace for zero plastic, zero synthetic products with full disclosure.",
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
