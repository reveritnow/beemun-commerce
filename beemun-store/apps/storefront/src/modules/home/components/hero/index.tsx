const standards = [
  ["ZP", "Zero Plastic", "Packaging and shipping reviewed"],
  ["ZS", "Zero Synthetic", "No hidden synthetic shortcuts"],
  ["FD", "Full Disclosure", "Ingredients visible before cart"],
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
            <span>BEEMUN Standard</span>
            <strong>ZPS 100</strong>
          </div>
          <div className="beemun-hero-seal">
            <span>100</span>
            <p>Reviewed for purity, disclosure, and maker accountability.</p>
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
