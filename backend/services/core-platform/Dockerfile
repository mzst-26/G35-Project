# Core Platform service — production image
# Build context: backend/

FROM node:20-alpine AS builder
WORKDIR /app

# Workspace manifests first for better layer caching
COPY package.json package-lock.json ./
COPY packages/shared-auth/package.json ./packages/shared-auth/
COPY packages/shared-db/package.json ./packages/shared-db/
COPY packages/shared-errors/package.json ./packages/shared-errors/
COPY packages/shared-observability/package.json ./packages/shared-observability/
COPY packages/shared-permissions/package.json ./packages/shared-permissions/
COPY packages/shared-validation/package.json ./packages/shared-validation/
COPY services/core-platform/package.json ./services/core-platform/
RUN npm ci --workspace=@infra/shared-auth --workspace=@infra/shared-db --workspace=@infra/shared-errors --workspace=@infra/shared-observability --workspace=@infra/shared-permissions --workspace=@infra/shared-validation --workspace=@infra/core-platform-service --include=dev --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/shared-auth/ ./packages/shared-auth/
COPY packages/shared-db/ ./packages/shared-db/
COPY packages/shared-errors/ ./packages/shared-errors/
COPY packages/shared-observability/ ./packages/shared-observability/
COPY packages/shared-permissions/ ./packages/shared-permissions/
COPY packages/shared-validation/ ./packages/shared-validation/
COPY services/core-platform/ ./services/core-platform/

RUN npm run build -w @infra/shared-errors \
  && npm run build -w @infra/shared-permissions \
  && npm run build -w @infra/shared-validation \
  && npm run build -w @infra/shared-db \
  && npm run build -w @infra/shared-observability \
  && npm run build -w @infra/shared-auth \
  && npm run build -w @infra/core-platform-service
RUN npm prune --omit=dev

FROM node:20-alpine AS runtime
ARG GIT_SHA
ENV NODE_ENV=production \
    PORT=3001 \
    GIT_SHA=${GIT_SHA:-unknown}

RUN addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json /app/
COPY --from=builder --chown=node:node /app/node_modules /app/node_modules
COPY --from=builder --chown=node:node /app/packages/shared-auth/package.json /app/packages/shared-auth/
COPY --from=builder --chown=node:node /app/packages/shared-auth/dist /app/packages/shared-auth/dist
COPY --from=builder --chown=node:node /app/packages/shared-db/package.json /app/packages/shared-db/
COPY --from=builder --chown=node:node /app/packages/shared-db/dist /app/packages/shared-db/dist
COPY --from=builder --chown=node:node /app/packages/shared-errors/package.json /app/packages/shared-errors/
COPY --from=builder --chown=node:node /app/packages/shared-errors/dist /app/packages/shared-errors/dist
COPY --from=builder --chown=node:node /app/packages/shared-observability/package.json /app/packages/shared-observability/
COPY --from=builder --chown=node:node /app/packages/shared-observability/dist /app/packages/shared-observability/dist
COPY --from=builder --chown=node:node /app/packages/shared-permissions/package.json /app/packages/shared-permissions/
COPY --from=builder --chown=node:node /app/packages/shared-permissions/dist /app/packages/shared-permissions/dist
COPY --from=builder --chown=node:node /app/packages/shared-validation/package.json /app/packages/shared-validation/
COPY --from=builder --chown=node:node /app/packages/shared-validation/dist /app/packages/shared-validation/dist
COPY --from=builder --chown=node:node /app/services/core-platform/package.json /app/services/core-platform/
COPY --from=builder --chown=node:node /app/services/core-platform/dist /app/services/core-platform/dist
COPY --from=builder --chown=node:node /app/services/core-platform/node_modules /app/services/core-platform/node_modules

USER node
WORKDIR /app/services/core-platform
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health/live', r => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
