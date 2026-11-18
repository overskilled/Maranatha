# syntax=docker/dockerfile:1

# ============================================================
# Maranatha Le Juste Prix
# Le site, la boutique et le back-office dans une seule image.
#
# Debian plutôt qu'Alpine : better-sqlite3 et sharp disposent de
# binaires précompilés pour la glibc, ce qui évite de recompiler
# à chaque construction.
# ============================================================

# ---------- Construction ----------
FROM node:24-bookworm-slim AS build

WORKDIR /app

# De quoi compiler les modules natifs si aucun binaire ne convient.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Les dépendances d'abord : cette couche est réutilisée tant que
# package-lock.json ne change pas.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY astro.config.mjs drizzle.config.ts ./
COPY src ./src
COPY public ./public
COPY drizzle ./drizzle

RUN npm run build

# Les outils de développement ne partent pas en production.
RUN npm prune --omit=dev

# ---------- Exécution ----------
FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    DATA_DIR=/data

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Les migrations sont lues au démarrage, depuis ./drizzle.
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./package.json
COPY scripts ./scripts

# La base et les photos vivent ici, hors de l'image.
RUN mkdir -p /data/uploads /data/imports && chown -R node:node /data /app

USER node
VOLUME ["/data"]
EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:4321/ || exit 1

CMD ["node", "./dist/server/entry.mjs"]
