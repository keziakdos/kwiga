# syntax=docker/dockerfile:1
# Kwiga — image de production (Next.js standalone)
# Le build se fait HORS du VPS (WSL/CI) pour ne pas saturer ses 1 vCPU / ~120 Mo libres.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build \
 && npm run build:cli

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3020 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/app/data

RUN groupadd -r -g 10001 kwiga \
 && useradd -r -u 10001 -g kwiga -m kwiga \
 && mkdir -p /app/data \
 && chown -R kwiga:kwiga /app

COPY --from=builder --chown=kwiga:kwiga /app/.next/standalone ./
COPY --from=builder --chown=kwiga:kwiga /app/.next/static ./.next/static
COPY --from=builder --chown=kwiga:kwiga /app/public ./public
COPY --from=builder --chown=kwiga:kwiga /app/dist/cli ./dist/cli
COPY --from=builder --chown=kwiga:kwiga /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder --chown=kwiga:kwiga /app/node_modules/@node-rs ./node_modules/@node-rs

USER kwiga
EXPOSE 3020
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||3020) +'/connexion').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
