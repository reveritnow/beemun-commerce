export type ProductPreviewVariant = {
  title: string
  sku?: string
  price?: string
  currency_code?: string
  weight?: string
  length?: string
  width?: string
  height?: string
}

export type ProductPreviewData = {
  title: string
  brand?: string
  short_description?: string
  long_description?: string
  category?: string
  collection?: string
  product_type?: string
  cover_image_url?: string
  gallery_image_urls: string[]
  variants: ProductPreviewVariant[]
  ingredients?: string
  materials?: string
  packaging?: string
  usage?: string
  care_instructions?: string
  certifications?: string
  claims?: string
  warnings?: string
}

const clean = (value?: string | null) => String(value || "").trim()

const priceValues = (variants: ProductPreviewVariant[]) =>
  variants
    .map((variant) => Number(variant.price))
    .filter((value) => Number.isFinite(value) && value >= 0)

const priceLabel = (variants: ProductPreviewVariant[]) => {
  const prices = priceValues(variants)
  const currency = clean(variants.find((variant) => variant.currency_code)?.currency_code || "gbp").toUpperCase()

  if (!prices.length) {
    return "Price not set"
  }

  const min = Math.min(...prices)
  const max = Math.max(...prices)

  return min === max ? `${currency} ${min}` : `${currency} ${min} - ${max}`
}

const disclosureItems = (data: ProductPreviewData) => [
  ["Ingredients", data.ingredients],
  ["Materials", data.materials],
  ["Packaging", data.packaging],
  ["Usage", data.usage],
  ["Care", data.care_instructions],
  ["Certifications", data.certifications],
  ["Claims", data.claims],
  ["Warnings", data.warnings],
]

export default function ProductDraftPreview({
  data,
  compact = false,
}: {
  data: ProductPreviewData
  compact?: boolean
}) {
  const gallery = data.gallery_image_urls.filter(Boolean)
  const cover = clean(data.cover_image_url) || gallery[0]
  const title = clean(data.title) || "Untitled BEEMUN product"
  const brand = clean(data.brand) || "Maker brand"

  return (
    <section className={`beemun-product-draft-preview${compact ? " compact" : ""}`}>
      <div className="beemun-preview-alert">
        <strong>Preview only</strong>
        <span>This product is not public and has not yet been approved by BEEMUN.</span>
      </div>

      <div className="beemun-preview-hero">
        <div className="beemun-preview-gallery">
          <div className="beemun-preview-cover">
            {cover ? <img src={cover} alt={`${title} preview`} /> : <span>Upload product media</span>}
          </div>
          {gallery.length > 1 && (
            <div className="beemun-preview-thumbs">
              {gallery.slice(0, 5).map((url, index) => (
                <img src={url} alt={`${title} gallery ${index + 1}`} key={`${url}-${index}`} />
              ))}
            </div>
          )}
        </div>

        <div className="beemun-preview-summary">
          <p className="beemun-eyebrow">Private Maker Preview</p>
          <h1>{title}</h1>
          <p className="beemun-preview-maker">by {brand}</p>
          <strong className="beemun-preview-price">{priceLabel(data.variants)}</strong>
          <p>{clean(data.short_description) || "Add a short customer-facing description."}</p>
          <div className="beemun-status-strip">
            <span>ZPS 100 review pending</span>
            <span>Not public</span>
            <span>BEEMUN approval required</span>
          </div>
          <dl className="beemun-preview-meta">
            <div><dt>Category</dt><dd>{clean(data.category) || "Not selected"}</dd></div>
            <div><dt>Type</dt><dd>{clean(data.product_type) || "Not set"}</dd></div>
            <div><dt>Variants</dt><dd>{data.variants.length || 1}</dd></div>
            <div><dt>Media</dt><dd>{gallery.length}</dd></div>
          </dl>
        </div>
      </div>

      <div className="beemun-preview-section">
        <h2>Product story</h2>
        <p>{clean(data.long_description) || clean(data.short_description) || "Long description will appear here."}</p>
      </div>

      <div className="beemun-preview-grid">
        {disclosureItems(data).map(([label, value]) => (
          <article key={label}>
            <span>{label}</span>
            <p>{clean(value) || "Not provided yet."}</p>
          </article>
        ))}
      </div>
    </section>
  )
}