"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.tmuxAvailable = void 0;
exports.sanitizeSessionId = sanitizeSessionId;
exports.killTmuxSession = killTmuxSession;
exports.setupPtyWebSocket = setupPtyWebSocket;
const ws_1 = require("ws");
const pty = __importStar(require("node-pty"));
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "/bin/zsh";
// Detect tmux availability at module load
function detectTmux() {
    if (process.platform === "win32")
        return false;
    try {
        (0, child_process_1.execSync)("which tmux", { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
exports.tmuxAvailable = detectTmux();
if (exports.tmuxAvailable) {
    console.log("tmux detected - session persistence enabled");
}
else {
    console.log("tmux not found - session persistence disabled");
}
function getValidCwd(requestedCwd) {
    const fallback = process.env.HOME || process.cwd();
    if (!requestedCwd)
        return fallback;
    return (0, fs_1.existsSync)(requestedCwd) ? requestedCwd : fallback;
}
// Sanitize session ID to be safe for tmux session names
function sanitizeSessionId(sessionId) {
    // tmux session names can't contain periods or colons
    return sessionId.replace(/[.:]/g, "-");
}
// Kill all tmux sessions for a ticket (including pane sessions)
// Sessions are named {ticketId}-{paneName} (e.g., abc123-claude, abc123-frontend)
function killTmuxSession(ticketId) {
    if (!exports.tmuxAvailable)
        return;
    const sanitizedId = sanitizeSessionId(ticketId);
    try {
        // List all sessions and filter those starting with the ticketId prefix
        const output = (0, child_process_1.execSync)("tmux list-sessions -F '#{session_name}'", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "ignore"],
        });
        const sessions = output.trim().split("\n").filter(Boolean);
        for (const session of sessions) {
            // Match sessions that start with the ticketId (handles both old single-session
            // format and new {ticketId}-{paneName} format)
            if (session === sanitizedId || session.startsWith(`${sanitizedId}-`)) {
                try {
                    (0, child_process_1.execSync)(`tmux kill-session -t "${session}"`, { stdio: "ignore" });
                }
                catch {
                    // Session may have been killed already - ignore
                }
            }
        }
    }
    catch {
        // tmux list-sessions fails if no sessions exist - ignore
    }
}
function setupPtyWebSocket(server) {
    const wss = new ws_1.WebSocketServer({ server, path: "/pty" });
    wss.on("connection", (ws, req) => {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const requestedCwd = url.searchParams.get("cwd");
        const sessionId = url.searchParams.get("sessionId");
        const cwd = getValidCwd(requestedCwd);
        // Use tmux if available and sessionId is provided
        const useTmux = exports.tmuxAvailable && sessionId;
        let ptyProcess;
        if (useTmux) {
            const tmuxSessionName = sanitizeSessionId(sessionId);
            // tmux new-session -A attaches to existing session or creates new one
            // -x and -s set initial size, -c sets working directory
            ptyProcess = pty.spawn("tmux", [
                "new-session",
                "-A", // Attach if exists, create if not
                "-s",
                tmuxSessionName,
                "-c",
                cwd, // Set working directory for new sessions
            ], {
                name: "xterm-256color",
                cols: 80,
                rows: 24,
                cwd,
                env: process.env,
            });
        }
        else {
            ptyProcess = pty.spawn(shell, [], {
                name: "xterm-256color",
                cols: 80,
                rows: 24,
                cwd,
                env: process.env,
            });
        }
        ptyProcess.onData((data) => {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(data);
            }
        });
        ws.on("message", (message) => {
            const msg = message.toString();
            try {
                const parsed = JSON.parse(msg);
                if (parsed.type === "resize" && parsed.cols && parsed.rows) {
                    ptyProcess.resize(parsed.cols, parsed.rows);
                    return;
                }
            }
            catch {
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
//# sourceMappingURL=pty.js.map