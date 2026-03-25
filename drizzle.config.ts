import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const databasePath = "data/sqlite.db";

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databasePath,
  },
});
