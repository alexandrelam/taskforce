import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
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
    // Track which sessions have been activated (for lazy creation)
    const activatedSessions = useRef<Set<string>>(new Set());
    const terminalRefs = useRef<Map<string, TerminalHandle>>(new Map());

    const closeAll = useCallback(() => {
      terminalRefs.current.forEach((handle) => {
        handle.close();
      });
      terminalRefs.current.clear();
      activatedSessions.current.clear();
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
          activatedSessions.current.delete(sessionId);
        }
      });
    }, [activeTaskIds]);

    // Mark current session as activated when it becomes visible
    useEffect(() => {
      if (currentTaskId && currentPane) {
        const sessionId = getSessionId(currentTaskId, currentPane);
        activatedSessions.current.add(sessionId);
      }
    }, [currentTaskId, currentPane]);

    // Build list of all pane names (claude + custom panes)
    const allPaneNames = ["claude", ...panes.map((p) => p.name)];

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
            const isSetupActivated = activatedSessions.current.has(setupSessionId);

            if (isSetupActivated || isSetupVisible) {
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
          }

          // Handle regular panes
          allPaneNames.forEach((paneName) => {
            const sessionId = getSessionId(taskId, paneName);
            const isVisible = taskId === currentTaskId && paneName === currentPane;
            const isActivated = activatedSessions.current.has(sessionId);

            // Lazy creation: only render terminal if it has been activated
            if (!isActivated && !isVisible) {
              return;
            }

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
