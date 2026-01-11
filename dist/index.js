"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const pty_js_1 = require("./pty.js");
const settings_js_1 = __importDefault(require("./routes/settings.js"));
const projects_js_1 = __importDefault(require("./routes/projects.js"));
const tickets_js_1 = __importDefault(require("./routes/tickets.js"));
const tracking_js_1 = __importDefault(require("./routes/tracking.js"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const port = process.env.PORT || 3325;
app.use(express_1.default.json());
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
app.get("/api/tmux/status", (_req, res) => {
    res.json({ available: pty_js_1.tmuxAvailable });
});
// Mount routers
app.use("/api/settings", settings_js_1.default);
app.use("/api/projects", projects_js_1.default);
app.use("/api/tickets/track", tracking_js_1.default); // Mount before /api/tickets
app.use("/api/tickets", tickets_js_1.default);
// Serve static files from web/dist (frontend build)
app.use(express_1.default.static(path_1.default.join(__dirname, "../web/dist")));
// SPA fallback - serve index.html for all non-API routes
app.get("/{*splat}", (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../web/dist/index.html"));
});
const server = (0, http_1.createServer)(app);
(0, pty_js_1.setupPtyWebSocket)(server);
server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map