# Multi-stage production Dockerfile for MedOS Global on HF Spaces
# Optimized for Next.js 14 standalone output

# Stage 1: Install ALL dependencies (including devDeps for build)
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps && npm cache clean --force

# Stage 2: Build the application
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Stage 3: Production runner (lean image)
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# HF Spaces REQUIRES port 7860
ENV PORT=7860
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build (includes server + minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy data files (health topics, medical KB)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:7860/api/health || exit 1

CMD ["node", "server.js"]
