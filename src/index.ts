import express, { Request, Response } from "express";
import { createServer } from "http";
import cors from "cors";
import { eq } from "drizzle-orm";
import { setupPtyWebSocket, tmuxAvailable, killTmuxSession } from "./pty.js";
import { db } from "./db/index.js";
import { settings, tickets, projects } from "./db/schema.js";

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
  const { name, path } = req.body as { name: string; path: string };
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  await db.insert(projects).values({ id, name, path, createdAt });
  res.json({ id, name, path, createdAt });
});

app.delete("/api/projects/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  // Get all tickets for this project to clean up their tmux sessions
  const projectTickets = await db.select().from(tickets).where(eq(tickets.projectId, id));
  for (const ticket of projectTickets) {
    killTmuxSession(ticket.id);
  }
  // Cascade delete tickets
  await db.delete(tickets).where(eq(tickets.projectId, id));
  // Delete the project
  await db.delete(projects).where(eq(projects.id, id));
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
  await db
    .insert(tickets)
    .values({ id, title, column: "To Do", createdAt, projectId: projectId ?? null });
  res.json({ id, title, column: "To Do", createdAt, projectId: projectId ?? null });
});

app.delete("/api/tickets/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  await db.delete(tickets).where(eq(tickets.id, id));
  killTmuxSession(id);
  res.json({ success: true });
});

app.patch("/api/tickets/:id", async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { column } = req.body as { column: string };
  await db.update(tickets).set({ column }).where(eq(tickets.id, id));
  res.json({ success: true });
});

const server = createServer(app);
setupPtyWebSocket(server);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
