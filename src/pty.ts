import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import type { IPty } from "node-pty";
import type { Server, IncomingMessage } from "http";
import { existsSync } from "fs";

const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "/bin/zsh";

// Store PTY sessions by sessionId for reconnection
const sessions = new Map<string, IPty>();

function getValidCwd(requestedCwd: string | null): string {
  const fallback = process.env.HOME || process.cwd();
  if (!requestedCwd) return fallback;
  return existsSync(requestedCwd) ? requestedCwd : fallback;
}

export function killSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.kill();
    sessions.delete(sessionId);
  }
}

export function setupPtyWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/pty" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");
    const requestedCwd = url.searchParams.get("cwd");
    const cwd = getValidCwd(requestedCwd);

    let ptyProcess: IPty;

    // Try to reconnect to existing session or create new one
    if (sessionId && sessions.has(sessionId)) {
      ptyProcess = sessions.get(sessionId)!;
    } else {
      ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd,
        env: process.env as Record<string, string>,
      });
      if (sessionId) {
        sessions.set(sessionId, ptyProcess);
      }
    }

    // Attach data listener for this WebSocket connection
    const dataDisposable = ptyProcess.onData((data: string) => {
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
        if (parsed.type === "kill" && sessionId) {
          killSession(sessionId);
          ws.close();
          return;
        }
      } catch {
        // Not JSON, treat as terminal input
      }
      ptyProcess.write(msg);
    });

    ws.on("close", () => {
      // Dispose the data listener but keep PTY alive for reconnection
      dataDisposable.dispose();
      // Only kill if no sessionId (legacy behavior for sessions without ID)
      if (!sessionId) {
        ptyProcess.kill();
      }
    });
  });

  console.log("PTY WebSocket server running on /pty");
}
