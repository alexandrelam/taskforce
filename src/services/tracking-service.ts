import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { tickets } from "../db/schema.js";

export async function applyTrackingState(cwd: string, column: "To Do" | "In Progress") {
  const result = await db.select().from(tickets).where(eq(tickets.worktreePath, cwd)).limit(1);
  const ticket = result[0];

  if (!ticket) {
    return { success: false as const, error: "No ticket found for this directory", status: 404 };
  }

  if (ticket.statusOverride) {
    return {
      success: false as const,
      error: "Ticket has manual status override",
      ticketId: ticket.id,
      status: 409,
    };
  }

  await db
    .update(tickets)
    .set({ column, lastActivityAt: Date.now() })
    .where(eq(tickets.id, ticket.id));

  return { success: true as const, ticketId: ticket.id, title: ticket.title };
}
