import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";
import * as schema from "./schema.js";

const databasePath = process.env.DATABASE_PATH || "data/sqlite.db";

mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
export const db = drizzle(sqlite, { schema });
