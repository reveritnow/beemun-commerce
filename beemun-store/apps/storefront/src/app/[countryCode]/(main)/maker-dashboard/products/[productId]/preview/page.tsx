import { getApprovedMakerDashboardContext } from "../../../../../../../lib/data/maker-dashboard"
import ProductPrivatePreview from "../../../_components/product-private-preview"

export default async function MakerProductPrivatePreviewPage({
  params,
}: {
  params: Promise<{ countryCode: string; productId: string }>
}) {
  const { countryCode, productId } = await params
  await getApprovedMakerDashboardContext(countryCode)

  return <ProductPrivatePreview countryCode={countryCode} productId={productId} />
}