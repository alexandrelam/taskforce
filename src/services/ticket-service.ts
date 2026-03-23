import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { projects, tickets } from "../db/schema.js";
import { killTmuxSession } from "../pty.js";
import { removeWorktree } from "../worktree.js";
import { killSetupTmuxSession } from "../worktree.js";
import { logger } from "./logger.js";

type TicketRecord = typeof tickets.$inferSelect;
type ProjectRecord = typeof projects.$inferSelect;

export async function listTickets(projectId?: string) {
  if (projectId) {
    return db.select().from(tickets).where(eq(tickets.projectId, projectId));
  }
  return db.select().from(tickets);
}

export async function getTicketById(id: string): Promise<TicketRecord | null> {
  const result = await db.select().from(tickets).where(eq(tickets.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getProjectById(id: string): Promise<ProjectRecord | null> {
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createTicketRecord(data: typeof tickets.$inferInsert) {
  await db.insert(tickets).values(data);
}

export async function updateTicket(
  id: string,
  data: Partial<typeof tickets.$inferInsert>
): Promise<void> {
  await db.update(tickets).set(data).where(eq(tickets.id, id));
}

export async function clearTicketOverride(id: string): Promise<void> {
  await updateTicket(id, { statusOverride: false });
}

export function toTicketResponse(ticket: TicketRecord) {
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

export async function deleteTicketAndCleanup(id: string): Promise<{
  success: boolean;
  error?: string;
  status?: number;
}> {
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
      const result = removeWorktree(project.path, ticket.worktreePath);
      if (result.error) {
        logger.warn(`Failed to remove worktree for ticket ${ticket.id}: ${result.error}`);
      }
    }
  }

  if (ticket.setupTmuxSession) {
    killSetupTmuxSession(ticket.setupTmuxSession);
  }

  await db.delete(tickets).where(eq(tickets.id, id));
  killTmuxSession(id);
  return { success: true };
}
