import LocalizedClientLink from "@modules/common/components/localized-client-link"

const footerGroups = [
  { title: "Shop", links: ["Skin & Body", "Hair Care", "Home Care", "Wellness"] },
  { title: "Learn", links: ["ZPS 100", "Ingredient Clarity", "Packaging Transparency", "Maker Review"] },
  { title: "Sell on BEEMUN", links: ["Partner with BEEMUN", "Seller Guidelines", "Product Review", "Maker Application"] },
  { title: "Company", links: ["About", "Contact", "Shipping Policy", "Privacy", "Terms"] },
]

export default async function Footer() {
  return (
    <footer className="beemun-footer">
      <div className="beemun-footer-inner">
        <div className="beemun-footer-brand">
          <LocalizedClientLink href="/" className="beemun-footer-logo">BEEMUN</LocalizedClientLink>
          <p>Pure for You. Pure for Earth.</p>
          <p>A curated ZPS 100 marketplace for products reviewed for ingredient clarity, packaging transparency, and maker accountability.</p>
        </div>
        <div className="beemun-footer-grid">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.links.map((link) => <li key={link}><a href="#">{link}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="beemun-footer-bottom">
        <span>© {new Date().getFullYear()} BEEMUN. All rights reserved.</span>
        <span>Pure for You. Pure for Earth.</span>
      </div>
    </footer>
  )
}
