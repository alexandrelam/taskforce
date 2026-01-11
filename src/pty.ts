import { WebSocketServer, WebSocket } from "ws";
import * as pty from "node-pty";
import type { Server, IncomingMessage } from "http";
import { existsSync } from "fs";
import { execSync } from "child_process";

const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "/bin/zsh";

// Detect tmux availability at module load
function detectTmux(): boolean {
  if (process.platform === "win32") return false;
  try {
    execSync("which tmux", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export const tmuxAvailable = detectTmux();

if (tmuxAvailable) {
  console.log("tmux detected - session persistence enabled");
} else {
  console.log("tmux not found - session persistence disabled");
}

function getValidCwd(requestedCwd: string | null): string {
  const fallback = process.env.HOME || process.cwd();
  if (!requestedCwd) return fallback;
  return existsSync(requestedCwd) ? requestedCwd : fallback;
}

// Sanitize session ID to be safe for tmux session names
export function sanitizeSessionId(sessionId: string): string {
  // tmux session names can't contain periods or colons
  return sessionId.replace(/[.:]/g, "-");
}

// Kill all tmux sessions for a ticket (including pane sessions)
// Sessions are named {ticketId}-{paneName} (e.g., abc123-claude, abc123-frontend)
export function killTmuxSession(ticketId: string): void {
  if (!tmuxAvailable) return;
  const sanitizedId = sanitizeSessionId(ticketId);

  try {
    // List all sessions and filter those starting with the ticketId prefix
    const output = execSync("tmux list-sessions -F '#{session_name}'", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const sessions = output.trim().split("\n").filter(Boolean);

    for (const session of sessions) {
      // Match sessions that start with the ticketId (handles both old single-session
      // format and new {ticketId}-{paneName} format)
      if (session === sanitizedId || session.startsWith(`${sanitizedId}-`)) {
        try {
          execSync(`tmux kill-session -t "${session}"`, { stdio: "ignore" });
        } catch {
          // Session may have been killed already - ignore
        }
      }
    }
  } catch {
    // tmux list-sessions fails if no sessions exist - ignore
  }
}

export function setupPtyWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/pty" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const requestedCwd = url.searchParams.get("cwd");
    const sessionId = url.searchParams.get("sessionId");
    const cwd = getValidCwd(requestedCwd);

    // Use tmux if available and sessionId is provided
    const useTmux = tmuxAvailable && sessionId;

    let ptyProcess: pty.IPty;

    if (useTmux) {
      const tmuxSessionName = sanitizeSessionId(sessionId);
      // tmux new-session -A attaches to existing session or creates new one
      // -x and -s set initial size, -c sets working directory
      ptyProcess = pty.spawn(
        "tmux",
        [
          "new-session",
          "-A", // Attach if exists, create if not
          "-s",
          tmuxSessionName,
          "-c",
          cwd, // Set working directory for new sessions
        ],
        {
          name: "xterm-256color",
          cols: 80,
          rows: 24,
          cwd,
          env: process.env as Record<string, string>,
        }
      );
    } else {
      ptyProcess = pty.spawn(shell, [], {
        name: "xterm-256color",
        cols: 80,
        rows: 24,
        cwd,
        env: process.env as Record<string, string>,
      });
    }

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
      if (useTmux) {
        // For tmux sessions, just detach - don't kill the session
        // The pty process (tmux client) will exit, but the session persists
        ptyProcess.write("\x02d"); // Ctrl+B d to detach (but we use kill to close the client)
      }
      ptyProcess.kill();
    });
  });

  console.log("PTY WebSocket server running on /pty");
}
