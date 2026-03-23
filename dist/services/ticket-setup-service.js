"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicketWorktree = createTicketWorktree;
exports.createBranchWorktree = createBranchWorktree;
exports.runTicketSetup = runTicketSetup;
const drizzle_orm_1 = require("drizzle-orm");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const worktree_js_1 = require("../worktree.js");
const SETUP_POLL_INTERVAL = 2000;
const SETUP_MAX_DURATION = 600000;
function createTicketWorktree(projectPath, title, baseBranch) {
    const slug = (0, worktree_js_1.slugify)(title);
    return {
        create: () => (0, worktree_js_1.createWorktree)(projectPath, slug, baseBranch),
    };
}
function createBranchWorktree(projectPath, branchName) {
    return {
        create: () => (0, worktree_js_1.createWorktreeFromBranch)(projectPath, branchName),
    };
}
function monitorSetupSession(ticketId, sessionName) {
    const startTime = Date.now();
    const checkStatus = async () => {
        if (Date.now() - startTime > SETUP_MAX_DURATION) {
            const output = (0, worktree_js_1.captureTmuxOutput)(sessionName);
            await index_js_1.db
                .update(schema_js_1.tickets)
                .set({
                setupStatus: "failed",
                setupError: "Setup timed out after 10 minutes",
                setupLogs: output,
            })
                .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
            return;
        }
        const status = (0, worktree_js_1.getTmuxSessionStatus)(sessionName);
        if (!status.running) {
            const output = (0, worktree_js_1.captureTmuxOutput)(sessionName);
            if (status.exitCode === 0) {
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
                await index_js_1.db
                    .update(schema_js_1.tickets)
                    .set({
                    setupStatus: "failed",
                    setupError: `Command exited with code ${status.exitCode}`,
                    setupLogs: output,
                })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
            }
            return;
        }
        setTimeout(checkStatus, SETUP_POLL_INTERVAL);
    };
    setTimeout(checkStatus, SETUP_POLL_INTERVAL);
}
async function runPostCommandSync(ticketId, worktreePath, command) {
    await index_js_1.db
        .update(schema_js_1.tickets)
        .set({ setupStatus: "running_post_command" })
        .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
    const result = (0, worktree_js_1.runPostWorktreeCommand)(worktreePath, command);
    if (result.error) {
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({
            setupStatus: "failed",
            setupError: result.error,
            setupLogs: result.output,
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        return;
    }
    await index_js_1.db
        .update(schema_js_1.tickets)
        .set({
        setupStatus: "ready",
        setupLogs: result.output,
    })
        .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
}
async function runTicketSetup(ticketId, createWorktreeFn, postWorktreeCommand) {
    try {
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({ setupStatus: "creating_worktree" })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
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
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({ worktreePath: result.worktreePath })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
        if (result.worktreePath && postWorktreeCommand) {
            const sessionName = `${ticketId}-setup`;
            if ((0, worktree_js_1.isTmuxAvailable)()) {
                const spawnResult = (0, worktree_js_1.spawnTmuxCommand)(sessionName, result.worktreePath, postWorktreeCommand);
                if (spawnResult.error) {
                    await runPostCommandSync(ticketId, result.worktreePath, postWorktreeCommand);
                    return;
                }
                await index_js_1.db
                    .update(schema_js_1.tickets)
                    .set({
                    setupStatus: "running_post_command",
                    setupTmuxSession: sessionName,
                })
                    .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
                monitorSetupSession(ticketId, sessionName);
            }
            else {
                await runPostCommandSync(ticketId, result.worktreePath, postWorktreeCommand);
            }
            return;
        }
        await index_js_1.db.update(schema_js_1.tickets).set({ setupStatus: "ready" }).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        await index_js_1.db
            .update(schema_js_1.tickets)
            .set({
            setupStatus: "failed",
            setupError: message,
        })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticketId));
    }
}
//# sourceMappingURL=ticket-setup-service.js.map