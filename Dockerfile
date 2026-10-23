# syntax=docker/dockerfile:1

# ---------- Build stage ----------
# Astro 7 requires Node >= 22.23.4
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies first so this layer caches when only source changes
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build the static site into /app/dist
COPY astro.config.mjs ./
COPY src ./src
COPY public ./public
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:stable-alpine AS runtime

# Routing, caching and compression rules
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Only the built output ships in the final image
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
