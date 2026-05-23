# ─────────────────────────────────────────────────────────────
# THEORY API — production container.
# Build context MUST be the repo root (pulse/) so we can include
# the shared Prisma schema at ../database/. From the repo root:
#   docker build -f backend/Dockerfile -t theory-api .
# Railway: set the root directory to / and dockerfilePath to backend/Dockerfile.
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# 1 · Install deps (cached layer)
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci

# 2 · Copy source + shared schema
COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY database ./database

# 3 · Generate Prisma client + compile TS
RUN npx prisma generate --schema ./database/schema.prisma
RUN npm run build

# ─── Runtime image ───────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache wget && \
    addgroup -S theory && adduser -S theory -G theory

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/database ./database
COPY backend/package.json ./

USER theory
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/health || exit 1

CMD ["node", "dist/server.js"]
