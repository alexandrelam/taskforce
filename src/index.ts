import express, { Request, Response } from "express";
import { createServer } from "http";
import cors from "cors";
import { eq } from "drizzle-orm";
import { setupPtyWebSocket } from "./pty.js";
import { db } from "./db/index.js";
import { settings } from "./db/schema.js";

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

const server = createServer(app);
setupPtyWebSocket(server);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
