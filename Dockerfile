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

ENV NODE_ENV=production
ENV PORT=3325
ENV DATABASE_PATH=/app/data/sqlite.db
ENV HUSKY=0

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
RUN npm prune --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/web/dist ./web/dist

RUN mkdir -p /app/data

EXPOSE 3325

CMD ["node", "dist/index.js"]
