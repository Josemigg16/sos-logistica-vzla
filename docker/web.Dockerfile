# --- build: compile the SPA with Vite ---
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile
COPY packages ./packages
COPY apps/web ./apps/web
# Vite inlines env at build time. Same-origin: /api lo reenvía el nginx del host.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN bun --filter @sos/web build

# --- runtime: nginx serving static files ---
FROM nginx:alpine AS runtime
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
