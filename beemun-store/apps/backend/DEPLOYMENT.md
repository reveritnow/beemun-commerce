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

After these are set, redeploy Vercel. Homepage products, store listing, product page, cart, checkout, and region lookup will use the live backend.
