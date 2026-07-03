const standards = [
  ["ZP", "Zero Plastic", "Packaging reviewed"],
  ["ZS", "Zero Synthetic", "Ingredient checked"],
  ["FD", "Full Disclosure", "Visible before cart"],
]

const Hero = () => {
  return (
    <section className="beemun-hero">
      <div className="beemun-hero-copy">
        <p className="beemun-eyebrow">Curated ZPS 100 Marketplace</p>
        <h1>Pure for You. Pure for Earth.</h1>
        <p>
          BEEMUN brings purity-first makers into one reviewed marketplace,
          where every product earns visibility through ingredient clarity,
          packaging transparency, and full disclosure.
        </p>
        <div className="beemun-actions">
          <a href="#featured" className="beemun-btn-primary">
            Shop reviewed products
          </a>
          <a href="#zps" className="beemun-btn-secondary">
            Explore ZPS 100
          </a>
        </div>
        <div className="beemun-hero-proof">
          <span>Zero Plastic</span>
          <span>Zero Synthetic</span>
          <span>Full Disclosure</span>
          <span>BEEMUN Reviewed</span>
        </div>
      </div>
      <div className="beemun-hero-visual" aria-label="BEEMUN ZPS 100 trust visual">
        <div className="beemun-hero-card">
          <div className="beemun-hero-card-head">
            <span>BEEMUN Trust Card</span>
            <strong>Reviewed</strong>
          </div>
          <div className="beemun-hero-seal">
            <span>ZPS 100</span>
            <p>Pure for You. Pure for Earth.</p>
          </div>
          <div className="beemun-hero-card-note">
            <strong>Every approved product must make the important details visible.</strong>
            <p>Ingredients, packaging, maker context, and claim language are reviewed before a product earns its place on BEEMUN.</p>
          </div>
          <div className="beemun-seal-grid">
            {standards.map(([abbr, title, text]) => (
              <div key={title}>
                <span>{abbr}</span>
                <strong>{title}</strong>
                <small>{text}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
