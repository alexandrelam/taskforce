import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const API_BASE = "http://localhost:3000";
const WS_BASE = "ws://localhost:3000";

export function Terminal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/project_path`)
      .then((res) => res.json())
      .then((data) => setProjectPath(data.value))
      .catch(() => setProjectPath(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || !containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      theme: {
        background: "#1a1a1a",
        foreground: "#ffffff",
        cursor: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;

    const wsUrl = projectPath
      ? `${WS_BASE}/pty?cwd=${encodeURIComponent(projectPath)}`
      : `${WS_BASE}/pty`;

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
  }, [loading, projectPath]);

  if (loading) {
    return (
      <div className="h-full w-full min-h-[300px] bg-[#1a1a1a] rounded-md flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full min-h-[300px] bg-[#1a1a1a] rounded-md overflow-hidden"
    />
  );
}
