"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import ProductDraftPreview, { ProductPreviewData, ProductPreviewVariant } from "./product-draft-preview"

type ProductPayload = Record<string, any>

const stringValue = (value: unknown) =>
  value === null || value === undefined ? "" : String(value)

const joinList = (value: unknown) =>
  Array.isArray(value) ? value.filter(Boolean).join(", ") : ""

const firstPrice = (variant: Record<string, any>) => {
  const prices = Array.isArray(variant.prices) ? variant.prices : []
  return prices[0] || null
}

const buildPreviewData = (data: ProductPayload): ProductPreviewData => {
  const product = data.product || {}
  const review = data.product_review || {}
  const metadata = review.metadata || {}
  const basic = metadata.basic_information || {}
  const taxonomy = metadata.taxonomy || {}
  const media = metadata.media || {}
  const beemun = metadata.beemun_product_information || {}
  const privateFiles = Array.isArray(media.private_media_files) ? media.private_media_files : []
  const gallery = privateFiles.length
    ? privateFiles.map((file: Record<string, any>) => file.preview_url).filter(Boolean)
    : Array.isArray(media.gallery_image_urls)
    ? media.gallery_image_urls.filter(Boolean)
    : []
  const variants: ProductPreviewVariant[] = Array.isArray(product.variants) && product.variants.length
    ? product.variants.map((variant: Record<string, any>) => {
        const price = firstPrice(variant)
        return {
          title: variant.title || "Default",
          sku: stringValue(variant.sku),
          price: stringValue(price?.amount),
          currency_code: stringValue(price?.currency_code || "gbp"),
          weight: stringValue(variant.weight),
          length: stringValue(variant.length),
          width: stringValue(variant.width),
          height: stringValue(variant.height),
        }
      })
    : [{ title: "Default", currency_code: "gbp" }]

  return {
    title: product.title || "",
    brand: basic.brand || product.subtitle || product.metadata?.maker_brand || "",
    short_description: basic.short_description || "",
    long_description: basic.long_description || product.description || "",
    category: product.categories?.[0]?.name || taxonomy.category_ids?.[0] || "",
    collection: product.collection?.title || "",
    product_type: taxonomy.product_type || "",
    cover_image_url: media.cover_image_url || gallery[0] || "",
    gallery_image_urls: gallery,
    variants,
    ingredients: beemun.ingredients || "",
    materials: beemun.materials || "",
    packaging: beemun.packaging || "",
    usage: beemun.usage || "",
    care_instructions: beemun.care_instructions || "",
    certifications: beemun.certifications || "",
    claims: beemun.claims || "",
    warnings: beemun.warnings || "",
  }
}

export default function ProductPrivatePreview({
  countryCode,
  productId,
}: {
  countryCode: string
  productId: string
}) {
  const [data, setData] = useState<ProductPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    const loadPreview = async () => {
      setLoading(true)
      setError("")
      try {
        const response = await fetch(`/api/beemun/maker-dashboard/products/${productId}`, {
          cache: "no-store",
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload?.message || "This private preview could not be opened.")
        if (mounted) setData(payload)
      } catch (previewError) {
        if (mounted) setError(previewError instanceof Error ? previewError.message : "This private preview could not be opened.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadPreview()
    return () => {
      mounted = false
    }
  }, [productId])

  const previewData = useMemo(() => (data ? buildPreviewData(data) : null), [data])

  if (loading) {
    return <article className="beemun-dashboard-card beemun-dashboard-card-wide"><p className="beemun-eyebrow">Private Preview</p><h2>Opening product preview</h2><p>BEEMUN is loading the maker-owned draft and protected media.</p></article>
  }

  if (error || !previewData) {
    return <article className="beemun-dashboard-card beemun-dashboard-card-wide"><p className="beemun-eyebrow">Preview unavailable</p><h2>This product preview could not be opened</h2><p>{error || "The product preview data is unavailable."}</p><Link className="beemun-btn-secondary" href={`/${countryCode}/maker-dashboard/products`}>Back to products</Link></article>
  }

  return (
    <div className="beemun-private-preview-page">
      <article className="beemun-dashboard-card beemun-dashboard-card-wide beemun-product-editor-hero">
        <div>
          <p className="beemun-eyebrow">Private Product Preview</p>
          <h2>{previewData.title || "BEEMUN product preview"}</h2>
          <p>Only authenticated approved maker members who own this product can view this draft preview. It is not a public storefront URL.</p>
        </div>
        <Link className="beemun-btn-secondary" href={`/${countryCode}/maker-dashboard/products/${productId}`}>Edit product</Link>
      </article>
      <ProductDraftPreview data={previewData} />
    </div>
  )
}