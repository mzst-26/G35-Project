# Multi-stage build for the identity microservice.
# Build context must be the backend/ directory so tsconfig.base.json is included.
#
# Usage (from backend/):
#   docker build -f services/identity/Dockerfile -t identity-service .

# Base image pinned to Node 20 LTS slim to keep the layer small.
FROM node:20-slim AS base
WORKDIR /app

# ---- deps stage: install all dependencies --------------------------------
FROM base AS deps
# Copy only manifests first so this layer is cache-friendly.
COPY package.json ./
COPY services/identity/package.json ./services/identity/package.json

# Install prod + dev deps (needed for build tooling).
RUN npm install --workspace=services/identity --include=dev 2>/dev/null || \
    (cd services/identity && npm install)

# ---- build stage: compile TypeScript ------------------------------------
FROM deps AS builder
# GIT_SHA is injected at CI build time for Sentry release tracking.
ARG GIT_SHA=unknown
# Pull in the full workspace source.
COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY services/identity/ ./services/identity/

WORKDIR /app/services/identity
RUN npm run build

# ---- runtime stage: lean production image --------------------------------
FROM node:20-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4001
ENV HEALTHCHECK_PATH=/health
# GIT_SHA is passed through from the builder for Sentry release identification.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

# Only copy what the compiled service needs at runtime.
COPY --from=builder /app/services/identity/dist ./dist
COPY --from=builder /app/services/identity/package.json ./package.json

# Install production dependencies only in the runtime layer.
RUN npm install --omit=dev

# Non-root user: reduces attack surface if the container is compromised.
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 identity && \
    chown -R identity:nodejs /app
USER identity

EXPOSE 4001

# Healthcheck runs inside the container namespace, so localhost is correct.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const p=process.env.PORT||4001; const path=process.env.HEALTHCHECK_PATH||'/health'; fetch('http://localhost:'+p+path).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
