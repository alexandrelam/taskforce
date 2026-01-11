"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_orm_1 = require("drizzle-orm");
const child_process_1 = require("child_process");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const pty_js_1 = require("../pty.js");
const worktree_js_1 = require("../worktree.js");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    const result = await index_js_1.db.select().from(schema_js_1.projects);
    // Parse panes JSON for each project
    const projectsWithPanes = result.map((p) => ({
        ...p,
        panes: p.panes ? JSON.parse(p.panes) : [],
    }));
    res.json(projectsWithPanes);
});
router.post("/", async (req, res) => {
    const { name, path, postWorktreeCommand, panes, editor } = req.body;
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const panesJson = panes ? JSON.stringify(panes) : null;
    await index_js_1.db.insert(schema_js_1.projects).values({
        id,
        name,
        path,
        createdAt,
        postWorktreeCommand: postWorktreeCommand ?? null,
        panes: panesJson,
        editor: editor ?? null,
    });
    // Auto-create main ticket for the project
    const mainTicketId = crypto.randomUUID();
    await index_js_1.db.insert(schema_js_1.tickets).values({
        id: mainTicketId,
        title: "main",
        column: "To Do",
        createdAt,
        projectId: id,
        worktreePath: null,
        isMain: true,
    });
    res.json({
        id,
        name,
        path,
        createdAt,
        postWorktreeCommand: postWorktreeCommand ?? null,
        panes: panes ?? [],
        editor: editor ?? null,
    });
});
router.delete("/:id", async (req, res) => {
    const { id } = req.params;
    // Get project path for worktree removal
    const project = await index_js_1.db.select().from(schema_js_1.projects).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, id)).limit(1);
    const projectPath = project[0]?.path;
    // Get all tickets for this project to clean up their tmux sessions and worktrees
    const projectTickets = await index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.projectId, id));
    for (const ticket of projectTickets) {
        (0, pty_js_1.killTmuxSession)(ticket.id);
        // Remove worktree if it exists
        if (ticket.worktreePath && projectPath) {
            const result = (0, worktree_js_1.removeWorktree)(projectPath, ticket.worktreePath);
            if (result.error) {
                console.warn(`Failed to remove worktree for ticket ${ticket.id}: ${result.error}`);
            }
        }
    }
    // Cascade delete tickets
    await index_js_1.db.delete(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.projectId, id));
    // Delete the project
    await index_js_1.db.delete(schema_js_1.projects).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, id));
    res.json({ success: true });
});
router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { postWorktreeCommand, panes, editor } = req.body;
    const updateData = {};
    if (postWorktreeCommand !== undefined) {
        updateData.postWorktreeCommand = postWorktreeCommand || null;
    }
    if (panes !== undefined) {
        updateData.panes = JSON.stringify(panes);
    }
    if (editor !== undefined) {
        updateData.editor = editor || null;
    }
    await index_js_1.db.update(schema_js_1.projects).set(updateData).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, id));
    res.json({ success: true });
});
// Git Commit Info API
router.get("/:id/commit", async (req, res) => {
    const { id } = req.params;
    const project = await index_js_1.db.select().from(schema_js_1.projects).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, id)).limit(1);
    if (!project[0]) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    try {
        const output = (0, child_process_1.execSync)('git log -1 --format="%h %s"', {
            cwd: project[0].path,
            encoding: "utf-8",
        }).trim();
        const [hash, ...messageParts] = output.split(" ");
        const message = messageParts.join(" ");
        res.json({ hash, message });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: errorMessage });
    }
});
// Git Pull API
router.post("/:id/pull", async (req, res) => {
    const { id } = req.params;
    const project = await index_js_1.db.select().from(schema_js_1.projects).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, id)).limit(1);
    if (!project[0]) {
        res.status(404).json({ success: false, error: "Project not found" });
        return;
    }
    try {
        const output = (0, child_process_1.execSync)("git pull", {
            cwd: project[0].path,
            encoding: "utf-8",
        });
        res.json({ success: true, output });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ success: false, error: errorMessage });
    }
});
exports.default = router;
//# sourceMappingURL=projects.js.map