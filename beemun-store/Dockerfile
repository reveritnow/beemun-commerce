FROM node:22-bookworm-slim AS builder

WORKDIR /app
ENV CI=true

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/storefront/package.json ./apps/storefront/package.json

RUN npm ci --include=dev --workspace=@dtc/backend --include-workspace-root

COPY apps/backend ./apps/backend

RUN npm run build --workspace=@dtc/backend

FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=9000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend ./apps/backend

EXPOSE 9000

CMD ["npm", "run", "start", "--workspace=@dtc/backend"]
