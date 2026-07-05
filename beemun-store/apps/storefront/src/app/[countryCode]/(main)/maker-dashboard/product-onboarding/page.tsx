import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"

export default async function MakerDashboardProductOnboardingPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  await getApprovedMakerDashboardContext(countryCode)

  const steps = [
    "Create Medusa draft product",
    "Add variants, pricing, and product media",
    "Add ingredients, materials, packaging, and ZPS disclosures",
    "Submit to BEEMUN product review",
    "Publish only after BEEMUN approval",
  ]

  return (
    <div className="beemun-dashboard-grid">
      <article className="beemun-dashboard-card beemun-dashboard-card-wide">
        <p className="beemun-eyebrow">Product Onboarding</p>
        <h2>Controlled product creation comes next</h2>
        <p>
          This shell reserves the product onboarding workspace without enabling
          premature product publishing. The next implementation will reuse
          Medusa products, variants, pricing, and media while keeping BEEMUN ZPS
          review as the public gate.
        </p>
      </article>
      {steps.map((step, index) => (
        <article className="beemun-dashboard-card" key={step}>
          <p className="beemun-eyebrow">Step {index + 1}</p>
          <h2>{step}</h2>
          <p>
            {index === 0
              ? "Products begin as drafts owned by your maker profile."
              : "This step will open after the product onboarding milestone begins."}
          </p>
        </article>
      ))}
    </div>
  )
}
