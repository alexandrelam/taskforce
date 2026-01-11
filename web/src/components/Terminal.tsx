import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { useTheme } from "next-themes";
import "@xterm/xterm/css/xterm.css";

const WS_BASE = "ws://localhost:3325";

const THEMES = {
  light: {
    background: "#ffffff",
    foreground: "#1a1a1a",
    cursor: "#1a1a1a",
  },
  dark: {
    background: "#1a1a1a",
    foreground: "#ffffff",
    cursor: "#ffffff",
  },
};

export interface TerminalHandle {
  close: () => void;
}

interface TerminalProps {
  visible?: boolean;
  sessionId?: string;
  cwd?: string;
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal(
  { visible = true, sessionId, cwd },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { resolvedTheme } = useTheme();

  useImperativeHandle(ref, () => ({
    close: () => {
      wsRef.current?.close();
      terminalRef.current?.dispose();
      wsRef.current = null;
      terminalRef.current = null;
    },
  }));

  // Update terminal theme when app theme changes
  useEffect(() => {
    if (terminalRef.current && resolvedTheme) {
      const themeColors = THEMES[resolvedTheme as keyof typeof THEMES] || THEMES.dark;
      terminalRef.current.options.theme = themeColors;
    }
  }, [resolvedTheme]);

  useEffect(() => {
    if (!containerRef.current) return;

    const themeColors = THEMES[resolvedTheme as keyof typeof THEMES] || THEMES.dark;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      theme: themeColors,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    const params = new URLSearchParams();
    if (cwd) {
      params.set("cwd", cwd);
    }
    if (sessionId) {
      params.set("sessionId", sessionId);
    }
    const queryString = params.toString();
    const wsUrl = queryString ? `${WS_BASE}/pty?${queryString}` : `${WS_BASE}/pty`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onerror = () => {
      term.write("\r\n[Connection error]\r\n");
    };

    ws.onclose = () => {
      term.write("\r\n[Connection closed]\r\n");
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    term.onResize(({ cols, rows }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
      term.dispose();
    };
  }, [cwd, sessionId, resolvedTheme]);

  // Refit terminal when visibility changes
  useEffect(() => {
    if (visible && fitAddonRef.current) {
      // Small delay to ensure container is visible before fitting
      const timeout = setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 10);
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full min-h-[300px] rounded-md overflow-hidden bg-background"
      style={{ display: visible ? "block" : "none" }}
    />
  );
});
