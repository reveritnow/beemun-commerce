import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

type CategoryName =
  | "Skin & Body"
  | "Hair Care"
  | "Oils & Butters"
  | "Home Essentials";

type CollectionTitle =
  | "Founder Favorites"
  | "Daily Rituals"
  | "Maker Led"
  | "Refill Ready";

const productImage = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=80`;

const isExistingDataError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");

  return /already|duplicate|unique|exists/i.test(message);
};

const runIfNotExisting = async (
  label: string,
  logger: Record<string, any>,
  action: () => Promise<unknown>
) => {
  try {
    await action();
  } catch (error) {
    if (isExistingDataError(error)) {
      logger.info(`${label} already exists. Skipping.`);
      return;
    }

    throw error;
  }
};

const priceSet = (gbp: number, usd: number) => [
  {
    amount: gbp,
    currency_code: "gbp",
  },
  {
    amount: usd,
    currency_code: "usd",
  },
];

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const apiKeyModuleService = container.resolve(Modules.API_KEY) as any;
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  ) as any;
  const inventoryModuleService = container.resolve(Modules.INVENTORY) as any;
  const productModuleService = container.resolve(Modules.PRODUCT) as any;
  const regionModuleService = container.resolve(Modules.REGION) as any;
  const salesChannelModuleService = container.resolve(
    Modules.SALES_CHANNEL
  ) as any;
  const stockLocationModuleService = container.resolve(
    Modules.STOCK_LOCATION
  ) as any;
  const storeModuleService = container.resolve(Modules.STORE) as any;
  const taxModuleService = container.resolve(Modules.TAX) as any;

  const countries = ["gb"];

  logger.info("Seeding BEEMUN store data...");
  let defaultSalesChannel = (
    await salesChannelModuleService.listSalesChannels({
      name: "BEEMUN Marketplace",
    })
  )[0];

  if (!defaultSalesChannel) {
    const {
      result: [createdSalesChannel],
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: "BEEMUN Marketplace",
            description: "BEEMUN curated ZPS 100 storefront",
          },
        ],
      },
    });

    defaultSalesChannel = createdSalesChannel;
  } else {
    logger.info("BEEMUN sales channel already exists. Reusing it.");
  }

  let publishableApiKey = (
    await apiKeyModuleService.listApiKeys({
      title: "BEEMUN Storefront Publishable Key",
    })
  )[0];

  if (!publishableApiKey) {
    const {
      result: [createdApiKey],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "BEEMUN Storefront Publishable Key",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = createdApiKey;
  } else {
    logger.info("BEEMUN publishable API key already exists. Reusing it.");
  }

  await runIfNotExisting("Publishable API key sales channel link", logger, () =>
    linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: publishableApiKey.id,
        add: [defaultSalesChannel.id],
      },
    })
  );

  const existingStores = await storeModuleService.listStores({
    name: "BEEMUN",
  });

  if (!existingStores.length) {
    await createStoresWorkflow(container).run({
      input: {
        stores: [
          {
            name: "BEEMUN",
            supported_currencies: [
              {
                currency_code: "gbp",
                is_default: true,
              },
              {
                currency_code: "usd",
                is_default: false,
              },
            ],
            default_sales_channel_id: defaultSalesChannel.id,
          },
        ],
      },
    });
  } else {
    logger.info("BEEMUN store already exists. Skipping store creation.");
  }

  logger.info("Seeding BEEMUN region data...");
  let region = (
    await regionModuleService.listRegions(
      {
        name: "BEEMUN UK Launch",
      },
      {
        relations: ["countries"],
      }
    )
  )[0];

  if (!region) {
    const regions = await regionModuleService.listRegions(
      {},
      {
        relations: ["countries"],
      }
    );

    region = regions.find((item: any) =>
      item.countries?.some((country: any) => country.iso_2 === "gb")
    );
  }

  if (!region) {
    try {
      const { result: regionResult } = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "BEEMUN UK Launch",
              currency_code: "gbp",
              countries,
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      });
      region = regionResult[0];
    } catch (error) {
      if (!isExistingDataError(error)) {
        throw error;
      }

      const regions = await regionModuleService.listRegions(
        {},
        {
          relations: ["countries"],
        }
      );

      region = regions.find((item: any) =>
        item.countries?.some((country: any) => country.iso_2 === "gb")
      );

      if (!region) {
        throw error;
      }

      logger.info("GB country is already assigned to an existing region. Reusing it.");
    }
  } else {
    logger.info("BEEMUN GB region already exists. Reusing it.");
  }
  logger.info("Finished seeding BEEMUN regions.");

  logger.info("Seeding tax regions...");
  const existingTaxRegions = await taxModuleService.listTaxRegions({
    country_code: countries,
  });
  const existingTaxCountries = new Set(
    existingTaxRegions.map((taxRegion: any) => taxRegion.country_code)
  );
  const missingTaxCountries = countries.filter(
    (countryCode) => !existingTaxCountries.has(countryCode)
  );

  if (missingTaxCountries.length) {
    await createTaxRegionsWorkflow(container).run({
      input: missingTaxCountries.map((country_code) => ({
        country_code,
        provider_id: "tp_system",
      })),
    });
  } else {
    logger.info("BEEMUN tax regions already exist. Skipping tax region creation.");
  }
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  let stockLocation = (
    await stockLocationModuleService.listStockLocations({
      name: "BEEMUN Launch Warehouse",
    })
  )[0];

  if (!stockLocation) {
    const { result: stockLocationResult } = await createStockLocationsWorkflow(
      container
    ).run({
      input: {
        locations: [
          {
            name: "BEEMUN Launch Warehouse",
            address: {
              city: "London",
              country_code: "GB",
              address_1: "",
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0];
  } else {
    logger.info("BEEMUN stock location already exists. Reusing it.");
  }

  await runIfNotExisting("Stock location fulfillment provider link", logger, () =>
    link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    })
  );

  logger.info("Seeding fulfillment data...");
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfileResult[0];

  let fulfillmentSet = (
    await fulfillmentModuleService.listFulfillmentSets(
      {
        name: "BEEMUN reviewed delivery",
      },
      {
        relations: ["service_zones"],
      }
    )
  )[0];

  if (!fulfillmentSet) {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "BEEMUN reviewed delivery",
      type: "shipping",
      service_zones: [
        {
          name: "United Kingdom",
          geo_zones: [
            {
              country_code: "gb",
              type: "country",
            },
          ],
        },
      ],
    });
  } else {
    logger.info("BEEMUN fulfillment set already exists. Reusing it.");
  }

  await runIfNotExisting("Stock location fulfillment set link", logger, () =>
    link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    })
  );

  const shippingOptions = [
      {
        name: "BEEMUN Standard Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Tracked delivery with plastic-conscious packing notes.",
          code: "standard",
        },
        prices: [
          ...priceSet(5, 7),
          {
            region_id: region.id,
            amount: 5,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "BEEMUN Priority Delivery",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Priority",
          description: "Faster dispatch for time-sensitive refills.",
          code: "priority",
        },
        prices: [
          ...priceSet(9, 12),
          {
            region_id: region.id,
            amount: 9,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ];
  const existingShippingOptions =
    await fulfillmentModuleService.listShippingOptions({});
  const existingShippingNames = new Set(
    existingShippingOptions.map((option: any) => option.name)
  );
  const missingShippingOptions = shippingOptions.filter(
    (option) => !existingShippingNames.has(option.name)
  );

  if (missingShippingOptions.length) {
    await createShippingOptionsWorkflow(container).run({
      input: missingShippingOptions as any,
    });
  } else {
    logger.info("BEEMUN shipping options already exist. Skipping creation.");
  }
  logger.info("Finished seeding fulfillment data.");

  await runIfNotExisting("Sales channel stock location link", logger, () =>
    linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel.id],
      },
    })
  );
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding BEEMUN product data...");

  const categoryInputs = [
    {
      name: "Skin & Body",
      handle: "skin-body",
      is_active: true,
    },
    {
      name: "Hair Care",
      handle: "hair-care",
      is_active: true,
    },
    {
      name: "Oils & Butters",
      handle: "oils-butters",
      is_active: true,
    },
    {
      name: "Home Essentials",
      handle: "home-essentials",
      is_active: true,
    },
  ];

  let categoryResult = await productModuleService.listProductCategories({
    handle: categoryInputs.map((category) => category.handle),
  });

  if (!categoryResult.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: categoryInputs,
      },
    });
    categoryResult = result;
  } else {
    logger.info("BEEMUN product categories already exist. Reusing them.");
  }

  const collectionInputs = [
    {
      title: "Founder Favorites",
      handle: "founder-favorites",
    },
    {
      title: "Daily Rituals",
      handle: "daily-rituals",
    },
    {
      title: "Maker Led",
      handle: "maker-led",
    },
    {
      title: "Refill Ready",
      handle: "refill-ready",
    },
  ];

  let collectionResult = await productModuleService.listProductCollections({
    handle: collectionInputs.map((collection) => collection.handle),
  });

  if (!collectionResult.length) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: {
        collections: collectionInputs,
      },
    });
    collectionResult = result;
  } else {
    logger.info("BEEMUN product collections already exist. Reusing them.");
  }

  const categoryId = (name: CategoryName) =>
    categoryResult.find((category) => category.name === name)!.id;

  const collectionId = (title: CollectionTitle) =>
    collectionResult.find((collection) => collection.title === title)!.id;

  const productInputs = [
        {
          title: "Cold-Pressed Coconut Oil",
          subtitle: "Single-origin multipurpose oil",
          category_ids: [categoryId("Oils & Butters")],
          collection_id: collectionId("Founder Favorites"),
          description:
            "A single-origin coconut oil for skin, hair, and daily rituals, reviewed for ingredient clarity and low-waste packaging.",
          handle: "cold-pressed-coconut-oil",
          weight: 520,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: productImage("photo-1615484477778-ca3b77940c25"),
          images: [
            {
              url: productImage("photo-1615484477778-ca3b77940c25"),
            },
            {
              url: productImage("photo-1608248543803-ba4f8c70ae0b"),
            },
          ],
          options: [
            {
              title: "Size",
              values: ["250 ml", "500 ml"],
            },
          ],
          variants: [
            {
              title: "250 ml",
              sku: "BEE-COCONUT-OIL-250",
              options: {
                Size: "250 ml",
              },
              prices: priceSet(16, 20),
            },
            {
              title: "500 ml",
              sku: "BEE-COCONUT-OIL-500",
              options: {
                Size: "500 ml",
              },
              prices: priceSet(26, 32),
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
          metadata: {
            ingredients: "100% cold-pressed coconut oil. No fragrance, filler, mineral oil, or synthetic preservative.",
            packaging: "Glass jar with paper label and plastic-free shipper where available.",
            beemun_approval:
              "Approved because the ingredient list is singular, sourceable, and easy for customers to verify before purchase.",
            maker_story:
              "Made by a small coastal oil press focused on short supply chains, low heat extraction, and batch-level accountability.",
            how_to_use:
              "Warm a small amount between palms and apply to dry skin, hair ends, or rough areas. Store away from direct heat.",
            shipping_returns:
              "Ships through BEEMUN reviewed delivery. Unopened items can be returned under the marketplace returns policy.",
          },
        },
        {
          title: "Unscented Daily Body Bar",
          subtitle: "Zero synthetic cleansing bar",
          category_ids: [categoryId("Skin & Body")],
          collection_id: collectionId("Daily Rituals"),
          description:
            "A gentle daily cleansing bar made without synthetic fragrance, plastic wrap, or unclear claims.",
          handle: "unscented-daily-body-bar",
          weight: 140,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: productImage("photo-1607006483224-9422e5cf6818"),
          images: [
            {
              url: productImage("photo-1607006483224-9422e5cf6818"),
            },
            {
              url: productImage("photo-1600857544200-b2f666a9a2ec"),
            },
          ],
          options: [
            {
              title: "Pack",
              values: ["Single", "Set of 3"],
            },
          ],
          variants: [
            {
              title: "Single",
              sku: "BEE-BODY-BAR-1",
              options: {
                Pack: "Single",
              },
              prices: priceSet(8, 10),
            },
            {
              title: "Set of 3",
              sku: "BEE-BODY-BAR-3",
              options: {
                Pack: "Set of 3",
              },
              prices: priceSet(21, 27),
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
          metadata: {
            ingredients:
              "Saponified olive oil, coconut oil, shea butter, kaolin clay, and filtered water.",
            packaging:
              "Paper wrap and recycled-card outer. No shrink wrap, sachets, or plastic coating.",
            beemun_approval:
              "Approved for transparent soapmaking, plastic-free presentation, and no synthetic fragrance disclosure risk.",
            maker_story:
              "Poured by an independent soap studio that documents each batch and avoids vague perfume blends.",
            how_to_use:
              "Lather with wet hands or cloth, rinse well, and keep dry between uses to extend bar life.",
            shipping_returns:
              "Ships in recyclable protection. Hygiene items are returnable only when unopened.",
          },
        },
        {
          title: "Herbal Hair Wash Powder",
          subtitle: "Waterless refill ritual",
          category_ids: [categoryId("Hair Care")],
          collection_id: collectionId("Refill Ready"),
          description:
            "A waterless hair wash powder built around clearly named botanicals and a lightweight refill format.",
          handle: "herbal-hair-wash-powder",
          weight: 180,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: productImage("photo-1608571423902-eed4a5ad8108"),
          images: [
            {
              url: productImage("photo-1608571423902-eed4a5ad8108"),
            },
            {
              url: productImage("photo-1617897903246-719242758050"),
            },
          ],
          options: [
            {
              title: "Format",
              values: ["Starter Tin", "Refill Pouch"],
            },
          ],
          variants: [
            {
              title: "Starter Tin",
              sku: "BEE-HAIR-WASH-TIN",
              options: {
                Format: "Starter Tin",
              },
              prices: priceSet(18, 23),
            },
            {
              title: "Refill Pouch",
              sku: "BEE-HAIR-WASH-REFILL",
              options: {
                Format: "Refill Pouch",
              },
              prices: priceSet(14, 18),
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
          metadata: {
            ingredients:
              "Amla, shikakai, hibiscus, aloe powder, rice starch, and bentonite clay.",
            packaging:
              "Reusable aluminium tin or paper refill pouch with home-compostable inner liner where available.",
            beemun_approval:
              "Approved because the formula avoids water-heavy packaging and keeps every botanical plainly disclosed.",
            maker_story:
              "Blended by a herbal care maker specialising in powder formats that reduce freight weight and plastic dependence.",
            how_to_use:
              "Mix one teaspoon with warm water into a paste, massage into wet scalp, and rinse thoroughly.",
            shipping_returns:
              "Starter tins and unopened refills ship through BEEMUN reviewed delivery.",
          },
        },
        {
          title: "Shea Repair Balm",
          subtitle: "Rich rescue balm",
          category_ids: [categoryId("Skin & Body")],
          collection_id: collectionId("Maker Led"),
          description:
            "A rich all-purpose balm for hands, elbows, lips, and dry spots, made with disclosed oils and waxes only.",
          handle: "shea-repair-balm",
          weight: 120,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: productImage("photo-1596755389378-c31d21fd1273"),
          images: [
            {
              url: productImage("photo-1596755389378-c31d21fd1273"),
            },
            {
              url: productImage("photo-1596462502278-27bfdc403348"),
            },
          ],
          options: [
            {
              title: "Size",
              values: ["60 ml", "120 ml"],
            },
          ],
          variants: [
            {
              title: "60 ml",
              sku: "BEE-SHEA-BALM-60",
              options: {
                Size: "60 ml",
              },
              prices: priceSet(15, 19),
            },
            {
              title: "120 ml",
              sku: "BEE-SHEA-BALM-120",
              options: {
                Size: "120 ml",
              },
              prices: priceSet(24, 30),
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
          metadata: {
            ingredients:
              "Unrefined shea butter, jojoba oil, calendula-infused olive oil, and candelilla wax.",
            packaging:
              "Aluminium tin with paper seal. Ships without bubble wrap or plastic sample sachets.",
            beemun_approval:
              "Approved for a short anhydrous formula, non-plastic primary pack, and clear maker sourcing notes.",
            maker_story:
              "Crafted by a women-led balm studio that documents butter origin and small-batch freshness.",
            how_to_use:
              "Apply a pea-sized amount to dry areas. A little goes a long way.",
            shipping_returns:
              "Unopened tins can be returned. Damaged delivery claims are handled through BEEMUN support.",
          },
        },
        {
          title: "Mineral Laundry Sheets",
          subtitle: "Low-waste home essential",
          category_ids: [categoryId("Home Essentials")],
          collection_id: collectionId("Refill Ready"),
          description:
            "Lightweight laundry sheets made for smaller cupboards, lighter freight, and visible ingredient accountability.",
          handle: "mineral-laundry-sheets",
          weight: 220,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: productImage("photo-1556228578-8c89e6adf883"),
          images: [
            {
              url: productImage("photo-1556228578-8c89e6adf883"),
            },
            {
              url: productImage("photo-1527515637462-cff94eecc1ac"),
            },
          ],
          options: [
            {
              title: "Count",
              values: ["32 washes", "64 washes"],
            },
          ],
          variants: [
            {
              title: "32 washes",
              sku: "BEE-LAUNDRY-32",
              options: {
                Count: "32 washes",
              },
              prices: priceSet(13, 17),
            },
            {
              title: "64 washes",
              sku: "BEE-LAUNDRY-64",
              options: {
                Count: "64 washes",
              },
              prices: priceSet(22, 28),
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
          metadata: {
            ingredients:
              "Plant-derived surfactants, sodium citrate, washing soda, glycerin, and mineral softeners.",
            packaging:
              "Card envelope with no plastic tub, scoop, or pod casing.",
            beemun_approval:
              "Approved because the product reduces shipping weight and avoids the plastic-heavy detergent format.",
            maker_story:
              "Developed by a home care maker focused on concentrated formats and plain-language formulation.",
            how_to_use:
              "Place one sheet directly in the drum. Use half a sheet for light loads or two for heavy loads.",
            shipping_returns:
              "Ships flat. Unopened packs can be returned through the BEEMUN order flow.",
          },
        },
        {
          title: "Reusable Dish Block",
          subtitle: "Solid kitchen cleanser",
          category_ids: [categoryId("Home Essentials")],
          collection_id: collectionId("Daily Rituals"),
          description:
            "A solid dish block for everyday washing, paired with transparent ingredients and no plastic bottle.",
          handle: "reusable-dish-block",
          weight: 260,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          thumbnail: productImage("photo-1583947215259-38e31be8751f"),
          images: [
            {
              url: productImage("photo-1583947215259-38e31be8751f"),
            },
            {
              url: productImage("photo-1604762512526-b23ec0499b4b"),
            },
          ],
          options: [
            {
              title: "Bundle",
              values: ["Block", "Block + Brush"],
            },
          ],
          variants: [
            {
              title: "Block",
              sku: "BEE-DISH-BLOCK",
              options: {
                Bundle: "Block",
              },
              prices: priceSet(9, 12),
            },
            {
              title: "Block + Brush",
              sku: "BEE-DISH-BLOCK-BRUSH",
              options: {
                Bundle: "Block + Brush",
              },
              prices: priceSet(17, 22),
            },
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
          metadata: {
            ingredients:
              "Coconut-derived soap, sodium bicarbonate, citric acid, and lemon peel powder.",
            packaging:
              "Bare block with paper band. Brush bundle uses beechwood and plant bristles.",
            beemun_approval:
              "Approved for removing the recurring plastic dish soap bottle while keeping ingredient disclosure direct.",
            maker_story:
              "Produced by a home essentials maker testing practical refill habits for everyday kitchens.",
            how_to_use:
              "Wet brush or sponge, rub on the block, wash dishes, and store dry between uses.",
            shipping_returns:
              "Unopened items may be returned. Used brushes are not returnable for hygiene reasons.",
          },
        },
      ];

  const existingProducts = await productModuleService.listProducts({
    handle: productInputs.map((product) => product.handle),
  });

  if (!existingProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: productInputs,
      },
    });
  } else {
    logger.info("BEEMUN demo products already exist. Skipping product creation.");
  }
  logger.info("Finished seeding BEEMUN product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels = inventoryItems.map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 1000000,
        inventory_item_id: item.id,
      }));
  const existingInventoryLevels = await inventoryModuleService.listInventoryLevels({
    location_id: stockLocation.id,
    inventory_item_id: inventoryItems.map((item) => item.id),
  });
  const existingInventoryItemIds = new Set(
    existingInventoryLevels.map((level: any) => level.inventory_item_id)
  );
  const missingInventoryLevels = inventoryLevels.filter(
    (level) => !existingInventoryItemIds.has(level.inventory_item_id)
  );

  if (missingInventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: missingInventoryLevels,
      },
    });
  } else {
    logger.info("BEEMUN inventory levels already exist. Skipping creation.");
  }

  logger.info("Finished seeding inventory levels data.");
  logger.info(
    "BEEMUN seed complete. Copy the BEEMUN Storefront Publishable Key token into NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY for the storefront."
  );
}
