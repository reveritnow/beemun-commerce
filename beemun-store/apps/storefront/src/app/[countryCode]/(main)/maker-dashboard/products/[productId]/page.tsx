import { getApprovedMakerDashboardContext } from "../../../../../../lib/data/maker-dashboard"
import { listCategories } from "../../../../../../lib/data/categories"
import { listCollections } from "../../../../../../lib/data/collections"
import ProductReviewEditor from "../../_components/product-review-editor"

export default async function MakerDashboardProductDetailPage({
  params,
}: {
  params: Promise<{ countryCode: string; productId: string }>
}) {
  const { countryCode, productId } = await params
  await getApprovedMakerDashboardContext(countryCode)
  const [categories, collectionResult] = await Promise.all([
    listCategories({ limit: 100 }),
    listCollections({ limit: "100", offset: "0" }),
  ])

  return (
    <ProductReviewEditor
      countryCode={countryCode}
      productId={productId}
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
