# syntax=docker/dockerfile:1

############################  зависимости  ############################
FROM oven/bun:1.3.14-slim AS deps
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY apps/api/package.json           apps/api/
COPY apps/web/package.json           apps/web/
COPY packages/shared/package.json    packages/shared/

RUN bun install --frozen-lockfile

##############################  сборка  ###############################
FROM deps AS build
WORKDIR /app
COPY . .
RUN bun run build

##############################  рантайм  ##############################
FROM oven/bun:1.3.14-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/qrush.sqlite \
    WEB_DIST=/app/apps/web/dist

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /data && chown -R bun:bun /data

COPY --from=build /app/node_modules      ./node_modules
COPY --from=build /app/package.json      ./package.json
COPY --from=build /app/packages          ./packages
COPY --from=build /app/apps/api          ./apps/api
COPY --from=build /app/apps/web/dist     ./apps/web/dist

USER bun
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/healthz || exit 1

CMD ["bun", "apps/api/src/index.ts"]
