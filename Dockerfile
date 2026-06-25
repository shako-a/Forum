# syntax=docker/dockerfile:1

# ============================================================================
# GeoGlobally — production image for DigitalOcean App Platform.
# Two stages: a builder that compiles the Next.js app, and a tiny runner that
# serves the standalone output. Prisma 7 uses the `pg` driver adapter, so there
# is NO native query engine to install here.
# ============================================================================

# ---------- 1. Builder ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies first (cached unless deps or the Prisma schema change).
# `npm ci` runs the repo's `postinstall` → `prisma generate`, which needs the
# schema present, so copy it before installing.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# Build the app. No DATABASE_URL is needed: every page is `force-dynamic` and
# nothing touches the database at build time.
COPY . .
RUN npm run build

# ---------- 2. Runner ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0

# Prisma's migration engine (the PRE_DEPLOY `migrate` job runs here) needs
# libssl/openssl present, which the slim image lacks. Install it so migrations
# apply cleanly without the "failed to detect libssl" warning.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Next.js standalone server + its static assets.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma migration tooling, isolated in /migrate so installing it never disturbs
# the standalone runtime's traced node_modules. The PRE_DEPLOY job runs
# `prisma migrate deploy` from here (see .do/app.yaml).
WORKDIR /migrate
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
RUN npm init -y >/dev/null 2>&1 \
 && npm install --omit=dev prisma@7.8.0 dotenv@17.4.2 \
 && chown -R nextjs:nodejs /migrate

WORKDIR /app
USER nextjs
EXPOSE 8080

# Default command = the web server. The migrate job overrides this.
CMD ["node", "server.js"]
