# SOFIA production image: the self-contained Next.js server, the SQL
# migrations and the bundled migrate / seed scripts. It holds no secret —
# configuration is passed as environment variables at runtime.
#
#   docker build -t sofia .
#   docker run --rm --env-file .env.production sofia node scripts/migrate.cjs
#   docker run -d -p 3000:3000 --env-file .env.production sofia
#
# Run the migration command on every deploy, before starting the new version.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Dependencies, cached as long as the lockfile does not change.
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_OUTPUT=standalone
RUN npm run build && npm run build:scripts

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN groupadd --gid 1001 nodejs \
 && useradd --uid 1001 --gid nodejs --no-create-home --shell /usr/sbin/nologin nextjs

# Application files stay owned by root: the server process cannot modify them.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/dist/scripts ./scripts
# The only writable location: Next.js runtime cache.
RUN mkdir -p .next/cache && chown nextjs:nodejs .next/cache

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.js"]
