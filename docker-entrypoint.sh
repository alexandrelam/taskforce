#!/bin/sh

set -eu

DATABASE_PATH="${DATABASE_PATH:-data/sqlite.db}"

mkdir -p "$(dirname "$DATABASE_PATH")"

./node_modules/.bin/drizzle-kit push \
  --dialect=sqlite \
  --schema=dist/db/schema.js \
  --url="$DATABASE_PATH"

exec "$@"
