"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTrackingState = applyTrackingState;
const drizzle_orm_1 = require("drizzle-orm");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
async function applyTrackingState(cwd, column) {
    const result = await index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.worktreePath, cwd)).limit(1);
    const ticket = result[0];
    if (!ticket) {
        return { success: false, error: "No ticket found for this directory", status: 404 };
    }
    if (ticket.statusOverride) {
        return {
            success: false,
            error: "Ticket has manual status override",
            ticketId: ticket.id,
            status: 409,
        };
    }
    await index_js_1.db
        .update(schema_js_1.tickets)
        .set({ column, lastActivityAt: Date.now() })
        .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, ticket.id));
    return { success: true, ticketId: ticket.id, title: ticket.title };
}
//# sourceMappingURL=tracking-service.js.map