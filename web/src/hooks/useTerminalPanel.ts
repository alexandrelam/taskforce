import { useState, useCallback, useRef, useEffect } from "react";
import type { TerminalManagerHandle } from "@/components/TerminalManager";
import type { Task, Columns } from "@/types";

export function useTerminalPanel(columns: Columns) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([]);
  const [currentPane, setCurrentPane] = useState<string>("claude");
  const terminalManagerRef = useRef<TerminalManagerHandle>(null);

  const openTask = useCallback((task: Task) => {
    setSelectedTask(task);
    setCurrentPane("claude");
    setActiveTaskIds((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]));
  }, []);

  const closePanel = useCallback(() => {
    terminalManagerRef.current?.closeAll();
    setActiveTaskIds([]);
    setSelectedTask(null);
  }, []);

  // Keep selectedTask in sync with columns data (for updated setupStatus, etc.)
  useEffect(() => {
    if (selectedTask) {
      const updatedTask = Object.values(columns)
        .flat()
        .find((t) => t.id === selectedTask.id);
      if (
        updatedTask &&
        (updatedTask.setupStatus !== selectedTask.setupStatus ||
          updatedTask.setupError !== selectedTask.setupError ||
          updatedTask.setupLogs !== selectedTask.setupLogs ||
          updatedTask.worktreePath !== selectedTask.worktreePath)
      ) {
        setSelectedTask(updatedTask);
      }
    }
  }, [columns, selectedTask]);

  return {
    selectedTask,
    setSelectedTask,
    activeTaskIds,
    currentPane,
    setCurrentPane,
    terminalManagerRef,
    openTask,
    closePanel,
  };
}
