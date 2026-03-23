"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTickets = listTickets;
exports.getTicketById = getTicketById;
exports.getProjectById = getProjectById;
exports.createTicketRecord = createTicketRecord;
exports.updateTicket = updateTicket;
exports.clearTicketOverride = clearTicketOverride;
exports.toTicketResponse = toTicketResponse;
exports.deleteTicketAndCleanup = deleteTicketAndCleanup;
const drizzle_orm_1 = require("drizzle-orm");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const pty_js_1 = require("../pty.js");
const worktree_js_1 = require("../worktree.js");
const worktree_js_2 = require("../worktree.js");
const logger_js_1 = require("./logger.js");
async function listTickets(projectId) {
    if (projectId) {
        return index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.projectId, projectId));
    }
    return index_js_1.db.select().from(schema_js_1.tickets);
}
async function getTicketById(id) {
    const result = await index_js_1.db.select().from(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id)).limit(1);
    return result[0] ?? null;
}
async function getProjectById(id) {
    const result = await index_js_1.db.select().from(schema_js_1.projects).where((0, drizzle_orm_1.eq)(schema_js_1.projects.id, id)).limit(1);
    return result[0] ?? null;
}
async function createTicketRecord(data) {
    await index_js_1.db.insert(schema_js_1.tickets).values(data);
}
async function updateTicket(id, data) {
    await index_js_1.db.update(schema_js_1.tickets).set(data).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id));
}
async function clearTicketOverride(id) {
    await updateTicket(id, { statusOverride: false });
}
function toTicketResponse(ticket) {
    return {
        id: ticket.id,
        title: ticket.title,
        column: ticket.column,
        createdAt: ticket.createdAt,
        projectId: ticket.projectId,
        worktreePath: ticket.worktreePath,
        isMain: ticket.isMain,
        setupStatus: ticket.setupStatus,
        setupError: ticket.setupError,
        setupLogs: ticket.setupLogs,
        setupTmuxSession: ticket.setupTmuxSession,
        description: ticket.description,
        statusOverride: ticket.statusOverride,
        prLink: ticket.prLink,
        prState: ticket.prState,
    };
}
async function deleteTicketAndCleanup(id) {
    const ticket = await getTicketById(id);
    if (!ticket) {
        return { success: false, error: "Ticket not found", status: 404 };
    }
    if (ticket.isMain) {
        return { success: false, error: "Cannot delete main ticket", status: 403 };
    }
    if (ticket.worktreePath && ticket.projectId) {
        const project = await getProjectById(ticket.projectId);
        if (project?.path) {
            const result = (0, worktree_js_1.removeWorktree)(project.path, ticket.worktreePath);
            if (result.error) {
                logger_js_1.logger.warn(`Failed to remove worktree for ticket ${ticket.id}: ${result.error}`);
            }
        }
    }
    if (ticket.setupTmuxSession) {
        (0, worktree_js_2.killSetupTmuxSession)(ticket.setupTmuxSession);
    }
    await index_js_1.db.delete(schema_js_1.tickets).where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, id));
    (0, pty_js_1.killTmuxSession)(id);
    return { success: true };
}
//# sourceMappingURL=ticket-service.js.map