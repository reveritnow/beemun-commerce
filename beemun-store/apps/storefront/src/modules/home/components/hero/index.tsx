const Hero = () => {
  return (
    <section className="beemun-hero">
      <div className="beemun-hero-copy">
        <p className="beemun-eyebrow">ZPS 100 Marketplace</p>
        <h1>Zero Plastic. Zero Synthetic. Fully disclosed.</h1>
        <p>
          BEEMUN is a curated marketplace for products reviewed for ingredient
          clarity, packaging transparency, and maker accountability before they
          go live.
        </p>
        <div className="beemun-actions">
          <a href="#featured" className="beemun-btn-primary">Explore Products</a>
          <a href="#zps" className="beemun-btn-secondary">How ZPS Works</a>
        </div>
      </div>
      <div className="beemun-hero-visual" aria-label="BEEMUN natural product visual" />
    </section>
  )
}

export default Hero
