import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { tickets } from "../db/schema.js";

const router = Router();

// Ticket Tracking API (for Claude Code hooks)
router.post("/start", async (req: Request, res: Response) => {
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
    `[track/start] Found ticket: { id: '${ticket.id}', title: '${ticket.title}', worktreePath: '${ticket.worktreePath}', statusOverride: ${ticket.statusOverride} }`
  );

  // Check if ticket has manual status override
  if (ticket.statusOverride) {
    console.log(`[track/start] Ticket '${ticket.id}' has manual status override, skipping update`);
    res.status(409).json({
      success: false,
      error: "Ticket has manual status override",
      ticketId: ticket.id,
    });
    return;
  }

  // Update ticket to In Progress and set lastActivityAt
  await db
    .update(tickets)
    .set({ column: "In Progress", lastActivityAt: Date.now() })
    .where(eq(tickets.id, ticket.id));

  console.log(`[track/start] Updated ticket '${ticket.id}' to "In Progress"`);
  res.json({ success: true, ticketId: ticket.id, title: ticket.title });
});

router.post("/stop", async (req: Request, res: Response) => {
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
    `[track/stop] Found ticket: { id: '${ticket.id}', title: '${ticket.title}', worktreePath: '${ticket.worktreePath}', statusOverride: ${ticket.statusOverride} }`
  );

  // Check if ticket has manual status override
  if (ticket.statusOverride) {
    console.log(`[track/stop] Ticket '${ticket.id}' has manual status override, skipping update`);
    res.status(409).json({
      success: false,
      error: "Ticket has manual status override",
      ticketId: ticket.id,
    });
    return;
  }

  // Update ticket to To Do and set lastActivityAt
  await db
    .update(tickets)
    .set({ column: "To Do", lastActivityAt: Date.now() })
    .where(eq(tickets.id, ticket.id));

  console.log(`[track/stop] Updated ticket '${ticket.id}' to "To Do"`);
  res.json({ success: true, ticketId: ticket.id, title: ticket.title });
});

export default router;
