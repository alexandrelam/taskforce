import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from "react";
import { Terminal, type TerminalHandle } from "./Terminal";
import type { Pane } from "@/types";

export interface TerminalManagerHandle {
  closeAll: () => void;
}

interface TerminalManagerProps {
  activeTaskIds: string[];
  currentTaskId: string | null;
  currentPane: string;
  panes: Pane[];
  defaultCwd?: string;
  taskCwdMap?: Record<string, string | null | undefined>;
  setupSessions?: Record<string, string | null | undefined>;
}

// Generate session ID in format {ticketId}-{paneName}
function getSessionId(taskId: string, paneName: string): string {
  return `${taskId}-${paneName}`;
}

export const TerminalManager = forwardRef<TerminalManagerHandle, TerminalManagerProps>(
  function TerminalManager(
    { activeTaskIds, currentTaskId, currentPane, panes, defaultCwd, taskCwdMap, setupSessions },
    ref
  ) {
    const terminalRefs = useRef<Map<string, TerminalHandle>>(new Map());

    const closeAll = useCallback(() => {
      terminalRefs.current.forEach((handle) => {
        handle.close();
      });
      terminalRefs.current.clear();
    }, []);

    useImperativeHandle(ref, () => ({
      closeAll,
    }));

    // Cleanup on page unload
    useEffect(() => {
      const handleBeforeUnload = () => {
        closeAll();
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
        closeAll();
      };
    }, [closeAll]);

    // Cleanup terminals for tasks that are no longer active
    useEffect(() => {
      const activeSet = new Set(activeTaskIds);
      terminalRefs.current.forEach((handle, sessionId) => {
        // Extract taskId from sessionId (format: {taskId}-{paneName})
        const taskId = sessionId.substring(0, sessionId.lastIndexOf("-"));
        if (!activeSet.has(taskId)) {
          handle.close();
          terminalRefs.current.delete(sessionId);
        }
      });
    }, [activeTaskIds]);

    // Build list of all pane names (claude + custom panes)
    const allPaneNames = useMemo(() => ["claude", ...panes.map((p) => p.name)], [panes]);

    return (
      <>
        {activeTaskIds.flatMap((taskId) => {
          const taskCwd = taskCwdMap?.[taskId] || defaultCwd;
          const setupSession = setupSessions?.[taskId];

          // Collect terminals for this task
          const terminals: React.ReactNode[] = [];

          // Handle setup pane if it exists
          if (setupSession) {
            const setupSessionId = setupSession;
            const isSetupVisible = taskId === currentTaskId && currentPane === "setup";

            terminals.push(
              <Terminal
                key={setupSessionId}
                ref={(handle) => {
                  if (handle) {
                    terminalRefs.current.set(setupSessionId, handle);
                  }
                }}
                visible={isSetupVisible}
                sessionId={setupSessionId}
                cwd={taskCwd}
              />
            );
          }

          // Handle regular panes
          allPaneNames.forEach((paneName) => {
            const sessionId = getSessionId(taskId, paneName);
            const isVisible = taskId === currentTaskId && paneName === currentPane;

            terminals.push(
              <Terminal
                key={sessionId}
                ref={(handle) => {
                  if (handle) {
                    terminalRefs.current.set(sessionId, handle);
                  }
                }}
                visible={isVisible}
                sessionId={sessionId}
                cwd={taskCwd}
              />
            );
          });

          return terminals;
        })}
      </>
    );
  }
);
