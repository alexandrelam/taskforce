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
// Constants for setup monitoring
const SETUP_POLL_INTERVAL = 2000; // 2 seconds
const SETUP_MAX_DURATION = 600000; // 10 minutes
/**
 * Monitor a setup tmux session and update ticket status on completion
 */
function monitorSetupSession(ticketId, sessionName) {
    const startTime = Date.now();
    const checkStatus = async () => {
        // Check for timeout
        if (Date.now() - startTime > SETUP_MAX_DURATION) {
            const output = (0, worktree_js_1.captureTmuxOutput)(sessionName);
            await index_js_1.db
                .update(schema_js_1.tickets)
                .set({
                setupStatus: "failed",
                setupError: "Setup timed out after 10 minutes",
                setupLogs: output,
                setupTmuxSession: null,
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
            (0, worktree_js_1.killSetupTmuxSession)(sessionName);
            return;
        }
        const status = (0, worktree_js_1.getTmuxSessionStatus)(sessionName);
        if (!status.running) {
            // Session completed
            const output = (0, worktree_js_1.captureTmuxOutput)(sessionName);
            if (status.exitCode === 0) {
                // Success - mark ready and clean up
                await index_js_1.db
                    .update(schema_js_1.tickets)
                    .set({
                    setupStatus: "ready",
                    setupLogs: output,
                    setupTmuxSession: null,
                })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
                (0, worktree_js_1.killSetupTmuxSession)(sessionName);
            }
            else {
                // Failure - keep session for viewing, store output
                await index_js_1.db
                    .update(schema_js_1.tickets)
                    .set({
                    setupStatus: "failed",
                    setupError: `Command exited with code ${status.exitCode}`,
                    setupLogs: output,
                    // Keep setupTmuxSession so user can view it
                })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
            }
        }
        else {
            // Still running - poll again
            setTimeout(checkStatus, SETUP_POLL_INTERVAL);
        }
    };
    // Start polling
    setTimeout(checkStatus, SETUP_POLL_INTERVAL);
}
// Async function to run ticket setup (worktree creation + post-command) in background
async function runTicketSetup(ticketId, createWorktreeFn, postWorktreeCommand) {
    try {
        // Update status to creating_worktree
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({ setupStatus: "creating_worktree" })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        // Create worktree using provided function
        const result = createWorktreeFn();
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
            const setupSessionName = `${ticketId}-setup`;
            // Try to use tmux for deferred execution
            if ((0, worktree_js_1.isTmuxAvailable)()) {
                const spawnResult = (0, worktree_js_1.spawnTmuxCommand)(setupSessionName, result.worktreePath, postWorktreeCommand);
                if (spawnResult.error) {
                    // Tmux spawn failed, fall back to sync execution
                    console.warn(`Tmux spawn failed, falling back to sync: ${spawnResult.error}`);
                    await runPostCommandSync(ticketId, result.worktreePath, postWorktreeCommand);
                    return;
                }
                // Update status and store session name
                await index_js_1.db
                    .update(schema_js_1.tickets)
                    .set({
                    setupStatus: "running_post_command",
                    setupTmuxSession: setupSessionName,
                })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
                // Start background monitoring
                monitorSetupSession(ticketId, setupSessionName);
            }
            else {
                // Tmux not available, use synchronous execution
                await runPostCommandSync(ticketId, result.worktreePath, postWorktreeCommand);
            }
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
/**
 * Run post-worktree command synchronously (fallback when tmux unavailable)
 */
async function runPostCommandSync(ticketId, worktreePath, command) {
    await index_js_1.db
        .update(schema_js_1.tickets)
        .set({ setupStatus: "running_post_command" })
        .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
    const cmdResult = (0, worktree_js_1.runPostWorktreeCommand)(worktreePath, command);
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
router.get("/", async (req, res) => {
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
router.post("/", async (req, res) => {
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
        runTicketSetup(id, () => (0, worktree_js_1.createWorktree)(projectPath, slug), postWorktreeCommand).catch((err) => {
            console.error(`Background setup failed for ticket ${id}:`, err);
        });
    }
});
// Create ticket from existing branch
router.post("/from-branch", async (req, res) => {
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
    runTicketSetup(id, () => (0, worktree_js_1.createWorktreeFromBranch)(projectPath, branchName), postWorktreeCommand).catch((err) => {
        console.error(`Background setup failed for ticket ${id}:`, err);
    });
});
router.delete("/:id", async (req, res) => {
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
    // Kill setup session if it exists
    if (ticketData?.setupTmuxSession) {
        (0, worktree_js_1.killSetupTmuxSession)(ticketData.setupTmuxSession);
    }
    await index_js_1.db.delete(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id));
    (0, pty_js_1.killTmuxSession)(id);
    res.json({ success: true });
});
router.patch("/:id", async (req, res) => {
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
router.patch("/:id/clear-override", async (req, res) => {
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
router.post("/:id/open-editor", async (req, res) => {
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
exports.default = router;
//# sourceMappingURL=tickets.js.map