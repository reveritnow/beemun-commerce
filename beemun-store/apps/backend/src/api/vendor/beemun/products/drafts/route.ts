import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  assertPortalDocumentAccess,
  DocumentUploadError,
} from "../../document-storage"
import {
  assertVendorCanSubmitProducts,
  assertVendorIsOperable,
  marketplaceServiceOf,
  productServiceOf,
} from "../../helpers"
import { enforceRateLimit, rateLimitKeyFor } from "../../rate-limit"

type ProductDraftBody = Record<string, any>

const now = () => new Date()

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const shortSuffix = () => Math.random().toString(36).slice(2, 8)

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null

const numberValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

const normalizeList = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : []

const findApprovedVendorForEmail = async (
  marketplace: Record<string, any>,
  email: string
) => {
  const members = await marketplace.listVendorMembers({
    email,
    status: "active",
  })
  const member = members[0] || null

  if (!member) {
    return { vendor: null, member: null }
  }

  const vendor = await marketplace.retrieveVendor(member.vendor_id)

  return { vendor, member }
}

const resolveUniqueHandle = async (
  productService: Record<string, any>,
  title: string
) => {
  const base = slugify(title) || `beemun-product-${shortSuffix()}`
  const existing = await productService.listProducts({ handle: base })

  if (!existing.length) {
    return base
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}-${shortSuffix()}`
    const matches = await productService.listProducts({ handle: candidate })

    if (!matches.length) {
      return candidate
    }
  }

  return `${base}-${Date.now()}`
}

const getDefaultCommerceContext = async (req: MedusaRequest) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const salesChannelService = req.scope.resolve(
    ModuleRegistrationName.SALES_CHANNEL
  )
  const salesChannels = await salesChannelService.listSalesChannels({})
  const defaultSalesChannel =
    salesChannels.find((item: Record<string, any>) =>
      /beemun|default/i.test(String(item.name || ""))
    ) || salesChannels[0]
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })

  return {
    shippingProfileId: shippingProfiles[0]?.id || null,
    salesChannelId: defaultSalesChannel?.id || null,
  }
}

const buildVariants = (body: ProductDraftBody) => {
  const rawVariants = Array.isArray(body.variants) ? body.variants : []
  const variants = rawVariants.length
    ? rawVariants
    : [
        {
          title: "Default",
          sku: body.sku,
          price: body.price,
          currency_code: body.currency_code,
          weight: body.weight,
        },
      ]

  return variants.map((variant: Record<string, any>, index: number) => {
    const title = text(variant.title) || (index === 0 ? "Default" : `Variant ${index + 1}`)
    const amount = numberValue(variant.price)
    const currencyCode = String(variant.currency_code || body.currency_code || "gbp")
      .trim()
      .toLowerCase()

    return {
      title,
      sku: text(variant.sku) || undefined,
      manage_inventory: false,
      weight: numberValue(variant.weight ?? body.weight),
      length: numberValue(variant.length ?? body.length),
      height: numberValue(variant.height ?? body.height),
      width: numberValue(variant.width ?? body.width),
      options: {
        Title: title,
      },
      prices:
        amount !== undefined
          ? [
              {
                amount,
                currency_code: currencyCode,
              },
            ]
          : [],
    }
  })
}

const beemunReviewMetadata = (body: ProductDraftBody, member: Record<string, any>) => ({
  source: "maker_dashboard_product_onboarding",
  submitted_by_vendor_member_id: member.id,
  basic_information: {
    brand: text(body.brand),
    short_description: text(body.short_description),
    long_description: text(body.long_description),
  },
  taxonomy: {
    category_ids: normalizeList(body.category_ids),
    collection_id: text(body.collection_id),
    product_type: text(body.product_type),
    tags: normalizeList(body.tags),
  },
  media: {
    cover_image_url: text(body.cover_image_url),
    gallery_image_urls: normalizeList(body.gallery_image_urls),
    storage_provider: "external_url_until_file_provider_enabled",
  },
  beemun_product_information: {
    ingredients: text(body.ingredients),
    materials: text(body.materials),
    packaging: text(body.packaging),
    usage: text(body.usage),
    care_instructions: text(body.care_instructions),
    certifications: text(body.certifications),
    claims: text(body.claims),
    warnings: text(body.warnings),
  },
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    assertPortalDocumentAccess(req.headers)
  } catch (error) {
    if (error instanceof DocumentUploadError) {
      res.status(error.status).json({ message: error.message, code: error.code })
      return
    }

    throw error
  }

  const body = (req.body || {}) as ProductDraftBody
  const email = String(body.email || "").trim().toLowerCase()

  if (!email) {
    res.status(400).json({ message: "Maker email is required." })
    return
  }

  if (
    !enforceRateLimit(req, res, {
      key: rateLimitKeyFor(req, "maker-product-draft", email),
      limit: 20,
      windowMs: 60 * 60_000,
    })
  ) {
    return
  }

  const title = text(body.title)

  if (!title) {
    res.status(400).json({ message: "Product name is required." })
    return
  }

  if (!text(body.short_description)) {
    res.status(400).json({ message: "Short description is required." })
    return
  }

  const marketplace = marketplaceServiceOf(req)
  const productService = productServiceOf(req)
  const { vendor, member } = await findApprovedVendorForEmail(marketplace, email)

  if (!vendor || !member) {
    res.status(403).json({ message: "Approved maker access is required." })
    return
  }

  assertVendorIsOperable(vendor)
  assertVendorCanSubmitProducts(vendor)

  const { shippingProfileId, salesChannelId } = await getDefaultCommerceContext(req)

  if (!shippingProfileId) {
    res.status(503).json({
      message:
        "Medusa shipping profile is not configured. Please complete backend marketplace setup before product onboarding.",
    })
    return
  }

  const handle = await resolveUniqueHandle(productService, title)
  const galleryImageUrls = normalizeList(body.gallery_image_urls)
  const coverImageUrl = text(body.cover_image_url) || galleryImageUrls[0] || null
  const shouldSubmit = body.submit !== false
  const reviewStatus = shouldSubmit ? "submitted" : "draft"
  const timestamp = now()
  const variants = buildVariants(body)
  const productInput: Record<string, any> = {
    title,
    subtitle: text(body.brand) || undefined,
    description: text(body.long_description) || text(body.short_description) || undefined,
    handle,
    status: ProductStatus.DRAFT,
    shipping_profile_id: shippingProfileId,
    category_ids: normalizeList(body.category_ids),
    collection_id: text(body.collection_id) || undefined,
    thumbnail: coverImageUrl || undefined,
    images: galleryImageUrls.map((url) => ({ url })),
    options: [
      {
        title: "Title",
        values: variants.map((variant) => variant.title),
      },
    ],
    variants,
    sales_channels: salesChannelId ? [{ id: salesChannelId }] : undefined,
    metadata: {
      beemun_vendor_id: vendor.id,
      beemun_zps_status: reviewStatus,
      beemun_zps_approved: false,
      beemun_public_visibility_eligible: false,
      beemun_product_onboarding: true,
      maker_brand: text(body.brand),
    },
  }

  const { result } = await createProductsWorkflow(req.scope).run({
    input: {
      products: [productInput as any],
    },
  })
  const product = result[0]
  const vendorProduct = await marketplace.createVendorProducts({
    vendor_id: vendor.id,
    product_id: product.id,
    relationship_type: "maker",
    is_primary: true,
    ownership_started_at: timestamp,
    metadata: {
      source: "maker_dashboard_product_onboarding",
      created_by_vendor_member_id: member.id,
    },
  })
  const review = await marketplace.createProductReviews({
    vendor_product_id: vendorProduct.id,
    product_id: product.id,
    status: reviewStatus,
    public_visibility_eligible: false,
    submitted_at: shouldSubmit ? timestamp : null,
    metadata: beemunReviewMetadata(body, member),
  })

  await marketplace.createProductReviewEvents({
    product_review_id: review.id,
    from_status: null,
    to_status: reviewStatus,
    actor_type: "vendor",
    actor_user_id: member.external_auth_id || null,
    reason: shouldSubmit
      ? "Maker submitted product for BEEMUN ZPS review"
      : "Maker saved product draft",
    notes: text(body.notes),
    metadata: {
      vendor_member_id: member.id,
      product_handle: product.handle,
    },
  })

  res.status(201).json({
    product,
    vendor_product: vendorProduct,
    product_review: review,
  })
}

