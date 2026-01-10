import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import type { Server, IncomingMessage } from "http";
import { existsSync } from "fs";

const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "/bin/zsh";

function getValidCwd(requestedCwd: string | null): string {
  const fallback = process.env.HOME || process.cwd();
  if (!requestedCwd) return fallback;
  return existsSync(requestedCwd) ? requestedCwd : fallback;
}

export function setupPtyWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/pty" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const requestedCwd = url.searchParams.get("cwd");
    const cwd = getValidCwd(requestedCwd);

    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd,
      env: process.env as Record<string, string>,
    });

    ptyProcess.onData((data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    ws.on("message", (message: Buffer | string) => {
      const msg = message.toString();
      try {
        const parsed = JSON.parse(msg);
        if (parsed.type === "resize" && parsed.cols && parsed.rows) {
          ptyProcess.resize(parsed.cols, parsed.rows);
          return;
        }
      } catch {
        // Not JSON, treat as terminal input
      }
      ptyProcess.write(msg);
    });

    ws.on("close", () => {
      ptyProcess.kill();
    });
  });

  console.log("PTY WebSocket server running on /pty");
}
