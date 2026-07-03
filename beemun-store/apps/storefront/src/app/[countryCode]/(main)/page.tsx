import { Metadata } from "next"

import Hero from "@modules/home/components/hero"

export const metadata: Metadata = {
  title: "BEEMUN - ZPS 100 Marketplace",
  description:
    "A curated marketplace for products reviewed for zero plastic, zero synthetic, full disclosure, and maker accountability.",
}

const trust = [
  ["zp", "Zero Plastic", "Packaging and shipping materials are reviewed before approval."],
  ["zs", "Zero Synthetic", "Ingredient lists are checked for synthetic shortcuts and vague claims."],
  ["fd", "Full Disclosure", "Ingredients, packaging, maker details, and claims stay visible."],
  ["br", "BEEMUN Reviewed", "Every product is screened before customers can buy it."],
]

const categories = [
  ["Skin & Body", "Daily care, balms, oils, soaps, and body essentials with nothing hidden.", "Body rituals"],
  ["Hair Care", "Powders, oils, cleansers, and scalp routines built around clean labels.", "Root to tip"],
  ["Oils & Butters", "Single-ingredient staples and honest blends for simple routines.", "Pantry purity"],
  ["Home Products", "Everyday home essentials reviewed for packaging and ingredient clarity.", "Clean living"],
]

const products = [
  ["Cold Pressed Coconut Oil", "Earth Roots", "Single ingredient oil in a return-ready glass bottle.", "349"],
  ["Rose Face Balm", "Petal & Soil", "Botanical balm with declared waxes, oils, and jar packaging.", "599"],
  ["Hibiscus Hair Powder", "Root Rituals", "Plant powder with full ingredient and sourcing disclosure.", "249"],
]

const reviewSteps = [
  ["01", "Maker intake", "We learn the brand, sourcing philosophy, production scale, and accountability standards."],
  ["02", "Disclosure review", "Ingredients, packaging layers, claims, labels, and product imagery are checked together."],
  ["03", "ZPS decision", "Products are approved only when zero-plastic intent, zero-synthetic intent, and clarity align."],
  ["04", "Live with proof", "Approved listings carry visible trust markers so customers can shop without decoding."],
]

const stats = [
  ["4", "mandatory trust gates before a listing goes live"],
  ["100%", "ingredient and packaging disclosure expected from makers"],
  ["0", "synthetic fragrance, vague filler, or hidden plastic accepted as normal"],
]

const switchReasons = [
  ["From claims to proof", "BEEMUN shows the details customers normally have to chase after purchase."],
  ["From endless aisles to curation", "A smaller marketplace built around standards, not scroll fatigue."],
  ["From anonymous brands to makers", "The people behind the product remain part of the buying decision."],
]

const makers = [
  ["Earth Roots", "Single-ingredient oils and simple natural care from accountable sourcing."],
  ["Petal & Soil", "Small-batch balms, butters, and botanical blends with clear labels."],
  ["Root Rituals", "Herbal powders and care essentials built around visible ingredients."],
]

const collections = [
  ["Founder Favorites", "The first products we would place on our own shelves."],
  ["Newly Reviewed", "Fresh approvals from makers who met the BEEMUN standard."],
  ["Plastic-Free Routine", "Personal care essentials selected around packaging disclosure."],
  ["Gifting With Proof", "Thoughtful products with clearer labels, materials, and maker context."],
]

const promises = [
  ["No ingredient guessing", "Customers see what is inside before they buy."],
  ["No vague packaging claims", "Packaging notes stay part of the product experience."],
  ["No hidden synthetic surprises", "Labels and claims are reviewed for clarity."],
  ["Maker accountability", "The maker behind the product stays visible."],
]

