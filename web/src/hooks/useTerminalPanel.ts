import { useState, useCallback, useRef } from "react";
import type { TerminalManagerHandle } from "@/components/TerminalManager";
import type { Task, Columns } from "@/types";

interface SelectedTaskInfo {
  task: Task;
  projectId: string;
}

export function useTerminalPanel() {
  const [selectedTaskInfo, setSelectedTaskInfo] = useState<SelectedTaskInfo | null>(null);
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([]);
  const [currentPane, setCurrentPane] = useState<string>("claude");
  const terminalManagerRef = useRef<TerminalManagerHandle>(null);

  const openTask = useCallback((task: Task, projectId: string) => {
    setSelectedTaskInfo({ task, projectId });
    // Auto-switch to setup tab if setup is running with a tmux session
    if (task.setupTmuxSession && task.setupStatus === "running_post_command") {
      setCurrentPane("setup");
    } else {
      setCurrentPane("claude");
    }
    setActiveTaskIds((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]));
  }, []);

  const closePanel = useCallback(() => {
    terminalManagerRef.current?.closeAll();
    setActiveTaskIds([]);
    setSelectedTaskInfo(null);
  }, []);

  // Update selected task when columns change (called from each ProjectBoard)
  const updateTaskFromColumns = useCallback(
    (columns: Columns) => {
      if (!selectedTaskInfo) return;

      const updatedTask = Object.values(columns)
        .flat()
        .find((t) => t.id === selectedTaskInfo.task.id);

      if (
        updatedTask &&
        (updatedTask.setupStatus !== selectedTaskInfo.task.setupStatus ||
          updatedTask.setupError !== selectedTaskInfo.task.setupError ||
          updatedTask.setupLogs !== selectedTaskInfo.task.setupLogs ||
          updatedTask.setupTmuxSession !== selectedTaskInfo.task.setupTmuxSession ||
          updatedTask.worktreePath !== selectedTaskInfo.task.worktreePath)
      ) {
        setSelectedTaskInfo({ ...selectedTaskInfo, task: updatedTask });
      }
    },
    [selectedTaskInfo]
  );

  return {
    selectedTask: selectedTaskInfo?.task ?? null,
    selectedProjectId: selectedTaskInfo?.projectId ?? null,
    activeTaskIds,
    currentPane,
    setCurrentPane,
    terminalManagerRef,
    openTask,
    closePanel,
    updateTaskFromColumns,
  };
}
