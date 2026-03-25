import express, { Request, Response } from "express";
import { createServer } from "http";
import path from "path";
import cors from "cors";
import { setupPtyWebSocket, tmuxAvailable } from "./pty.js";
import settingsRouter from "./routes/settings.js";
import projectsRouter from "./routes/projects.js";
import ticketsRouter from "./routes/tickets.js";
import trackingRouter from "./routes/tracking.js";
import e2eRouter from "./routes/e2e.js";
import { startPrPoller } from "./pr-poller.js";
import { logger } from "./services/logger.js";

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
if (process.env.ENABLE_E2E_API === "1") {
  app.use("/api/e2e", e2eRouter);
}

// Serve static files from web/dist (frontend build)
app.use(express.static(path.join(__dirname, "../web/dist")));

// SPA fallback - serve index.html for all non-API routes
app.get("/{*splat}", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../web/dist/index.html"));
});

const server = createServer(app);
setupPtyWebSocket(server);

server.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
  if (process.env.DISABLE_PR_POLLER !== "1") {
    startPrPoller();
  }
});
