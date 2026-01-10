import express, { Request, Response } from "express";
import { createServer } from "http";
import { setupPtyWebSocket } from "./pty.js";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello, World!" });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const server = createServer(app);
setupPtyWebSocket(server);

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
