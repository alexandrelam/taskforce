import { Router, Request, Response } from "express";
import { execFileSync } from "child_process";
import {
  createTicketRecord,
  deleteTicketAndCleanup,
  getProjectById,
  getTicketById,
  listTickets,
  toTicketResponse,
  updateTicket,
  clearTicketOverride,
} from "../services/ticket-service.js";
import {
  createBranchWorktree,
  createTicketWorktree,
  runTicketSetup,
} from "../services/ticket-setup-service.js";
import { openEditorForTicket } from "../services/editor-service.js";
import { logger } from "../services/logger.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined;
  const result = await listTickets(projectId);
  res.json(result.map(toTicketResponse));
});

router.post("/", async (req: Request, res: Response) => {
  const {
    title,
    projectId,
    description,
    runPostCommand = true,
    prLink,
    baseBranch,
  } = req.body as {
    title: string;
    projectId?: string;
    description?: string;
    runPostCommand?: boolean;
    prLink?: string;
    baseBranch?: string;
  };

  const id = crypto.randomUUID();
  const createdAt = Date.now();

  let projectPath: string | null = null;
  let postWorktreeCommand: string | null = null;
  let setup = null as ReturnType<typeof createTicketWorktree> | null;

  if (projectId) {
    const project = await getProjectById(projectId);
    if (project?.path && project.useWorktrees !== false) {
      projectPath = project.path;
      postWorktreeCommand = project.postWorktreeCommand ?? null;
      setup = createTicketWorktree(project.path, title, baseBranch);
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
  } as const;

  await createTicketRecord(ticket);
  res.status(201).json(ticket);

  if (setup && projectPath) {
    const commandToRun = runPostCommand ? postWorktreeCommand : null;
    runTicketSetup(id, setup.create, commandToRun).catch((error) => {
      logger.error(`Background setup failed for ticket ${id}`, error);
    });
  }
});

router.post("/from-branch", async (req: Request, res: Response) => {
  const {
    branchName,
    projectId,
    description,
    prLink,
    runPostCommand = true,
  } = req.body as {
    branchName: string;
    projectId: string;
    description?: string;
    prLink?: string;
    runPostCommand?: boolean;
  };

  if (!branchName || !projectId) {
    res.status(400).json({ success: false, error: "branchName and projectId are required" });
    return;
  }

  const project = await getProjectById(projectId);
  if (!project?.path) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const setup =
    project.useWorktrees !== false ? createBranchWorktree(project.path, branchName) : null;

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
  } as const;

  await createTicketRecord(ticket);
  res.status(201).json(ticket);

  if (setup) {
    const commandToRun = runPostCommand ? (project.postWorktreeCommand ?? null) : null;
    runTicketSetup(id, setup.create, commandToRun).catch((error) => {
      logger.error(`Background setup failed for ticket ${id}`, error);
    });
  }
});

router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const result = await deleteTicketAndCleanup(req.params.id);
  if (!result.success) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }

  res.json({ success: true });
});

router.patch("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { column, description, prLink } = req.body as {
    column?: string;
    description?: string | null;
    prLink?: string | null;
  };

  const existing = await getTicketById(id);
  if (!existing) {
    res.status(404).json({ success: false, error: "Ticket not found" });
    return;
  }

  const updateData: {
    column?: string;
    description?: string | null;
    prLink?: string | null;
    statusOverride?: boolean;
  } = {};

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

  await updateTicket(id, updateData);
  res.json({ success: true });
});

router.patch("/:id/clear-override", async (req: Request<{ id: string }>, res: Response) => {
  const ticket = await getTicketById(req.params.id);
  if (!ticket) {
    res.status(404).json({ success: false, error: "Ticket not found" });
    return;
  }

  await clearTicketOverride(req.params.id);
  res.json({ success: true });
});

router.post("/:id/open-editor", async (req: Request<{ id: string }>, res: Response) => {
  const result = await openEditorForTicket(req.params.id);
  if (!result.success) {
    res.status(result.status ?? 400).json({ success: false, error: result.error });
    return;
  }

  res.json({ success: true });
});

const PR_URL_REGEX = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/;

router.get("/pr-info", async (req: Request, res: Response) => {
  const url = req.query.url as string | undefined;

  if (!url || !PR_URL_REGEX.test(url)) {
    res.status(400).json({ error: "Invalid GitHub PR URL" });
    return;
  }

  try {
    const output = execFileSync("gh", ["pr", "view", url, "--json", "title,headRefName"], {
      timeout: 10000,
      encoding: "utf-8",
    });
    const data = JSON.parse(output) as { title: string; headRefName: string };
    res.json({ title: data.title, headRefName: data.headRefName });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch PR info";
    res.status(500).json({ error: message });
  }
});

export default router;
