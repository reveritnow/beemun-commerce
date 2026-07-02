const Hero = () => {
  return (
    <section className="beemun-hero">
      <div className="beemun-hero-copy">
        <p className="beemun-eyebrow">ZPS 100 Marketplace</p>
        <h1>Pure for You. Pure for Earth.</h1>
        <p>
          A curated marketplace for zero-plastic and zero-synthetic products,
          reviewed for ingredient clarity, packaging transparency, and full
          disclosure before they go live.
        </p>
        <div className="beemun-actions">
          <a href="#featured" className="beemun-btn-primary">
            Shop ZPS 100 products
          </a>
          <a href="#zps" className="beemun-btn-secondary">
            Learn about ZPS
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
        <div className="beemun-hero-badge">ZPS 100</div>
        <div className="beemun-seal-grid">
          <div>
            <span>ZP</span>
            <strong>Zero Plastic</strong>
            <small>Packaging reviewed</small>
          </div>
          <div>
            <span>ZS</span>
            <strong>Zero Synthetic</strong>
            <small>Ingredients checked</small>
          </div>
          <div>
            <span>FD</span>
            <strong>Full Disclosure</strong>
            <small>Visible before purchase</small>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
