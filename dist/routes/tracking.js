"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_orm_1 = require("drizzle-orm");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const router = (0, express_1.Router)();
// Ticket Tracking API (for Claude Code hooks)
router.post("/start", async (req, res) => {
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
router.post("/stop", async (req, res) => {
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
exports.default = router;
//# sourceMappingURL=tracking.js.map