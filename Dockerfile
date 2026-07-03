FROM node:22-bookworm-slim AS builder

WORKDIR /app/apps/backend
ENV CI=true

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY beemun-store/apps/backend/package.json ./package.json
RUN npm install --include=dev --no-audit --no-fund

COPY beemun-store/apps/backend ./
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app/apps/backend/.medusa/server
ENV NODE_ENV=production
ENV PORT=9000

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/apps/backend/.medusa/server ./
RUN npm install --omit=dev --no-audit --no-fund

EXPOSE 9000
CMD ["npm", "run", "start"]
