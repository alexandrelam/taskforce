"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openEditorForTicket = openEditorForTicket;
const child_process_1 = require("child_process");
const ticket_service_js_1 = require("./ticket-service.js");
const editorCommands = {
    vscode: (targetPath) => ({ command: "code", args: [targetPath] }),
    cursor: (targetPath) => ({ command: "cursor", args: [targetPath] }),
    intellij: (targetPath) => ({ command: "idea", args: [targetPath] }),
    neovim: (targetPath) => ({ command: "open", args: ["-a", "Terminal", targetPath] }),
};
async function openEditorForTicket(id) {
    const ticket = await (0, ticket_service_js_1.getTicketById)(id);
    if (!ticket) {
        return { success: false, error: "Ticket not found", status: 404 };
    }
    if (!ticket.projectId) {
        return { success: false, error: "Ticket has no associated project", status: 400 };
    }
    const project = await (0, ticket_service_js_1.getProjectById)(ticket.projectId);
    if (!project) {
        return { success: false, error: "Project not found", status: 404 };
    }
    if (!project.editor) {
        return { success: false, error: "No editor configured for this project", status: 400 };
    }
    const targetPath = ticket.isMain || !ticket.worktreePath ? project.path : ticket.worktreePath;
    if (!targetPath) {
        return { success: false, error: "No path available for this ticket", status: 400 };
    }
    const editorConfig = editorCommands[project.editor];
    if (!editorConfig) {
        return { success: false, error: `Unknown editor: ${project.editor}`, status: 400 };
    }
    try {
        const { command, args } = editorConfig(targetPath);
        const child = (0, child_process_1.spawn)(command, args, {
            detached: true,
            stdio: "ignore",
        });
        child.unref();
        return { success: true };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return { success: false, error: `Failed to launch editor: ${message}`, status: 500 };
    }
}
//# sourceMappingURL=editor-service.js.map