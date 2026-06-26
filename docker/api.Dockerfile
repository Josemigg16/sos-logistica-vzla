# Official Bun base image — https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /app

# In a Bun WORKSPACE, install must run at the root: Bun creates per-package
# node_modules symlinks (apps/api/node_modules/hono -> root .bun store). A
# multi-stage copy of only the root node_modules drops those symlinks and
# breaks module resolution, so we install in place.
FROM base AS release
ENV NODE_ENV=production

# Manifests + lockfile first for layer caching.
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile

# Source last. node_modules is .dockerignored, so this COPY does not clobber
# the symlink trees that bun install just created.
COPY packages ./packages
COPY apps/api ./apps/api

USER bun
EXPOSE 3000/tcp
ENTRYPOINT ["bun", "run", "apps/api/index.ts"]
