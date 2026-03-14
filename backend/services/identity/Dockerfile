# Identity service — production image
# Build context: backend/ (from repo root: docker build -f backend/services/identity/Dockerfile -t identity-service backend/)

# -----------------------------------------------------------------------------
# Builder: install, build, prune (reproducible via package-lock)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Workspace manifests only first (better layer cache)
COPY package.json package-lock.json ./
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY services/identity/package.json ./services/identity/
RUN npm ci --workspace=@infra/shared-utils --workspace=@infra/identity-service --include=dev --ignore-scripts

# Source and config
COPY tsconfig.base.json ./
COPY packages/shared-utils/ ./packages/shared-utils/
COPY services/identity/ ./services/identity/

# Build order: shared-utils then identity (depends on it)
RUN npm run build -w @infra/shared-utils && npm run build -w @infra/identity-service
RUN npm prune --omit=dev

# -----------------------------------------------------------------------------
# Runtime: minimal copy, non-root, healthcheck
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime
ARG GIT_SHA
ENV NODE_ENV=production \
    PORT=4001 \
    GIT_SHA=${GIT_SHA:-unknown}

RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 -S app && adduser -u 1001 -S app -G app

# Preserve workspace layout so node_modules symlinks resolve
COPY --from=builder --chown=app:app /app/package.json /app/package-lock.json /app/
COPY --from=builder --chown=app:app /app/node_modules /app/node_modules
COPY --from=builder --chown=app:app /app/packages/shared-utils/package.json /app/packages/shared-utils/
COPY --from=builder --chown=app:app /app/packages/shared-utils/dist /app/packages/shared-utils/dist
COPY --from=builder --chown=app:app /app/services/identity/package.json /app/services/identity/
COPY --from=builder --chown=app:app /app/services/identity/dist /app/services/identity/dist

USER app
WORKDIR /app/services/identity
EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
