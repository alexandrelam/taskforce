import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import { db } from "../db/index.js";
import { projects, tickets } from "../db/schema.js";
import { killTmuxSession } from "../pty.js";
import { removeWorktree } from "../worktree.js";

const router = Router();

// Pane type for JSON parsing
interface Pane {
  name: string;
}

router.get("/", async (_req: Request, res: Response) => {
  const result = await db.select().from(projects);
  // Parse panes JSON for each project
  const projectsWithPanes = result.map((p) => ({
    ...p,
    panes: p.panes ? (JSON.parse(p.panes) as Pane[]) : [],
  }));
  res.json(projectsWithPanes);
});

router.post("/", async (req: Request, res: Response) => {
  const { name, path, postWorktreeCommand, panes, editor } = req.body as {
    name: string;
    path: string;
    postWorktreeCommand?: string;
    panes?: Pane[];
    editor?: string;
  };
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const panesJson = panes ? JSON.stringify(panes) : null;
  await db.insert(projects).values({
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
  await db.insert(tickets).values({
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

router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  // Get project path for worktree removal
  const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  const projectPath = project[0]?.path;

  // Get all tickets for this project to clean up their tmux sessions and worktrees
  const projectTickets = await db.select().from(tickets).where(eq(tickets.projectId, id));
  for (const ticket of projectTickets) {
    killTmuxSession(ticket.id);
    // Remove worktree if it exists
    if (ticket.worktreePath && projectPath) {
      const result = removeWorktree(projectPath, ticket.worktreePath);
      if (result.error) {
        console.warn(`Failed to remove worktree for ticket ${ticket.id}: ${result.error}`);
      }
    }
  }
  // Cascade delete tickets
  await db.delete(tickets).where(eq(tickets.projectId, id));
  // Delete the project
  await db.delete(projects).where(eq(projects.id, id));
  res.json({ success: true });
});

router.patch("/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { postWorktreeCommand, panes, editor } = req.body as {
    postWorktreeCommand?: string;
    panes?: Pane[];
    editor?: string | null;
  };
  const updateData: {
    postWorktreeCommand?: string | null;
    panes?: string | null;
    editor?: string | null;
  } = {};

  if (postWorktreeCommand !== undefined) {
    updateData.postWorktreeCommand = postWorktreeCommand || null;
  }
  if (panes !== undefined) {
    updateData.panes = JSON.stringify(panes);
  }
  if (editor !== undefined) {
    updateData.editor = editor || null;
  }

  await db.update(projects).set(updateData).where(eq(projects.id, id));
  res.json({ success: true });
});

// Git Commit Info API
router.get("/:id/commit", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project[0]) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  try {
    const output = execSync('git log -1 --format="%h %s"', {
      cwd: project[0].path,
      encoding: "utf-8",
    }).trim();
    const [hash, ...messageParts] = output.split(" ");
    const message = messageParts.join(" ");
    res.json({ hash, message });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
});

// Git Pull API
router.post("/:id/pull", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project[0]) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  try {
    const output = execSync("git pull", {
      cwd: project[0].path,
      encoding: "utf-8",
    });
    res.json({ success: true, output });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ success: false, error: errorMessage });
  }
});

export default router;
