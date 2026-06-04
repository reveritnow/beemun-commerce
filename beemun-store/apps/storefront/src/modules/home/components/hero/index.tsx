const Hero = () => {
  return (
    <section className="beemun-hero">
      <div className="beemun-hero-copy">
        <p className="beemun-eyebrow">ZPS 100 Marketplace</p>
        <h1>Products you can trust before you buy.</h1>
        <p>
          BEEMUN curates zero-plastic, zero-synthetic products with visible
          ingredients, packaging details, maker accountability, and review signals
          on every listing.
        </p>
        <div className="beemun-actions">
          <a href="#featured" className="beemun-btn-primary">Explore ZPS Products</a>
          <a href="#zps" className="beemun-btn-secondary">See the Standard</a>
        </div>
        <div className="beemun-hero-proof">
          <span>✓ Ingredient clarity</span>
          <span>✓ Packaging disclosure</span>
          <span>✓ Maker reviewed</span>
        </div>
      </div>
      <div className="beemun-hero-visual" aria-label="BEEMUN product trust visual">
        <div className="beemun-hero-badge">ZPS 100</div>
        <div className="beemun-symbol-card main"><span>♻</span><strong>Zero Plastic</strong></div>
        <div className="beemun-symbol-card"><span>✦</span><strong>Zero Synthetic</strong></div>
        <div className="beemun-symbol-card"><span>✓</span><strong>Full Disclosure</strong></div>
      </div>
    </section>
  )
}

export default Hero
