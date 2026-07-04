import Link from "next/link"

type PublicLink = {
  href: string
  label: string
}

type PublicCard = {
  eyebrow?: string
  title: string
  body: string
}

type PublicPageProps = {
  countryCode: string
  eyebrow: string
  title: string
  intro: string
  primaryLink?: PublicLink
  secondaryLink?: PublicLink
  sections: PublicCard[]
  note?: string
}

export default function PublicPage({
  countryCode,
  eyebrow,
  title,
  intro,
  primaryLink,
  secondaryLink,
  sections,
  note,
}: PublicPageProps) {
  return (
    <main className="beemun-info-page">
      <section className="beemun-info-hero">
        <p className="beemun-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
        {(primaryLink || secondaryLink) && (
          <div className="beemun-actions">
            {primaryLink && (
              <Link className="beemun-btn-primary" href={`/${countryCode}${primaryLink.href}`}>
                {primaryLink.label}
              </Link>
            )}
            {secondaryLink && (
              <Link className="beemun-btn-secondary" href={`/${countryCode}${secondaryLink.href}`}>
                {secondaryLink.label}
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="beemun-section">
        <div className="beemun-public-card-grid">
          {sections.map((section) => (
            <article className="beemun-card beemun-public-card" key={section.title}>
              {section.eyebrow && <p className="beemun-eyebrow">{section.eyebrow}</p>}
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      {note && (
        <section className="beemun-section beemun-public-note">
          <p>{note}</p>
        </section>
      )}
    </main>
  )
}
