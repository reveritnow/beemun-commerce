import { getApprovedMakerDashboardContext } from "../../../../../lib/data/maker-dashboard"
import { listCategories } from "../../../../../lib/data/categories"
import { listCollections } from "../../../../../lib/data/collections"
import ProductOnboardingWizard from "../_components/product-onboarding-wizard"

export default async function MakerDashboardProductOnboardingPage({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  await getApprovedMakerDashboardContext(countryCode)
  const [categories, collectionResult] = await Promise.all([
    listCategories({ limit: 100 }),
    listCollections({ limit: "100", offset: "0" }),
  ])

  return (
    <ProductOnboardingWizard
      countryCode={countryCode}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        handle: category.handle,
      }))}
      collections={collectionResult.collections.map((collection) => ({
        id: collection.id,
        title: collection.title,
        handle: collection.handle,
      }))}
    />
  )
}
