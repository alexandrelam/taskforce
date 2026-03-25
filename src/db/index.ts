import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema.js";

const databasePath = process.env.DATABASE_PATH || "data/sqlite.db";

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    post_worktree_command TEXT,
    panes TEXT,
    editor TEXT,
    use_worktrees INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    column TEXT NOT NULL DEFAULT 'To Do',
    created_at INTEGER NOT NULL,
    project_id TEXT,
    worktree_path TEXT,
    last_activity_at INTEGER,
    is_main INTEGER,
    setup_status TEXT NOT NULL DEFAULT 'ready',
    setup_error TEXT,
    setup_logs TEXT,
    setup_tmux_session TEXT,
    description TEXT,
    status_override INTEGER,
    pr_link TEXT,
    pr_state TEXT
  );
`);

export const db = drizzle(sqlite, { schema });
