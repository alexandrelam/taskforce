import express, { Request, Response } from "express";
import { createServer } from "http";
import cors from "cors";
import { eq } from "drizzle-orm";
import { setupPtyWebSocket, tmuxAvailable, killTmuxSession } from "./pty.js";
import { db } from "./db/index.js";
import { settings, tickets, projects } from "./db/schema.js";
import { slugify, createWorktree, removeWorktree, runPostWorktreeCommand } from "./worktree.js";

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello, World!" });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api/tmux/status", (_req: Request, res: Response) => {
  res.json({ available: tmuxAvailable });
});

app.get("/api/settings/:key", async (req: Request<{ key: string }>, res: Response) => {
  const key = req.params.key;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  res.json({ value: result[0]?.value ?? null });
});

app.put("/api/settings/:key", async (req: Request<{ key: string }>, res: Response) => {
  const key = req.params.key;
  const { value } = req.body as { value: string };
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
  res.json({ success: true });
});

// Projects API
app.get("/api/projects", async (_req: Request, res: Response) => {
  const result = await db.select().from(projects);
  res.json(result);
});

app.post("/api/projects", async (req: Request, res: Response) => {
  const { name, path, postWorktreeCommand } = req.body as {
    name: string;
    path: string;
    postWorktreeCommand?: string;
  };
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await db.insert(projects).values({
    id,
    name,
    path,
    createdAt,
    postWorktreeCommand: postWorktreeCommand ?? null,
  });
  res.json({ id, name, path, createdAt, postWorktreeCommand: postWorktreeCommand ?? null });
});

app.delete("/api/projects/:id", async (req: Request<{ id: string }>, res: Response) => {
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

app.patch("/api/projects/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { postWorktreeCommand } = req.body as { postWorktreeCommand?: string };
  await db
    .update(projects)
    .set({ postWorktreeCommand: postWorktreeCommand ?? null })
    .where(eq(projects.id, id));
  res.json({ success: true });
});

// Tickets API
app.get("/api/tickets", async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined;
  if (projectId) {
    const result = await db.select().from(tickets).where(eq(tickets.projectId, projectId));
    res.json(result);
  } else {
    const result = await db.select().from(tickets);
    res.json(result);
  }
});

app.post("/api/tickets", async (req: Request, res: Response) => {
  const { title, projectId } = req.body as { title: string; projectId?: string };
  const id = crypto.randomUUID();
  const createdAt = Date.now();

  let worktreePath: string | null = null;
  let worktreeError: string | null = null;
  let postCommandOutput: string | null = null;
  let postCommandError: string | null = null;

  // Create worktree if project is specified
  if (projectId) {
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

    if (project[0]?.path) {
      const slug = slugify(title);
      const result = createWorktree(project[0].path, slug);
      worktreePath = result.worktreePath;
      worktreeError = result.error;

      // Run post-worktree command if worktree was created successfully
      if (worktreePath && project[0].postWorktreeCommand) {
        const cmdResult = runPostWorktreeCommand(worktreePath, project[0].postWorktreeCommand);
        postCommandOutput = cmdResult.output;
        postCommandError = cmdResult.error;
      }
    }
  }

  await db.insert(tickets).values({
    id,
    title,
    column: "To Do",
    createdAt,
    projectId: projectId ?? null,
    worktreePath,
  });

  res.json({
    id,
    title,
    column: "To Do",
    createdAt,
    projectId: projectId ?? null,
    worktreePath,
    worktreeError,
    postCommandOutput,
    postCommandError,
  });
});

app.delete("/api/tickets/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  // Get ticket to check for worktree
  const ticket = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  const ticketData = ticket[0];

  // Remove worktree if it exists
  if (ticketData?.worktreePath && ticketData?.projectId) {
    const project = await db
      .select()
      .from(projects)
      .where(eq(projects.id, ticketData.projectId))
      .limit(1);

    if (project[0]?.path) {
      const result = removeWorktree(project[0].path, ticketData.worktreePath);
      if (result.error) {
        console.warn(`Failed to remove worktree: ${result.error}`);
      }
    }
  }

  await db.delete(tickets).where(eq(tickets.id, id));
  killTmuxSession(id);
  res.json({ success: true });
});

app.patch("/api/tickets/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { column } = req.body as { column: string };
  console.log(`[PATCH /api/tickets/:id] Request to update ticket '${id}' to column '${column}'`);

  // Get current ticket state before update
  const existing = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!existing[0]) {
    console.log(`[PATCH /api/tickets/:id] Ticket '${id}' not found`);
    res.status(404).json({ success: false, error: "Ticket not found" });
    return;
  }
  console.log(
    `[PATCH /api/tickets/:id] Current ticket state: { id: '${existing[0].id}', title: '${existing[0].title}', column: '${existing[0].column}' }`
  );

  await db.update(tickets).set({ column }).where(eq(tickets.id, id));
  console.log(
    `[PATCH /api/tickets/:id] Successfully updated ticket '${id}' from '${existing[0].column}' to '${column}'`
  );
  res.json({ success: true });
});

// Ticket Tracking API (for Claude Code hooks)
app.post("/api/tickets/track/start", async (req: Request, res: Response) => {
  const { cwd } = req.body as { cwd: string };
  console.log(`[track/start] Received request with cwd: ${cwd}`);

  // Find ticket by worktree path
  const result = await db.select().from(tickets).where(eq(tickets.worktreePath, cwd)).limit(1);
  const ticket = result[0];

  if (!ticket) {
    console.log(`[track/start] No ticket found for cwd: ${cwd}`);
    res.status(404).json({ success: false, error: "No ticket found for this directory" });
    return;
  }

  console.log(
    `[track/start] Found ticket: { id: '${ticket.id}', title: '${ticket.title}', worktreePath: '${ticket.worktreePath}' }`
  );

  // Update ticket to In Progress and set lastActivityAt
  await db
    .update(tickets)
    .set({ column: "In Progress", lastActivityAt: Date.now() })
    .where(eq(tickets.id, ticket.id));

  console.log(`[track/start] Updated ticket '${ticket.id}' to "In Progress"`);
  res.json({ success: true, ticketId: ticket.id, title: ticket.title });
});

app.post("/api/tickets/track/stop", async (req: Request, res: Response) => {
  const { cwd } = req.body as { cwd: string };
  console.log(`[track/stop] Received request with cwd: ${cwd}`);

  // Find ticket by worktree path
  const result = await db.select().from(tickets).where(eq(tickets.worktreePath, cwd)).limit(1);
  const ticket = result[0];

  if (!ticket) {
    console.log(`[track/stop] No ticket found for cwd: ${cwd}`);
    res.status(404).json({ success: false, error: "No ticket found for this directory" });
    return;
  }

  console.log(
    `[track/stop] Found ticket: { id: '${ticket.id}', title: '${ticket.title}', worktreePath: '${ticket.worktreePath}' }`
  );

  // Update ticket to To Do and set lastActivityAt
  await db
    .update(tickets)
    .set({ column: "To Do", lastActivityAt: Date.now() })
    .where(eq(tickets.id, ticket.id));

  console.log(`[track/stop] Updated ticket '${ticket.id}' to "To Do"`);
  res.json({ success: true, ticketId: ticket.id, title: ticket.title });
});

const server = createServer(app);
setupPtyWebSocket(server);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
