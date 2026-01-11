import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  createdAt: integer("created_at").notNull(),
  postWorktreeCommand: text("post_worktree_command"),
  panes: text("panes"),
  editor: text("editor"),
});

export const tickets = sqliteTable("tickets", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  column: text("column").notNull().default("To Do"),
  createdAt: integer("created_at").notNull(),
  projectId: text("project_id"),
  worktreePath: text("worktree_path"),
  lastActivityAt: integer("last_activity_at"),
  isMain: integer("is_main", { mode: "boolean" }),
  setupStatus: text("setup_status").notNull().default("ready"),
  setupError: text("setup_error"),
  setupLogs: text("setup_logs"),
  setupTmuxSession: text("setup_tmux_session"),
  description: text("description"),
  statusOverride: integer("status_override", { mode: "boolean" }),
});
