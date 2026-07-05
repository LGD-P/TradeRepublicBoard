# syntax=docker/dockerfile:1
#
# Build the static web app and serve it with a small, non-root nginx.
# Runs entirely offline; the financial CSV is processed in the browser.

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first (better layer caching). The core package is a
# source dependency of the web app, so it needs its own node_modules too.
COPY packages/core/package.json packages/core/package-lock.json ./packages/core/
RUN cd packages/core && npm ci --no-audit --no-fund
COPY packages/web/package.json packages/web/package-lock.json ./packages/web/
RUN cd packages/web && npm ci --no-audit --no-fund

# Copy sources and build the static site.
COPY packages/core ./packages/core
COPY packages/web ./packages/web
RUN cd packages/web && npm run build

# ---- serve stage (non-root, SPA fallback) ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS serve
COPY packages/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/web/build /usr/share/nginx/html
EXPOSE 8080
# The base image already runs as the non-root `nginx` user.
