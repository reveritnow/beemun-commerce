# BEEMUN Medusa Backend Deployment

This backend is ready for Render, Railway, Koyeb, or any Node host with Postgres. The storefront keeps its fallback behavior, but real catalog, cart, checkout, pricing, regions, and product pages need a live Medusa URL plus publishable key.

## Required backend environment variables

- `DATABASE_URL`: managed Postgres connection string. Use your Neon connection string here.
- `STORE_CORS`: comma-separated storefront origins, including the Vercel production domain.
- `ADMIN_CORS`: comma-separated admin/backend origins.
- `AUTH_CORS`: comma-separated auth/backend origins.
- `JWT_SECRET`: long random production secret.
- `COOKIE_SECRET`: long random production secret.
- `BEEMUN_PORTAL_API_SECRET`: long random shared secret used by the Vercel storefront to request private maker document files from Railway. Set the exact same value in Vercel.
- `BEEMUN_APPROVAL_SUPER_ADMIN_EMAILS`: comma-separated Medusa Admin emails that can manage BEEMUN maker approvals.
- `BEEMUN_APPROVAL_MAKER_REVIEWER_EMAILS`: comma-separated Medusa Admin emails that can review makers, view documents, approve, reject, request replacement, create tasks, and message applicants.
- `BEEMUN_APPROVAL_SUPPORT_EMAILS`: optional comma-separated Medusa Admin emails reserved for future read/support access. Support users are not allowed to access approval actions unless also listed as Super Admin or Maker Reviewer.
- `NODE_ENV`: `production`.
- `REDIS_URL`: optional if the provider includes Redis.

Use `.env.template` as the source of truth.

## Render

The repository includes a root `render.yaml` blueprint. Create the blueprint, set `STORE_CORS`, `ADMIN_CORS`, and `AUTH_CORS`, then deploy. Render provisions Postgres and injects `DATABASE_URL`.

## Railway

Railway deployment is Dockerfile-based and does not rely on Nixpacks or Node auto-detection.

The repository includes:

- `/railway.json` for Railway services rooted at the repository root.
- `/Dockerfile` for repository-root Docker builds.
- `/beemun-store/railway.json` for Railway services rooted at `beemun-store`.
- `/beemun-store/Dockerfile` for `beemun-store` Docker builds.

Both Dockerfiles use Node 22, install the monorepo workspace dependencies, build only the backend workspace, and start only the Medusa backend:

```bash
npm run build --workspace=@dtc/backend
npm run start --workspace=@dtc/backend
```

Keep Neon connected by setting `DATABASE_URL` in Railway Variables. Do not set custom Nixpacks build/start commands; Railway should use the Dockerfile builder from `railway.json`.

## One-time database setup

After the backend is deployed and connected to Postgres, run:

```bash
npm run db:migrate --workspace=@dtc/backend
npm run seed --workspace=@dtc/backend
```

The seed creates:

- BEEMUN UK Launch region for `/gb`.
- BEEMUN marketplace sales channel.
- Publishable storefront API key.
- Skin & Body, Hair Care, Oils & Butters, and Home Essentials categories.
- Founder Favorites, Daily Rituals, Maker Led, and Refill Ready collections.
- Six BEEMUN demo products with variants, prices, inventory, disclosure metadata, and ZPS trust copy.

Copy the seeded publishable API key token into the storefront `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

## Required storefront environment variables

Set these on Vercel:

- `NEXT_PUBLIC_MEDUSA_BACKEND_URL`: deployed Medusa backend URL.
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`: publishable key from the seeded backend.
- `NEXT_PUBLIC_DEFAULT_REGION`: `gb`.
- `NEXT_PUBLIC_BASE_URL`: deployed Vercel storefront URL.
- `BEEMUN_PORTAL_API_SECRET`: same long random value configured on Railway. If missing, the storefront still builds and runs, but maker document viewing returns a controlled "document access is not configured" error.

## BEEMUN maker approval access

For production, at least one admin email must be present in `BEEMUN_APPROVAL_SUPER_ADMIN_EMAILS` or `BEEMUN_APPROVAL_MAKER_REVIEWER_EMAILS`. If these variables are empty in production, Medusa Admin users will receive `403` responses from the BEEMUN maker approval APIs.

The Stage 2 maker approval endpoints include in-memory rate limits for sign-in, application submission, portal actions, document upload/viewing, messages, and tasks. For higher traffic or multi-instance deployments, move the same keys to Redis without changing endpoint behavior.

After these are set, redeploy Vercel. Homepage products, store listing, product page, cart, checkout, and region lookup will use the live backend.

## BEEMUN Product Media Storage

Stage 3 maker product media uses Medusa's file module with the `@medusajs/file-s3` provider. BEEMUN should configure this provider against Cloudflare R2 because R2 is S3-compatible and cost-effective for product image storage.

Required Railway backend env vars:

- `BEEMUN_FILE_BUCKET`: R2 bucket name for product media.
- `BEEMUN_FILE_ENDPOINT`: R2 S3 API endpoint, for example `https://<account-id>.r2.cloudflarestorage.com`.
- `BEEMUN_FILE_ACCESS_KEY_ID`: R2 access key ID.
- `BEEMUN_FILE_SECRET_ACCESS_KEY`: R2 secret access key.
- `BEEMUN_FILE_PUBLIC_URL`: Public/custom-domain URL used by Medusa file records, for example `https://media.beemun.com`.
- `BEEMUN_FILE_REGION`: Use `auto` for Cloudflare R2 unless a different S3 provider requires a region.
- `BEEMUN_FILE_PREFIX`: Optional. Defaults to `product-media`.
- `BEEMUN_FILE_FORCE_PATH_STYLE`: Optional. Defaults to `true`, which is appropriate for R2.

Compatibility fallback names are also supported: `S3_BUCKET`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FILE_URL`, and `S3_REGION`.

Do not set these values in Vercel. Storefront product media uploads go through the same-origin Next.js route, which forwards to the protected backend route with `BEEMUN_PORTAL_API_SECRET`.

Security notes:

- Only approved maker members can upload product media.
- The backend verifies the product belongs to the signed-in maker before uploading.
- Product media edits are allowed only for `draft` and `needs_changes` product reviews.
- Product images are stored as private Medusa/R2 file objects during draft and review. Maker/admin previews are served through protected BEEMUN routes. Published products use stable public BEEMUN media routes gated by published ProductReview state.

