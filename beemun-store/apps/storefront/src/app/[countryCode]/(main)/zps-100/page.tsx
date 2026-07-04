import { Metadata } from "next"
import Link from "next/link"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "ZPS 100 - BEEMUN",
  description:
    "Learn how BEEMUN reviews products and makers for zero plastic, zero synthetic, full disclosure, and accountability.",
}

const pillars = [
  [
    "ZP",
    "Zero Plastic",
    "BEEMUN reviews primary packaging, labels, inserts, shipping materials, and refill claims so plastic is not hidden behind vague language.",
  ],
  [
    "ZS",
    "Zero Synthetic",
    "Ingredient lists are checked for synthetic fragrance, synthetic color, unclear preservatives, and claims that customers cannot verify.",
  ],
  [
    "FD",
    "Full Disclosure",
    "Approved listings show ingredients, packaging, maker context, usage notes, and review signals before the customer reaches checkout.",
  ],
  [
    "BR",
    "BEEMUN Reviewed",
    "Products and makers are screened before they become public, then can lose visibility if the standard is no longer met.",
  ],
]

const reviewSteps = [
  [
    "01",
    "Maker intake",
    "BEEMUN reviews who makes the product, how transparent they are, and whether their sourcing and packaging philosophy fits the marketplace.",
  ],
  [
    "02",
    "Product disclosure",
    "Ingredients, materials, packaging layers, claims, product imagery, usage notes, and shipping presentation are checked together.",
  ],
  [
    "03",
    "ZPS decision",
    "A product becomes eligible only when it is Medusa published and BEEMUN marks it ZPS approved and publicly visible.",
  ],
  [
    "04",
    "Ongoing accountability",
    "Approval can be removed after formula changes, packaging changes, supplier changes, missing disclosure, quality reports, or compliance concerns.",
  ],
]

const distinctions = [
  "ZPS 100 is a marketplace trust system, not a maker-written marketing claim.",
  "Approval means BEEMUN reviewed the disclosed product and maker information. It is not a medical claim, legal certification, or permanent guarantee.",
  "Products can lose approval when information changes, a maker becomes suspended, or BEEMUN can no longer verify the standard.",
]

export default async function Zps100Page({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  return (
    <main className="beemun-info-page">
      <section className="beemun-info-hero">
        <p className="beemun-eyebrow">BEEMUN Trust System</p>
        <h1>ZPS 100 is how BEEMUN turns purity claims into public proof.</h1>
        <p>
          Zero Plastic, Zero Synthetic, Full Disclosure, and BEEMUN Reviewed are
          the public signals behind every product customers can discover on the
          marketplace.
        </p>
        <div className="beemun-actions">
          <Link className="beemun-btn-primary" href={`/${countryCode}/store`}>
            Shop approved products
          </Link>
          <Link className="beemun-btn-secondary" href={`/${countryCode}/`}>
            Back to BEEMUN
          </Link>
        </div>
      </section>

      <section className="beemun-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">The four gates</p>
          <h2>What ZPS 100 means.</h2>
          <p>
            Every public product must pass BEEMUN's approval layer before it can
            appear in storefront discovery.
          </p>
        </div>
        <div className="beemun-four-grid">
          {pillars.map(([icon, title, text]) => (
            <article className="beemun-card beemun-clean-card" key={title}>
              <div className="beemun-seal-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section beemun-story-section">
        <div>
          <p className="beemun-eyebrow">Makers are reviewed too</p>
          <h2>Accountability starts before the product page.</h2>
        </div>
        <p>
          BEEMUN reviews maker identity, disclosure habits, product ownership,
          packaging philosophy, and willingness to keep information current.
          Public pages use the word Maker because customers are buying from
          accountable people and studios, not anonymous vendor records.
        </p>
      </section>

      <section className="beemun-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Review path</p>
          <h2>How BEEMUN reviews products.</h2>
        </div>
        <div className="beemun-timeline">
          {reviewSteps.map(([step, title, text]) => (
            <article key={step}>
              <span>{step}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section beemun-ingredient-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">What approval means</p>
          <h2>Clear, strong, and honest.</h2>
        </div>
        <div className="beemun-three-grid">
          {distinctions.map((text, index) => (
            <article className="beemun-card" key={text}>
              <div className="beemun-seal-icon">{`0${index + 1}`}</div>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
