import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import { db } from "../db/index.js";
import { projects, tickets } from "../db/schema.js";
import { killTmuxSession } from "../pty.js";
import {
  slugify,
  createWorktree,
  createWorktreeFromBranch,
  removeWorktree,
  runPostWorktreeCommand,
} from "../worktree.js";

const router = Router();

// Type for worktree creation function
type WorktreeCreator = () => { worktreePath: string | null; error: string | null };

// Async function to run ticket setup (worktree creation + post-command) in background
async function runTicketSetup(
  ticketId: string,
  createWorktreeFn: WorktreeCreator,
  postWorktreeCommand: string | null
) {
  try {
    // Update status to creating_worktree
    await db
      .update(tickets)
      .set({ setupStatus: "creating_worktree" })
      .where(eq(tickets.id, ticketId));

    // Create worktree using provided function
    const result = createWorktreeFn();

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

router.get("/", async (req: Request, res: Response) => {
  const projectId = req.query.projectId as string | undefined;
  if (projectId) {
    const result = await db.select().from(tickets).where(eq(tickets.projectId, projectId));
    res.json(result);
  } else {
    const result = await db.select().from(tickets);
    res.json(result);
  }
});

router.post("/", async (req: Request, res: Response) => {
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
    runTicketSetup(id, () => createWorktree(projectPath, slug), postWorktreeCommand).catch(
      (err) => {
        console.error(`Background setup failed for ticket ${id}:`, err);
      }
    );
  }
});

// Create ticket from existing branch
router.post("/from-branch", async (req: Request, res: Response) => {
  const { branchName, projectId, description } = req.body as {
    branchName: string;
    projectId: string;
    description?: string;
  };

  if (!branchName || !projectId) {
    res.status(400).json({ success: false, error: "branchName and projectId are required" });
    return;
  }

  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project[0]?.path) {
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const projectPath = project[0].path;
  const postWorktreeCommand = project[0].postWorktreeCommand ?? null;

  // Use branch name as title
  const title = branchName;

  // Insert ticket immediately with pending status
  await db.insert(tickets).values({
    id,
    title,
    column: "To Do",
    createdAt,
    projectId,
    worktreePath: null,
    isMain: false,
    setupStatus: "pending",
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
    projectId,
    worktreePath: null,
    isMain: false,
    setupStatus: "pending",
    description: description ?? null,
  });

  // Run setup in background (fire and forget)
  runTicketSetup(
    id,
    () => createWorktreeFromBranch(projectPath, branchName),
    postWorktreeCommand
  ).catch((err) => {
    console.error(`Background setup failed for ticket ${id}:`, err);
  });
});

router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
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

router.patch("/:id", async (req: Request<{ id: string }>, res: Response) => {
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

  const updateData: { column?: string; description?: string; statusOverride?: boolean } = {};
  if (column !== undefined) {
    updateData.column = column;
    // Set statusOverride when column changes (manual drag)
    updateData.statusOverride = true;
    console.log(`[PATCH /api/tickets/:id] Setting statusOverride=true for manual column change`);
  }
  if (description !== undefined) updateData.description = description;

  await db.update(tickets).set(updateData).where(eq(tickets.id, id));
  console.log(`[PATCH /api/tickets/:id] Successfully updated ticket '${id}'`);
  res.json({ success: true });
});

// Clear status override endpoint
router.patch("/:id/clear-override", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  console.log(
    `[PATCH /api/tickets/:id/clear-override] Request to clear override for ticket '${id}'`
  );

  const existing = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!existing[0]) {
    console.log(`[PATCH /api/tickets/:id/clear-override] Ticket '${id}' not found`);
    res.status(404).json({ success: false, error: "Ticket not found" });
    return;
  }

  await db.update(tickets).set({ statusOverride: false }).where(eq(tickets.id, id));
  console.log(`[PATCH /api/tickets/:id/clear-override] Cleared override for ticket '${id}'`);
  res.json({ success: true });
});

// Open Editor API
router.post("/:id/open-editor", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  console.log(`[POST /api/tickets/:id/open-editor] Request to open editor for ticket '${id}'`);

  // Get ticket
  const ticketResult = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  const ticket = ticketResult[0];

  if (!ticket) {
    console.log(`[open-editor] Ticket '${id}' not found`);
    res.status(404).json({ success: false, error: "Ticket not found" });
    return;
  }

  // Get associated project
  if (!ticket.projectId) {
    console.log(`[open-editor] Ticket '${id}' has no associated project`);
    res.status(400).json({ success: false, error: "Ticket has no associated project" });
    return;
  }

  const projectResult = await db
    .select()
    .from(projects)
    .where(eq(projects.id, ticket.projectId))
    .limit(1);
  const project = projectResult[0];

  if (!project) {
    console.log(`[open-editor] Project not found for ticket '${id}'`);
    res.status(404).json({ success: false, error: "Project not found" });
    return;
  }

  if (!project.editor) {
    console.log(`[open-editor] No editor configured for project '${project.id}'`);
    res.status(400).json({ success: false, error: "No editor configured for this project" });
    return;
  }

  // Determine the directory to open
  // For main tickets, use project path; for regular tickets, use worktreePath
  const targetPath = ticket.isMain ? project.path : ticket.worktreePath;

  if (!targetPath) {
    console.log(`[open-editor] No path available for ticket '${id}'`);
    res.status(400).json({ success: false, error: "No path available for this ticket" });
    return;
  }

  // Map editor name to command
  const editorCommands: Record<string, { command: string; args: string[] }> = {
    vscode: { command: "code", args: [targetPath] },
    cursor: { command: "cursor", args: [targetPath] },
    intellij: { command: "idea", args: [targetPath] },
    neovim: { command: "open", args: ["-a", "Terminal", targetPath] },
  };

  const editorConfig = editorCommands[project.editor];
  if (!editorConfig) {
    console.log(`[open-editor] Unknown editor '${project.editor}'`);
    res.status(400).json({ success: false, error: `Unknown editor: ${project.editor}` });
    return;
  }

  try {
    console.log(
      `[open-editor] Spawning editor: ${editorConfig.command} ${editorConfig.args.join(" ")}`
    );

    // Spawn editor process detached so it runs independently
    const child = spawn(editorConfig.command, editorConfig.args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    res.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[open-editor] Failed to launch editor: ${errorMessage}`);
    res.status(500).json({ success: false, error: `Failed to launch editor: ${errorMessage}` });
  }
});

export default router;
