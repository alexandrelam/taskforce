"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tickets = exports.projects = exports.settings = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
exports.settings = (0, sqlite_core_1.sqliteTable)("settings", {
    key: (0, sqlite_core_1.text)("key").primaryKey(),
    value: (0, sqlite_core_1.text)("value").notNull(),
});
exports.projects = (0, sqlite_core_1.sqliteTable)("projects", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    name: (0, sqlite_core_1.text)("name").notNull(),
    path: (0, sqlite_core_1.text)("path").notNull(),
    createdAt: (0, sqlite_core_1.integer)("created_at").notNull(),
    postWorktreeCommand: (0, sqlite_core_1.text)("post_worktree_command"),
    panes: (0, sqlite_core_1.text)("panes"),
    editor: (0, sqlite_core_1.text)("editor"),
});
exports.tickets = (0, sqlite_core_1.sqliteTable)("tickets", {
    id: (0, sqlite_core_1.text)("id").primaryKey(),
    title: (0, sqlite_core_1.text)("title").notNull(),
    column: (0, sqlite_core_1.text)("column").notNull().default("To Do"),
    createdAt: (0, sqlite_core_1.integer)("created_at").notNull(),
    projectId: (0, sqlite_core_1.text)("project_id"),
    worktreePath: (0, sqlite_core_1.text)("worktree_path"),
    lastActivityAt: (0, sqlite_core_1.integer)("last_activity_at"),
    isMain: (0, sqlite_core_1.integer)("is_main", { mode: "boolean" }),
    setupStatus: (0, sqlite_core_1.text)("setup_status").notNull().default("ready"),
    setupError: (0, sqlite_core_1.text)("setup_error"),
    setupLogs: (0, sqlite_core_1.text)("setup_logs"),
    description: (0, sqlite_core_1.text)("description"),
    statusOverride: (0, sqlite_core_1.integer)("status_override", { mode: "boolean" }),
});
//# sourceMappingURL=schema.js.map