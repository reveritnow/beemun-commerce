import LocalizedClientLink from "@modules/common/components/localized-client-link"

const footerGroups = [
  {
    title: "Shop",
    links: [
      ["Store", "/store"],
      ["Skin & Body", "/categories/skin-body"],
      ["Hair Care", "/categories/hair-care"],
      ["Home Products", "/categories/home-essentials"],
    ],
  },
  {
    title: "The Standard",
    links: [
      ["ZPS 100", "/zps-100"],
      ["How it works", "/how-it-works"],
      ["About BEEMUN", "/about"],
    ],
  },
  {
    title: "For Makers",
    links: [
      ["Become a maker", "/become-a-maker"],
      ["Contact", "/contact"],
      ["Product review", "/zps-100"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Shipping & returns", "/shipping-returns"],
      ["Refund policy", "/refund-policy"],
      ["Privacy", "/privacy-policy"],
      ["Terms", "/terms"],
    ],
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
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <LocalizedClientLink href={href}>{label}</LocalizedClientLink>
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
