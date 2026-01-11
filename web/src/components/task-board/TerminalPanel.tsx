import { Loader2, AlertCircle } from "lucide-react";
import { TerminalManager, type TerminalManagerHandle } from "@/components/TerminalManager";
import { TerminalTabs } from "@/components/TerminalTabs";
import type { Task, Project, Pane } from "@/types";

interface TerminalPanelProps {
  selectedTask: Task;
  selectedProject: Project | null;
  currentPane: string;
  activeTaskIds: string[];
  taskCwdMap: Record<string, string | null | undefined>;
  terminalManagerRef: React.RefObject<TerminalManagerHandle | null>;
  onPaneChange: (pane: string) => void;
  onClose: () => void;
}

export function TerminalPanel({
  selectedTask,
  selectedProject,
  currentPane,
  activeTaskIds,
  taskCwdMap,
  terminalManagerRef,
  onPaneChange,
  onClose,
}: TerminalPanelProps) {
  const isTaskReady = !selectedTask.setupStatus || selectedTask.setupStatus === "ready";
  const isTaskFailed = selectedTask.setupStatus === "failed";
  const isTaskInProgress =
    selectedTask.setupStatus === "pending" ||
    selectedTask.setupStatus === "creating_worktree" ||
    selectedTask.setupStatus === "running_post_command";

  const getPanelTitle = () => {
    if (isTaskReady) return "Terminal";
    if (isTaskFailed) return "Setup Failed";
    return "Setting Up";
  };

  const getProgressText = () => {
    switch (selectedTask.setupStatus) {
      case "pending":
        return "Preparing setup...";
      case "creating_worktree":
        return "Creating git worktree...";
      case "running_post_command":
        return "Running post-worktree command (e.g., npm install)...";
      default:
        return "";
    }
  };

  const panes: Pane[] = selectedProject?.panes ?? [];

  return (
    <div className="w-[600px] border-l border-border flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <div className="text-sm text-muted-foreground">{getPanelTitle()}</div>
          <div className="font-medium">{selectedTask.title}</div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      {isTaskReady && selectedProject && panes.length > 0 && (
        <TerminalTabs panes={panes} activePane={currentPane} onPaneChange={onPaneChange} />
      )}
      <div className="flex-1 p-4 overflow-auto">
        {isTaskReady && (
          <TerminalManager
            ref={terminalManagerRef}
            activeTaskIds={activeTaskIds}
            currentTaskId={selectedTask.id}
            currentPane={currentPane}
            panes={panes}
            defaultCwd={selectedProject?.path}
            taskCwdMap={taskCwdMap}
          />
        )}
        {isTaskInProgress && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium mb-2">{getProgressText()}</p>
            <p className="text-sm text-muted-foreground">
              This may take a few minutes. You can continue using the app.
            </p>
            {selectedTask.setupLogs && (
              <div className="mt-4 w-full">
                <div className="text-xs text-muted-foreground mb-2 text-left">Output:</div>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64 text-left whitespace-pre-wrap">
                  {selectedTask.setupLogs}
                </pre>
              </div>
            )}
          </div>
        )}
        {isTaskFailed && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Setup Failed</span>
            </div>
            {selectedTask.setupError && (
              <div className="mb-4">
                <div className="text-xs text-muted-foreground mb-2">Error:</div>
                <pre className="text-sm bg-destructive/10 text-destructive p-3 rounded-md overflow-auto whitespace-pre-wrap">
                  {selectedTask.setupError}
                </pre>
              </div>
            )}
            {selectedTask.setupLogs && (
              <div className="flex-1">
                <div className="text-xs text-muted-foreground mb-2">Output:</div>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64 whitespace-pre-wrap">
                  {selectedTask.setupLogs}
                </pre>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              You can delete this ticket and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
