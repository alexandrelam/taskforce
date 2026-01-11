import express, { Request, Response } from "express";
import { createServer } from "http";
import path from "path";
import cors from "cors";
import { setupPtyWebSocket, tmuxAvailable } from "./pty.js";
import settingsRouter from "./routes/settings.js";
import projectsRouter from "./routes/projects.js";
import ticketsRouter from "./routes/tickets.js";
import trackingRouter from "./routes/tracking.js";

const app = express();
app.use(cors());
const port = process.env.PORT || 3325;

app.use(express.json());

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api/tmux/status", (_req: Request, res: Response) => {
  res.json({ available: tmuxAvailable });
});

// Mount routers
app.use("/api/settings", settingsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tickets/track", trackingRouter); // Mount before /api/tickets
app.use("/api/tickets", ticketsRouter);

// Serve static files from web/dist (frontend build)
app.use(express.static(path.join(__dirname, "../web/dist")));

// SPA fallback - serve index.html for all non-API routes
app.get("/{*splat}", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../web/dist/index.html"));
});

const server = createServer(app);
setupPtyWebSocket(server);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
