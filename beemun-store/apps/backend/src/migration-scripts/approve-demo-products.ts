import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  ProductStatus,
} from "@medusajs/framework/utils"
import { BEEMUN_MARKETPLACE_MODULE } from "../modules/marketplace"

const DEMO_PRODUCT_HANDLES = [
  "cold-pressed-coconut-oil",
  "unscented-daily-body-bar",
  "herbal-hair-wash-powder",
  "shea-repair-balm",
  "mineral-laundry-sheets",
  "reusable-dish-block",
]

const DEMO_VENDOR = {
  name: "BEEMUN Demo Makers",
  handle: "beemun-demo-makers",
  email: "makers@beemun.local",
  description:
    "Controlled demo vendor for seeded BEEMUN launch products only.",
}

const visibleMetadata = (metadata?: Record<string, unknown> | null) => ({
  ...(metadata || {}),
  beemun_zps_status: "approved",
  beemun_zps_approved: true,
  beemun_public_visibility_eligible: true,
})

export default async function approve_demo_products({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const marketplace = container.resolve(BEEMUN_MARKETPLACE_MODULE) as Record<
    string,
    any
  >
  const productService = container.resolve(
    ModuleRegistrationName.PRODUCT
  ) as Record<string, any>

  logger.info("Approving controlled BEEMUN demo products...")

  const existingVendors = await marketplace.listVendors({
    handle: DEMO_VENDOR.handle,
  })

  const vendor =
    existingVendors[0] ||
    (await marketplace.createVendors({
      ...DEMO_VENDOR,
      status: "approved",
      approved_at: new Date(),
      reviewed_at: new Date(),
      metadata: {
        seed_scope: "demo_products_only",
      },
    }))

  const products = await productService.listProducts({
    handle: DEMO_PRODUCT_HANDLES,
  })

  const foundHandles = new Set(products.map((product: any) => product.handle))
  const missingHandles = DEMO_PRODUCT_HANDLES.filter(
    (handle) => !foundHandles.has(handle)
  )

  if (missingHandles.length) {
    logger.warn(
      `Skipped missing BEEMUN demo products: ${missingHandles.join(", ")}`
    )
  }

  for (const product of products) {
    const vendorProducts = await marketplace.listVendorProducts({
      vendor_id: vendor.id,
      product_id: product.id,
    })

    const vendorProduct =
      vendorProducts[0] ||
      (await marketplace.createVendorProducts({
        vendor_id: vendor.id,
        product_id: product.id,
        relationship_type: "maker",
        is_primary: true,
        ownership_started_at: new Date(),
        metadata: {
          seed_scope: "demo_products_only",
        },
      }))

    const reviews = await marketplace.listProductReviews({
      vendor_product_id: vendorProduct.id,
    })
    const existingReview = reviews[0]

    const review = existingReview
      ? await marketplace.updateProductReviews({
          id: existingReview.id,
          product_id: product.id,
          status: "published",
          zps_score: existingReview.zps_score ?? 100,
          ai_risk_score: existingReview.ai_risk_score ?? 0,
          public_visibility_eligible: true,
          approved_at: existingReview.approved_at || new Date(),
          published_at: existingReview.published_at || new Date(),
          rejection_reason: null,
          change_request: null,
          metadata: {
            ...(existingReview.metadata || {}),
            seed_scope: "demo_products_only",
          },
        })
      : await marketplace.createProductReviews({
          vendor_product_id: vendorProduct.id,
          product_id: product.id,
          status: "published",
          zps_score: 100,
          ai_risk_score: 0,
          public_visibility_eligible: true,
          submitted_at: new Date(),
          automatic_checks_started_at: new Date(),
          automatic_checks_completed_at: new Date(),
          zps_review_started_at: new Date(),
          approved_at: new Date(),
          published_at: new Date(),
          metadata: {
            seed_scope: "demo_products_only",
          },
        })

    const reviewEvents = await marketplace.listProductReviewEvents({
      product_review_id: review.id,
      to_status: "published",
    })

    if (!reviewEvents.length) {
      await marketplace.createProductReviewEvents({
        product_review_id: review.id,
        from_status: existingReview?.status || null,
        to_status: "published",
        actor_type: "system",
        actor_user_id: null,
        reason: "Controlled approval for seeded BEEMUN demo product",
        notes: null,
        metadata: {
          seed_scope: "demo_products_only",
        },
      })
    }

    const qualitySignals = await marketplace.listProductQualitySignals({
      product_review_id: review.id,
      signal_type: "zps_score",
    })

    if (!qualitySignals.length) {
      await marketplace.createProductQualitySignals({
        product_review_id: review.id,
        signal_type: "zps_score",
        score: 100,
        outcome: "approved",
        source: "seed",
        source_reference: product.handle,
        notes: "Controlled ZPS approval for BEEMUN seeded demo product.",
        metadata: {
          seed_scope: "demo_products_only",
        },
      })
    }

    await productService.updateProducts(product.id, {
      status: ProductStatus.PUBLISHED,
      metadata: {
        ...visibleMetadata(product.metadata),
        beemun_product_review_id: review.id,
      },
    })
  }

  logger.info(
    `Approved ${products.length} controlled BEEMUN demo products for storefront visibility.`
  )
}
