import express, { Request, Response } from "express";
import { createServer } from "http";
import cors from "cors";
import { eq } from "drizzle-orm";
import { execSync } from "child_process";
import { setupPtyWebSocket, tmuxAvailable, killTmuxSession } from "./pty.js";
import { db } from "./db/index.js";
import { settings, tickets, projects } from "./db/schema.js";
import { slugify, createWorktree, removeWorktree, runPostWorktreeCommand } from "./worktree.js";

const app = express();
app.use(cors());
const port = process.env.PORT || 3325;

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

// Pane type for JSON parsing
interface Pane {
  name: string;
}

// Projects API
app.get("/api/projects", async (_req: Request, res: Response) => {
  const result = await db.select().from(projects);
  // Parse panes JSON for each project
  const projectsWithPanes = result.map((p) => ({
    ...p,
    panes: p.panes ? (JSON.parse(p.panes) as Pane[]) : [],
  }));
  res.json(projectsWithPanes);
});

app.post("/api/projects", async (req: Request, res: Response) => {
  const { name, path, postWorktreeCommand, panes } = req.body as {
    name: string;
    path: string;
    postWorktreeCommand?: string;
    panes?: Pane[];
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
  });
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
  const { postWorktreeCommand, panes } = req.body as {
    postWorktreeCommand?: string;
    panes?: Pane[];
  };
  const updateData: { postWorktreeCommand?: string | null; panes?: string | null } = {};

  if (postWorktreeCommand !== undefined) {
    updateData.postWorktreeCommand = postWorktreeCommand || null;
  }
  if (panes !== undefined) {
    updateData.panes = JSON.stringify(panes);
  }

  await db.update(projects).set(updateData).where(eq(projects.id, id));
  res.json({ success: true });
});

// Git Commit Info API
app.get("/api/projects/:id/commit", async (req: Request<{ id: string }>, res: Response) => {
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
app.post("/api/projects/:id/pull", async (req: Request<{ id: string }>, res: Response) => {
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

// Async function to run ticket setup (worktree creation + post-command) in background
async function runTicketSetup(
  ticketId: string,
  projectPath: string,
  slug: string,
  postWorktreeCommand: string | null
) {
  try {
    // Update status to creating_worktree
    await db
      .update(tickets)
      .set({ setupStatus: "creating_worktree" })
      .where(eq(tickets.id, ticketId));

    // Create worktree
    const result = createWorktree(projectPath, slug);

    if (result.error) {
      await db
        .update(tickets)
        .set({
          setupStatus: "failed",
          setupError: result.error,
        })
        .where(eq(tickets.id, ticketId));
      return;
    }

    // Update worktreePath
    await db
      .update(tickets)
      .set({ worktreePath: result.worktreePath })
      .where(eq(tickets.id, ticketId));

    // Run post-worktree command if configured
    if (result.worktreePath && postWorktreeCommand) {
      await db
        .update(tickets)
        .set({ setupStatus: "running_post_command" })
        .where(eq(tickets.id, ticketId));

      const cmdResult = runPostWorktreeCommand(result.worktreePath, postWorktreeCommand);

      if (cmdResult.error) {
        await db
          .update(tickets)
          .set({
            setupStatus: "failed",
            setupError: cmdResult.error,
            setupLogs: cmdResult.output,
          })
          .where(eq(tickets.id, ticketId));
        return;
      }

      // Store logs on success
      await db
        .update(tickets)
        .set({
          setupStatus: "ready",
          setupLogs: cmdResult.output,
        })
        .where(eq(tickets.id, ticketId));
    } else {
      // No post-command, mark as ready
      await db.update(tickets).set({ setupStatus: "ready" }).where(eq(tickets.id, ticketId));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(tickets)
      .set({
        setupStatus: "failed",
        setupError: errorMessage,
      })
      .where(eq(tickets.id, ticketId));
  }
}

app.post("/api/tickets", async (req: Request, res: Response) => {
  const { title, projectId, description } = req.body as {
    title: string;
    projectId?: string;
    description?: string;
  };
  const id = crypto.randomUUID();
  const createdAt = Date.now();

  // Determine if we need async setup
  let needsSetup = false;
  let projectPath: string | null = null;
  let postWorktreeCommand: string | null = null;
  let slug: string | null = null;

  if (projectId) {
    const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (project[0]?.path) {
      needsSetup = true;
      projectPath = project[0].path;
      postWorktreeCommand = project[0].postWorktreeCommand ?? null;
      slug = slugify(title);
    }
  }

  // Insert ticket immediately with pending status if setup needed
  await db.insert(tickets).values({
    id,
    title,
    column: "To Do",
    createdAt,
    projectId: projectId ?? null,
    worktreePath: null,
    isMain: false,
    setupStatus: needsSetup ? "pending" : "ready",
    setupError: null,
    setupLogs: null,
    description: description ?? null,
  });

  // Return immediately
  res.status(201).json({
    id,
    title,
    column: "To Do",
    createdAt,
    projectId: projectId ?? null,
    worktreePath: null,
    isMain: false,
    setupStatus: needsSetup ? "pending" : "ready",
    description: description ?? null,
  });

  // Run setup in background (fire and forget)
  if (needsSetup && projectPath && slug) {
    runTicketSetup(id, projectPath, slug, postWorktreeCommand).catch((err) => {
      console.error(`Background setup failed for ticket ${id}:`, err);
    });
  }
});

app.delete("/api/tickets/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  // Get ticket to check for worktree and main status
  const ticket = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  const ticketData = ticket[0];

  // Reject deletion of main tickets
  if (ticketData?.isMain) {
    res.status(403).json({ success: false, error: "Cannot delete main ticket" });
    return;
  }

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
  const { column, description } = req.body as { column?: string; description?: string };
  console.log(`[PATCH /api/tickets/:id] Request to update ticket '${id}'`);

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

  const updateData: { column?: string; description?: string } = {};
  if (column !== undefined) updateData.column = column;
  if (description !== undefined) updateData.description = description;

  await db.update(tickets).set(updateData).where(eq(tickets.id, id));
  console.log(`[PATCH /api/tickets/:id] Successfully updated ticket '${id}'`);
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
