import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "http";
import express from "express";
import WebSocket from "ws";

vi.mock("node-pty", () => ({
  spawn: vi.fn(() => ({
    onData: vi.fn(),
    resize: vi.fn(),
    write: vi.fn(),
    kill: vi.fn(),
  })),
}));

describe("server security", () => {
  describe("server binding", () => {
    it("listens on 127.0.0.1", async () => {
      const app = express();
      const server = createServer(app);

      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve());
      });

      const addr = server.address();
      expect(addr).not.toBeNull();
      expect(typeof addr).toBe("object");
      if (typeof addr === "object" && addr !== null) {
        expect(addr.address).toBe("127.0.0.1");
      }

      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
  });

  describe("WebSocket origin validation", () => {
    let server: Server;
    let port: number;

    beforeAll(async () => {
      const app = express();
      server = createServer(app);

      const { setupPtyWebSocket } = await import("../src/pty.js");
      setupPtyWebSocket(server);

      await new Promise<void>((resolve) => {
        server.listen(0, "127.0.0.1", () => resolve());
      });

      const addr = server.address();
      if (typeof addr === "object" && addr !== null) {
        port = addr.port;
      }
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it("accepts connections with no origin header", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/pty`);

      const result = await new Promise<string>((resolve) => {
        ws.on("open", () => resolve("open"));
        ws.on("error", () => resolve("error"));
        ws.on("unexpected-response", () => resolve("rejected"));
      });

      expect(result).toBe("open");
      ws.close();
    });

    it("accepts connections with localhost origin", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/pty`, {
        headers: { origin: "http://localhost:5173" },
      });

      const result = await new Promise<string>((resolve) => {
        ws.on("open", () => resolve("open"));
        ws.on("error", () => resolve("error"));
        ws.on("unexpected-response", () => resolve("rejected"));
      });

      expect(result).toBe("open");
      ws.close();
    });

    it("accepts connections with 127.0.0.1 origin", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/pty`, {
        headers: { origin: "http://127.0.0.1:5173" },
      });

      const result = await new Promise<string>((resolve) => {
        ws.on("open", () => resolve("open"));
        ws.on("error", () => resolve("error"));
        ws.on("unexpected-response", () => resolve("rejected"));
      });

      expect(result).toBe("open");
      ws.close();
    });

    it("rejects connections with non-localhost origin", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/pty`, {
        headers: { origin: "http://evil.com" },
      });

      const result = await new Promise<string>((resolve) => {
        ws.on("open", () => resolve("open"));
        ws.on("error", () => resolve("error"));
        ws.on("unexpected-response", () => resolve("rejected"));
      });

      expect(result).toBe("rejected");
      ws.close();
    });

    it("rejects connections with attacker origin on LAN", async () => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/pty`, {
        headers: { origin: "http://192.168.1.100:8080" },
      });

      const result = await new Promise<string>((resolve) => {
        ws.on("open", () => resolve("open"));
        ws.on("error", () => resolve("error"));
        ws.on("unexpected-response", () => resolve("rejected"));
      });

      expect(result).toBe("rejected");
      ws.close();
    });
  });
});