const faqs = [
  [
    "Is BEEMUN a normal ecommerce store?",
    "No. BEEMUN is a curated marketplace where products are reviewed for disclosure and ZPS trust signals before they go live.",
  ],
  [
    "What does ZPS 100 mean?",
    "It represents BEEMUN's zero plastic, zero synthetic, full disclosure, and review-led product direction.",
  ],
  [
    "Can small makers sell on BEEMUN?",
    "Yes. BEEMUN is designed for serious small brands that can stand behind their ingredients, packaging, and product claims.",
  ],
  [
    "Will products show full ingredients?",
    "Yes. Ingredient and packaging clarity are core to the BEEMUN shopping experience.",
  ],
]

const SealIcon = ({ label }: { label: string }) => (
  <span className="beemun-seal-icon" aria-hidden="true">
    {label}
  </span>
)

export default async function Home() {
  return (
    <>
      <Hero />

      <section className="beemun-trust-bar" aria-label="BEEMUN trust standards">
        {trust.map(([abbr, title, text]) => (
          <article key={title}>
            <SealIcon label={abbr} />
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="beemun-section beemun-brand-moment beemun-story-section">
        <div>
          <p className="beemun-eyebrow">Why BEEMUN exists</p>
          <h2>Clean should not ask customers to guess.</h2>
        </div>
        <p>
          Most products look pure on the surface, while the hard questions stay
          buried: what is inside, how it is packed, and whether the maker can
          stand behind every claim. BEEMUN turns that hidden work into the
          shopping experience.
        </p>
      </section>

      <section className="beemun-section beemun-split-feature">
        <div>
          <p className="beemun-eyebrow">What makes BEEMUN different</p>
          <h2>Not just natural. Reviewed for proof.</h2>
          <p>
            BEEMUN is built for customers who want fewer compromises and more
            evidence before they add to cart.
          </p>
        </div>
        <div className="beemun-proof-list">
          {[
            ["Ingredient transparency", "Full ingredient disclosure is required before listing."],
            ["Packaging transparency", "Primary, label, and shipping materials are reviewed together."],
            ["Maker accountability", "Claims are connected to the person or brand making them."],
          ].map(([title, text], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section beemun-soft-section" id="categories">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Shop by category</p>
          <h2>Curated aisles, not endless shelves.</h2>
          <p>Each category starts with products that can carry the BEEMUN standard in public.</p>
        </div>
        <div className="beemun-editorial-grid">
          {categories.map(([title, text, kicker], index) => (
            <article className="beemun-editorial-card" key={title}>
              <span>{kicker}</span>
              <div className="beemun-editorial-visual">
                <SealIcon label={`0${index + 1}`} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section" id="featured">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Featured products</p>
          <h2>ZPS 100 products, curated first.</h2>
          <p>
            Product previews are designed around the same details customers
            need on launch: maker, price, packaging, ingredients, and review status.
          </p>
        </div>
        <div className="beemun-premium-product-grid">
          {products.map(([title, maker, note, price], index) => (
            <article className="beemun-product-card beemun-product-card-premium" key={title}>
              <div className="beemun-product-visual">
                <SealIcon label={`B${index + 1}`} />
                <span className="beemun-product-badge">ZPS 100</span>
              </div>
              <div className="beemun-product-meta-row">
                <span>by {maker}</span>
                <strong>Rs. {price}</strong>
              </div>
              <h3>{title}</h3>
              <p>{note}</p>
              <div className="beemun-mini-trust">
                <span>ZP</span>
                <span>ZS</span>
                <span>FD</span>
                <span>BR</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section beemun-brand-moment beemun-zps-feature" id="zps">
        <div>
          <p className="beemun-eyebrow">ZPS 100 standard</p>
          <h2>The BEEMUN standard lives on the product page.</h2>
          <p>
            ZPS 100 is not a decorative badge. It is a visible review language
            for zero plastic, zero synthetic, full disclosure, and maker accountability.
          </p>
        </div>
        <div className="beemun-standard-card">
          <div className="beemun-standard-seal">
            <strong>ZPS 100</strong>
            <span>Reviewed standard</span>
          </div>
          <div className="beemun-standard-list">
            {trust.map(([abbr, title]) => (
              <p key={title}>
                <SealIcon label={abbr} />
                <span>{title}</span>
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="beemun-section beemun-stats-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Trust numbers</p>
          <h2>Built for customers who read the label.</h2>
        </div>
        <div className="beemun-stats-grid">
          {stats.map(([number, text]) => (
            <article key={text}>
              <strong>{number}</strong>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section beemun-soft-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Why customers switch</p>
          <h2>Less label anxiety. More confident rituals.</h2>
        </div>
        <div className="beemun-three-grid">
          {switchReasons.map(([title, text]) => (
            <article className="beemun-card beemun-clean-card" key={title}>
              <SealIcon label="ok" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Inside a BEEMUN review</p>
          <h2>A clearer path from maker claim to customer trust.</h2>
        </div>
        <div className="beemun-timeline">
          {reviewSteps.map(([num, title, text]) => (
            <article key={title}>
              <span>{num}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section beemun-promise">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Customer promise</p>
          <h2>Know more before you buy.</h2>
          <p>Transparency should be visible before checkout, not after disappointment.</p>
        </div>
        <div className="beemun-four-grid">
          {promises.map(([title, text]) => (
            <article className="beemun-card beemun-clean-card" key={title}>
              <SealIcon label="yes" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section beemun-ingredient-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Ingredient discovery</p>
          <h2>Shop by the ingredients you trust.</h2>
          <p>Ingredient-led discovery helps customers understand what a product is built around.</p>
        </div>
        <div className="beemun-pill-row">
          {["Neem", "Rose", "Coconut", "Hibiscus", "Beeswax", "Amla"].map((ingredient) => (
            <span key={ingredient}>{ingredient}</span>
          ))}
        </div>
      </section>

      <section className="beemun-section beemun-soft-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Meet the makers</p>
          <h2>Small brands. Serious transparency.</h2>
          <p>BEEMUN highlights makers who stand behind their ingredients, packaging, and claims.</p>
        </div>
        <div className="beemun-three-grid">
          {makers.map(([title, text]) => (
            <article className="beemun-maker-card beemun-maker-card-premium" key={title}>
              <div className="beemun-maker-mark">{title.slice(0, 1)}</div>
              <h3>{title}</h3>
              <p>{text}</p>
              <a href="#">View maker</a>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Collections</p>
          <h2>Purpose-led shelves for launch.</h2>
          <p>Collections help customers shop with intention instead of decoding every aisle alone.</p>
        </div>
        <div className="beemun-collection-grid">
          {collections.map(([title, text], index) => (
            <article className="beemun-collection-card" key={title}>
              <span>Collection 0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="beemun-section beemun-press-strip" aria-label="BEEMUN trusted by">
        <p>Built for conscious families, ingredient readers, low-waste homes, and purity-first makers.</p>
      </section>

      <section className="beemun-section beemun-faq">
        <div className="beemun-section-head">
          <p className="beemun-eyebrow">Questions</p>
          <h2>Before you shop.</h2>
        </div>
        <div className="beemun-faq-list">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="beemun-newsletter">
        <p className="beemun-eyebrow">Early access</p>
        <h2>Be first to discover ZPS 100 products.</h2>
        <p>Launch updates, maker stories, ingredient notes, and curated product drops.</p>
        <div>
          <input placeholder="Enter your email" />
          <button>Join Early Access</button>
        </div>
      </section>

      <section className="beemun-seller-cta" id="partner">
        <p className="beemun-eyebrow">For makers</p>
        <h2>Are you a purity-first maker?</h2>
        <p>
          Join BEEMUN and bring genuinely transparent, zero-plastic,
          zero-synthetic products to customers who care about what they buy.
        </p>
        <a className="beemun-btn-primary" href="#">
          Partner with BEEMUN
        </a>
      </section>
    </>
  )
}
