"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const drizzle_orm_1 = require("drizzle-orm");
const child_process_1 = require("child_process");
const pty_js_1 = require("./pty.js");
const index_js_1 = require("./db/index.js");
const schema_js_1 = require("./db/schema.js");
const worktree_js_1 = require("./worktree.js");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const port = process.env.PORT || 3325;
app.use(express_1.default.json());
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
app.get("/api/tmux/status", (_req, res) => {
    res.json({ available: pty_js_1.tmuxAvailable });
});
app.get("/api/settings/:key", async (req, res) => {
    const key = req.params.key;
    const result = await index_js_1.db.select().from(schema_js_1.settings).where((0, drizzle_orm_1.eq)(schema_js_1.settings.key, key)).limit(1);
    res.json({ value: result[0]?.value ?? null });
});
app.put("/api/settings/:key", async (req, res) => {
    const key = req.params.key;
    const { value } = req.body;
    await index_js_1.db
        .insert(schema_js_1.settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: schema_js_1.settings.key, set: { value } });
    res.json({ success: true });
});
// Projects API
app.get("/api/projects", async (_req, res) => {
    const result = await index_js_1.db.select().from(schema_js_1.projects);
    // Parse panes JSON for each project
    const projectsWithPanes = result.map((p) => ({
        ...p,
        panes: p.panes ? JSON.parse(p.panes) : [],
    }));
    res.json(projectsWithPanes);
});
app.post("/api/projects", async (req, res) => {
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
app.delete("/api/projects/:id", async (req, res) => {
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
app.patch("/api/projects/:id", async (req, res) => {
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
app.get("/api/projects/:id/commit", async (req, res) => {
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
app.post("/api/projects/:id/pull", async (req, res) => {
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
// Tickets API
app.get("/api/tickets", async (req, res) => {
    const projectId = req.query.projectId;
    if (projectId) {
        const result = await index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.projectId, projectId));
        res.json(result);
    }
    else {
        const result = await index_js_1.db.select().from(schema_js_1.tickets);
        res.json(result);
    }
});
// Async function to run ticket setup (worktree creation + post-command) in background
async function runTicketSetup(ticketId, projectPath, slug, postWorktreeCommand) {
    try {
        // Update status to creating_worktree
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({ setupStatus: "creating_worktree" })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        // Create worktree
        const result = (0, worktree_js_1.createWorktree)(projectPath, slug);
        if (result.error) {
            await index_js_1.db
                .update(schema_js_1.tickets)
                .set({
                setupStatus: "failed",
                setupError: result.error,
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
            return;
        }
        // Update worktreePath
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({ worktreePath: result.worktreePath })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        // Run post-worktree command if configured
        if (result.worktreePath && postWorktreeCommand) {
            await index_js_1.db
                .update(schema_js_1.tickets)
                .set({ setupStatus: "running_post_command" })
                .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
            const cmdResult = (0, worktree_js_1.runPostWorktreeCommand)(result.worktreePath, postWorktreeCommand);
            if (cmdResult.error) {
                await index_js_1.db
                    .update(schema_js_1.tickets)
                    .set({
                    setupStatus: "failed",
                    setupError: cmdResult.error,
                    setupLogs: cmdResult.output,
                })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
                return;
            }
            // Store logs on success
            await index_js_1.db
                .update(schema_js_1.tickets)
                .set({
                setupStatus: "ready",
                setupLogs: cmdResult.output,
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        }
        else {
            // No post-command, mark as ready
            await index_js_1.db.update(schema_js_1.tickets).set({ setupStatus: "ready" }).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({
            setupStatus: "failed",
            setupError: errorMessage,
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
    }
}
// Async function to run ticket setup from an existing branch
async function runBranchTicketSetup(ticketId, projectPath, branchName, postWorktreeCommand) {
    try {
        // Update status to creating_worktree
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({ setupStatus: "creating_worktree" })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        // Create worktree from existing branch
        const result = (0, worktree_js_1.createWorktreeFromBranch)(projectPath, branchName);
        if (result.error) {
            await index_js_1.db
                .update(schema_js_1.tickets)
                .set({
                setupStatus: "failed",
                setupError: result.error,
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
            return;
        }
        // Update worktreePath
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({ worktreePath: result.worktreePath })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        // Run post-worktree command if configured
        if (result.worktreePath && postWorktreeCommand) {
            await index_js_1.db
                .update(schema_js_1.tickets)
                .set({ setupStatus: "running_post_command" })
                .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
            const cmdResult = (0, worktree_js_1.runPostWorktreeCommand)(result.worktreePath, postWorktreeCommand);
            if (cmdResult.error) {
                await index_js_1.db
                    .update(schema_js_1.tickets)
                    .set({
                    setupStatus: "failed",
                    setupError: cmdResult.error,
                    setupLogs: cmdResult.output,
                })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
                return;
            }
            // Store logs on success
            await index_js_1.db
                .update(schema_js_1.tickets)
                .set({
                setupStatus: "ready",
                setupLogs: cmdResult.output,
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        }
        else {
            // No post-command, mark as ready
            await index_js_1.db.update(schema_js_1.tickets).set({ setupStatus: "ready" }).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({
            setupStatus: "failed",
            setupError: errorMessage,
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
    }
}
app.post("/api/tickets", async (req, res) => {
    const { title, projectId, description } = req.body;
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    // Determine if we need async setup
    let needsSetup = false;
    let projectPath = null;
    let postWorktreeCommand = null;
    let slug = null;
    if (projectId) {
        const project = await index_js_1.db.select().from(schema_js_1.projects).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, projectId)).limit(1);
        if (project[0]?.path) {
            needsSetup = true;
            projectPath = project[0].path;
            postWorktreeCommand = project[0].postWorktreeCommand ?? null;
            slug = (0, worktree_js_1.slugify)(title);
        }
    }
    // Insert ticket immediately with pending status if setup needed
    await index_js_1.db.insert(schema_js_1.tickets).values({
        id,
        title,
        column: "To Do",
        createdAt,
        projectId: projectId ?? null,
        worktreePath: null,
        isMain: false,
        setupStatus: needsSetup ? "pending" : "ready",
        setupError: null,
        setupLogs: null,
        description: description ?? null,
    });
    // Return immediately
    res.status(201).json({
        id,
        title,
        column: "To Do",
        createdAt,
        projectId: projectId ?? null,
        worktreePath: null,
        isMain: false,
        setupStatus: needsSetup ? "pending" : "ready",
        description: description ?? null,
    });
    // Run setup in background (fire and forget)
    if (needsSetup && projectPath && slug) {
        runTicketSetup(id, projectPath, slug, postWorktreeCommand).catch((err) => {
            console.error(`Background setup failed for ticket ${id}:`, err);
        });
    }
});
// Create ticket from existing branch
app.post("/api/tickets/from-branch", async (req, res) => {
    const { branchName, projectId, description } = req.body;
    if (!branchName || !projectId) {
        res.status(400).json({ success: false, error: "branchName and projectId are required" });
        return;
    }
    const project = await index_js_1.db.select().from(schema_js_1.projects).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, projectId)).limit(1);
    if (!project[0]?.path) {
        res.status(404).json({ success: false, error: "Project not found" });
        return;
    }
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const projectPath = project[0].path;
    const postWorktreeCommand = project[0].postWorktreeCommand ?? null;
    // Use branch name as title
    const title = branchName;
    // Insert ticket immediately with pending status
    await index_js_1.db.insert(schema_js_1.tickets).values({
        id,
        title,
        column: "To Do",
        createdAt,
        projectId,
        worktreePath: null,
        isMain: false,
        setupStatus: "pending",
        setupError: null,
        setupLogs: null,
        description: description ?? null,
    });
    // Return immediately
    res.status(201).json({
        id,
        title,
        column: "To Do",
        createdAt,
        projectId,
        worktreePath: null,
        isMain: false,
        setupStatus: "pending",
        description: description ?? null,
    });
    // Run setup in background (fire and forget)
    runBranchTicketSetup(id, projectPath, branchName, postWorktreeCommand).catch((err) => {
        console.error(`Background setup failed for ticket ${id}:`, err);
    });
});
app.delete("/api/tickets/:id", async (req, res) => {
    const { id } = req.params;
    // Get ticket to check for worktree and main status
    const ticket = await index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id)).limit(1);
    const ticketData = ticket[0];
    // Reject deletion of main tickets
    if (ticketData?.isMain) {
        res.status(403).json({ success: false, error: "Cannot delete main ticket" });
        return;
    }
    // Remove worktree if it exists
    if (ticketData?.worktreePath && ticketData?.projectId) {
        const project = await index_js_1.db
            .select()
            .from(schema_js_1.projects)
            .where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, ticketData.projectId))
            .limit(1);
        if (project[0]?.path) {
            const result = (0, worktree_js_1.removeWorktree)(project[0].path, ticketData.worktreePath);
            if (result.error) {
                console.warn(`Failed to remove worktree: ${result.error}`);
            }
        }
    }
    await index_js_1.db.delete(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id));
    (0, pty_js_1.killTmuxSession)(id);
    res.json({ success: true });
});
app.patch("/api/tickets/:id", async (req, res) => {
    const { id } = req.params;
    const { column, description } = req.body;
    console.log(`[PATCH /api/tickets/:id] Request to update ticket '${id}'`);
    // Get current ticket state before update
    const existing = await index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id)).limit(1);
    if (!existing[0]) {
        console.log(`[PATCH /api/tickets/:id] Ticket '${id}' not found`);
        res.status(404).json({ success: false, error: "Ticket not found" });
        return;
    }
    console.log(`[PATCH /api/tickets/:id] Current ticket state: { id: '${existing[0].id}', title: '${existing[0].title}', column: '${existing[0].column}' }`);
    const updateData = {};
    if (column !== undefined) {
        updateData.column = column;
        // Set statusOverride when column changes (manual drag)
        updateData.statusOverride = true;
        console.log(`[PATCH /api/tickets/:id] Setting statusOverride=true for manual column change`);
    }
    if (description !== undefined)
        updateData.description = description;
    await index_js_1.db.update(schema_js_1.tickets).set(updateData).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id));
    console.log(`[PATCH /api/tickets/:id] Successfully updated ticket '${id}'`);
    res.json({ success: true });
});
// Clear status override endpoint
app.patch("/api/tickets/:id/clear-override", async (req, res) => {
    const { id } = req.params;
    console.log(`[PATCH /api/tickets/:id/clear-override] Request to clear override for ticket '${id}'`);
    const existing = await index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id)).limit(1);
    if (!existing[0]) {
        console.log(`[PATCH /api/tickets/:id/clear-override] Ticket '${id}' not found`);
        res.status(404).json({ success: false, error: "Ticket not found" });
        return;
    }
    await index_js_1.db.update(schema_js_1.tickets).set({ statusOverride: false }).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id));
    console.log(`[PATCH /api/tickets/:id/clear-override] Cleared override for ticket '${id}'`);
    res.json({ success: true });
});
// Open Editor API
app.post("/api/tickets/:id/open-editor", async (req, res) => {
    const { id } = req.params;
    console.log(`[POST /api/tickets/:id/open-editor] Request to open editor for ticket '${id}'`);
    // Get ticket
    const ticketResult = await index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id)).limit(1);
    const ticket = ticketResult[0];
    if (!ticket) {
        console.log(`[open-editor] Ticket '${id}' not found`);
        res.status(404).json({ success: false, error: "Ticket not found" });
        return;
    }
    // Get associated project
    if (!ticket.projectId) {
        console.log(`[open-editor] Ticket '${id}' has no associated project`);
        res.status(400).json({ success: false, error: "Ticket has no associated project" });
        return;
    }
    const projectResult = await index_js_1.db
        .select()
        .from(schema_js_1.projects)
        .where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, ticket.projectId))
        .limit(1);
    const project = projectResult[0];
    if (!project) {
        console.log(`[open-editor] Project not found for ticket '${id}'`);
        res.status(404).json({ success: false, error: "Project not found" });
        return;
    }
    if (!project.editor) {
        console.log(`[open-editor] No editor configured for project '${project.id}'`);
        res.status(400).json({ success: false, error: "No editor configured for this project" });
        return;
    }
    // Determine the directory to open
    // For main tickets, use project path; for regular tickets, use worktreePath
    const targetPath = ticket.isMain ? project.path : ticket.worktreePath;
    if (!targetPath) {
        console.log(`[open-editor] No path available for ticket '${id}'`);
        res.status(400).json({ success: false, error: "No path available for this ticket" });
        return;
    }
    // Map editor name to command
    const editorCommands = {
        vscode: { command: "code", args: [targetPath] },
        cursor: { command: "cursor", args: [targetPath] },
        intellij: { command: "idea", args: [targetPath] },
        neovim: { command: "open", args: ["-a", "Terminal", targetPath] },
    };
    const editorConfig = editorCommands[project.editor];
    if (!editorConfig) {
        console.log(`[open-editor] Unknown editor '${project.editor}'`);
        res.status(400).json({ success: false, error: `Unknown editor: ${project.editor}` });
        return;
    }
    try {
        console.log(`[open-editor] Spawning editor: ${editorConfig.command} ${editorConfig.args.join(" ")}`);
        // Spawn editor process detached so it runs independently
        const child = (0, child_process_1.spawn)(editorConfig.command, editorConfig.args, {
            detached: true,
            stdio: "ignore",
        });
        child.unref();
        res.json({ success: true });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[open-editor] Failed to launch editor: ${errorMessage}`);
        res.status(500).json({ success: false, error: `Failed to launch editor: ${errorMessage}` });
    }
});
// Ticket Tracking API (for Claude Code hooks)
app.post("/api/tickets/track/start", async (req, res) => {
    const { cwd } = req.body;
    console.log(`[track/start] Received request with cwd: ${cwd}`);
    // Find ticket by worktree path
    const result = await index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.worktreePath, cwd)).limit(1);
    const ticket = result[0];
    if (!ticket) {
        console.log(`[track/start] No ticket found for cwd: ${cwd}`);
        res.status(404).json({ success: false, error: "No ticket found for this directory" });
        return;
    }
    console.log(`[track/start] Found ticket: { id: '${ticket.id}', title: '${ticket.title}', worktreePath: '${ticket.worktreePath}', statusOverride: ${ticket.statusOverride} }`);
    // Check if ticket has manual status override
    if (ticket.statusOverride) {
        console.log(`[track/start] Ticket '${ticket.id}' has manual status override, skipping update`);
        res.status(409).json({
            success: false,
            error: "Ticket has manual status override",
            ticketId: ticket.id,
        });
        return;
    }
    // Update ticket to In Progress and set lastActivityAt
    await index_js_1.db
        .update(schema_js_1.tickets)
        .set({ column: "In Progress", lastActivityAt: Date.now() })
        .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticket.id));
    console.log(`[track/start] Updated ticket '${ticket.id}' to "In Progress"`);
    res.json({ success: true, ticketId: ticket.id, title: ticket.title });
});
app.post("/api/tickets/track/stop", async (req, res) => {
    const { cwd } = req.body;
    console.log(`[track/stop] Received request with cwd: ${cwd}`);
    // Find ticket by worktree path
    const result = await index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.worktreePath, cwd)).limit(1);
    const ticket = result[0];
    if (!ticket) {
        console.log(`[track/stop] No ticket found for cwd: ${cwd}`);
        res.status(404).json({ success: false, error: "No ticket found for this directory" });
        return;
    }
    console.log(`[track/stop] Found ticket: { id: '${ticket.id}', title: '${ticket.title}', worktreePath: '${ticket.worktreePath}', statusOverride: ${ticket.statusOverride} }`);
    // Check if ticket has manual status override
    if (ticket.statusOverride) {
        console.log(`[track/stop] Ticket '${ticket.id}' has manual status override, skipping update`);
        res.status(409).json({
            success: false,
            error: "Ticket has manual status override",
            ticketId: ticket.id,
        });
        return;
    }
    // Update ticket to To Do and set lastActivityAt
    await index_js_1.db
        .update(schema_js_1.tickets)
        .set({ column: "To Do", lastActivityAt: Date.now() })
        .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticket.id));
    console.log(`[track/stop] Updated ticket '${ticket.id}' to "To Do"`);
    res.json({ success: true, ticketId: ticket.id, title: ticket.title });
});
// Serve static files from web/dist (frontend build)
app.use(express_1.default.static(path_1.default.join(__dirname, "../web/dist")));
// SPA fallback - serve index.html for all non-API routes
app.get("/{*splat}", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../web/dist/index.html"));
});
const server = (0, http_1.createServer)(app);
(0, pty_js_1.setupPtyWebSocket)(server);
server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map