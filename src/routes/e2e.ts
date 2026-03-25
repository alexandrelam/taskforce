import { Router, Request, Response } from "express";
import { db } from "../db/index.js";
import { projects, settings, tickets } from "../db/schema.js";

const router = Router();

interface E2eProjectInput {
  id: string;
  name: string;
  path: string;
  createdAt?: number;
  postWorktreeCommand?: string | null;
  panes?: Array<{ name: string }>;
  editor?: string | null;
  useWorktrees?: boolean;
}

interface E2eTicketInput {
  id: string;
  title: string;
  column?: string;
  createdAt?: number;
  projectId?: string | null;
  worktreePath?: string | null;
  isMain?: boolean | null;
  setupStatus?: string;
  setupError?: string | null;
  setupLogs?: string | null;
  setupTmuxSession?: string | null;
  description?: string | null;
  statusOverride?: boolean | null;
  prLink?: string | null;
  prState?: string | null;
}

router.post("/reset", async (req: Request, res: Response) => {
  const {
    settings: settingsInput = {},
    projects: projectsInput = [],
    tickets: ticketsInput = [],
  } = req.body as {
    settings?: Record<string, string>;
    projects?: E2eProjectInput[];
    tickets?: E2eTicketInput[];
  };

  await db.delete(tickets);
  await db.delete(projects);
  await db.delete(settings);

  const now = Date.now();

  const settingsRows = Object.entries(settingsInput).map(([key, value]) => ({ key, value }));
  if (settingsRows.length > 0) {
    await db.insert(settings).values(settingsRows);
  }

  if (projectsInput.length > 0) {
    await db.insert(projects).values(
      projectsInput.map((project) => ({
        id: project.id,
        name: project.name,
        path: project.path,
        createdAt: project.createdAt ?? now,
        postWorktreeCommand: project.postWorktreeCommand ?? null,
        panes: JSON.stringify(project.panes ?? []),
        editor: project.editor ?? null,
        useWorktrees: project.useWorktrees !== false,
      }))
    );
  }

  if (ticketsInput.length > 0) {
    await db.insert(tickets).values(
      ticketsInput.map((ticket) => ({
        id: ticket.id,
        title: ticket.title,
        column: ticket.column ?? "To Do",
        createdAt: ticket.createdAt ?? now,
        projectId: ticket.projectId ?? null,
        worktreePath: ticket.worktreePath ?? null,
        isMain: ticket.isMain ?? false,
        setupStatus: ticket.setupStatus ?? "ready",
        setupError: ticket.setupError ?? null,
        setupLogs: ticket.setupLogs ?? null,
        setupTmuxSession: ticket.setupTmuxSession ?? null,
        description: ticket.description ?? null,
        statusOverride: ticket.statusOverride ?? null,
        prLink: ticket.prLink ?? null,
        prState: ticket.prState ?? null,
      }))
    );
  }

  res.json({ success: true });
});

export default router;
