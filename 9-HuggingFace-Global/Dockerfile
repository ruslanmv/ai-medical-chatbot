# ============================================================
# MedOS HuggingFace Space — Production Dockerfile
#
# Enterprise architecture:
#   web/                    = frontend source of truth
#   9-HuggingFace-Global/   = backend + synced frontend
#
# Before deploying, run: bash scripts/sync-frontend.sh
# This copies web/ frontend, rewrites API paths, then you push.
# ============================================================

# Stage 1: Install dependencies
FROM node:18-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json ./
RUN npm install --legacy-peer-deps && npm cache clean --force

# Stage 2: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Stage 3: Production runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

RUN mkdir -p /data && chown nextjs:nodejs /data
ENV DB_PATH=/data/medos.db

USER nextjs
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7860/api/health || exit 1

CMD ["node", "server.js"]
