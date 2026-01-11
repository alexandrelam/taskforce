import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { Terminal, type TerminalHandle } from "./Terminal";

export interface TerminalManagerHandle {
  closeAll: () => void;
}

interface TerminalManagerProps {
  activeTaskIds: string[];
  currentTaskId: string | null;
  cwd?: string;
}

export const TerminalManager = forwardRef<TerminalManagerHandle, TerminalManagerProps>(
  function TerminalManager({ activeTaskIds, currentTaskId, cwd }, ref) {
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
      terminalRefs.current.forEach((handle, taskId) => {
        if (!activeSet.has(taskId)) {
          handle.close();
          terminalRefs.current.delete(taskId);
        }
      });
    }, [activeTaskIds]);

    return (
      <>
        {activeTaskIds.map((taskId) => (
          <Terminal
            key={taskId}
            ref={(handle) => {
              if (handle) {
                terminalRefs.current.set(taskId, handle);
              }
            }}
            visible={taskId === currentTaskId}
            sessionId={taskId}
            cwd={cwd}
          />
        ))}
      </>
    );
  }
);
