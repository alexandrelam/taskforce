FROM node:24-bookworm AS build

WORKDIR /app

ENV HUSKY=0

COPY package.json package-lock.json ./
COPY web/package.json web/package-lock.json ./web/

RUN npm ci
RUN npm --prefix web ci

COPY . .

RUN npm run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends git gh \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3325
ENV DATABASE_PATH=/app/data/sqlite.db
ENV HUSKY=0
ENV SHELL=/bin/sh

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
RUN npm prune --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p /app/data
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3325

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
