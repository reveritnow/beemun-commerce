import LocalizedClientLink from "@modules/common/components/localized-client-link"

const footerGroups = [
  {
    title: "Shop",
    links: ["Skin & Body", "Hair Care", "Oils & Butters", "Home Products"],
  },
  {
    title: "The Standard",
    links: ["ZPS 100", "Ingredient Disclosure", "Packaging Review", "Maker Accountability"],
  },
  {
    title: "For Makers",
    links: ["Partner with BEEMUN", "Seller Guidelines", "Product Review", "Maker Application"],
  },
  {
    title: "Company",
    links: ["About BEEMUN", "Contact", "Shipping", "Privacy", "Terms"],
  },
]

export default async function Footer() {
  return (
    <footer className="beemun-footer">
      <div className="beemun-footer-newsletter">
        <div>
          <p className="beemun-eyebrow">Stay close to the standard</p>
          <h2>Launch drops, maker stories, and ingredient notes.</h2>
        </div>
        <form>
          <input aria-label="Email address" placeholder="Email address" />
          <button>Join</button>
        </form>
      </div>

      <div className="beemun-footer-inner">
        <div className="beemun-footer-brand">
          <LocalizedClientLink href="/" className="beemun-footer-logo">
            BEEMUN
          </LocalizedClientLink>
          <p>Pure for You. Pure for Earth.</p>
          <p>
            A curated ZPS 100 marketplace for products reviewed for ingredient
            clarity, packaging transparency, and maker accountability.
          </p>
          <div className="beemun-footer-social">
            <a href="#">IG</a>
            <a href="#">IN</a>
            <a href="#">YT</a>
          </div>
        </div>
        <div className="beemun-footer-grid">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="beemun-footer-bottom">
        <span>Copyright {new Date().getFullYear()} BEEMUN. All rights reserved.</span>
        <span>Zero Plastic / Zero Synthetic / Full Disclosure / BEEMUN Reviewed</span>
      </div>
    </footer>
  )
}
