"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const child_process_1 = require("child_process");
const ticket_service_js_1 = require("../services/ticket-service.js");
const ticket_setup_service_js_1 = require("../services/ticket-setup-service.js");
const editor_service_js_1 = require("../services/editor-service.js");
const logger_js_1 = require("../services/logger.js");
const router = (0, express_1.Router)();
router.get("/", async (req, res) => {
    const projectId = req.query.projectId;
    const result = await (0, ticket_service_js_1.listTickets)(projectId);
    res.json(result.map(ticket_service_js_1.toTicketResponse));
});
router.post("/", async (req, res) => {
    const { title, projectId, description, runPostCommand = true, prLink, baseBranch, } = req.body;
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    let projectPath = null;
    let postWorktreeCommand = null;
    let setup = null;
    if (projectId) {
        const project = await (0, ticket_service_js_1.getProjectById)(projectId);
        if (project?.path && project.useWorktrees !== false) {
            projectPath = project.path;
            postWorktreeCommand = project.postWorktreeCommand ?? null;
            setup = (0, ticket_setup_service_js_1.createTicketWorktree)(project.path, title, baseBranch);
        }
    }
    const ticket = {
        id,
        title,
        column: "To Do",
        createdAt,
        projectId: projectId ?? null,
        worktreePath: null,
        isMain: false,
        setupStatus: setup ? "pending" : "ready",
        setupError: null,
        setupLogs: null,
        description: description ?? null,
        prLink: prLink ?? null,
    };
    await (0, ticket_service_js_1.createTicketRecord)(ticket);
    res.status(201).json(ticket);
    if (setup && projectPath) {
        const commandToRun = runPostCommand ? postWorktreeCommand : null;
        (0, ticket_setup_service_js_1.runTicketSetup)(id, setup.create, commandToRun).catch((error) => {
            logger_js_1.logger.error(`Background setup failed for ticket ${id}`, error);
        });
    }
});
router.post("/from-branch", async (req, res) => {
    const { branchName, projectId, description, prLink, runPostCommand = true, } = req.body;
    if (!branchName || !projectId) {
        res.status(400).json({ success: false, error: "branchName and projectId are required" });
        return;
    }
    const project = await (0, ticket_service_js_1.getProjectById)(projectId);
    if (!project?.path) {
        res.status(404).json({ success: false, error: "Project not found" });
        return;
    }
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const setup = project.useWorktrees !== false ? (0, ticket_setup_service_js_1.createBranchWorktree)(project.path, branchName) : null;
    const ticket = {
        id,
        title: branchName,
        column: "To Do",
        createdAt,
        projectId,
        worktreePath: null,
        isMain: false,
        setupStatus: setup ? "pending" : "ready",
        setupError: null,
        setupLogs: null,
        description: description ?? null,
        prLink: prLink ?? null,
    };
    await (0, ticket_service_js_1.createTicketRecord)(ticket);
    res.status(201).json(ticket);
    if (setup) {
        const commandToRun = runPostCommand ? project.postWorktreeCommand ?? null : null;
        (0, ticket_setup_service_js_1.runTicketSetup)(id, setup.create, commandToRun).catch((error) => {
            logger_js_1.logger.error(`Background setup failed for ticket ${id}`, error);
        });
    }
});
router.delete("/:id", async (req, res) => {
    const result = await (0, ticket_service_js_1.deleteTicketAndCleanup)(req.params.id);
    if (!result.success) {
        res.status(result.status ?? 400).json({ success: false, error: result.error });
        return;
    }
    res.json({ success: true });
});
router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { column, description, prLink } = req.body;
    const existing = await (0, ticket_service_js_1.getTicketById)(id);
    if (!existing) {
        res.status(404).json({ success: false, error: "Ticket not found" });
        return;
    }
    const updateData = {};
    if (column !== undefined) {
        updateData.column = column;
        updateData.statusOverride = true;
    }
    if (description !== undefined) {
        updateData.description = description;
    }
    if (prLink !== undefined) {
        updateData.prLink = prLink;
    }
    await (0, ticket_service_js_1.updateTicket)(id, updateData);
    res.json({ success: true });
});
router.patch("/:id/clear-override", async (req, res) => {
    const ticket = await (0, ticket_service_js_1.getTicketById)(req.params.id);
    if (!ticket) {
        res.status(404).json({ success: false, error: "Ticket not found" });
        return;
    }
    await (0, ticket_service_js_1.clearTicketOverride)(req.params.id);
    res.json({ success: true });
});
router.post("/:id/open-editor", async (req, res) => {
    const result = await (0, editor_service_js_1.openEditorForTicket)(req.params.id);
    if (!result.success) {
        res.status(result.status ?? 400).json({ success: false, error: result.error });
        return;
    }
    res.json({ success: true });
});
const PR_URL_REGEX = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/;
router.get("/pr-info", async (req, res) => {
    const url = req.query.url;
    if (!url || !PR_URL_REGEX.test(url)) {
        res.status(400).json({ error: "Invalid GitHub PR URL" });
        return;
    }
    try {
        const output = (0, child_process_1.execFileSync)("gh", ["pr", "view", url, "--json", "title,headRefName"], {
            timeout: 10000,
            encoding: "utf-8",
        });
        const data = JSON.parse(output);
        res.json({ title: data.title, headRefName: data.headRefName });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch PR info";
        res.status(500).json({ error: message });
    }
});
exports.default = router;
//# sourceMappingURL=tickets.js.map