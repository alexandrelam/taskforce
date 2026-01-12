import { useMemo } from "react";
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
  const hasSetupSession = !!selectedTask.setupTmuxSession;
  const isRunningPostCommand = selectedTask.setupStatus === "running_post_command";

  // Show terminal when ready OR when we have a setup session to display
  const showTerminal = isTaskReady || (hasSetupSession && (isRunningPostCommand || isTaskFailed));

  // Show tabs when terminal is shown and project exists
  const showTabs = showTerminal && selectedProject;

  // In-progress states without a setup session (worktree creation)
  const isTaskInProgressNoTerminal =
    selectedTask.setupStatus === "pending" ||
    selectedTask.setupStatus === "creating_worktree" ||
    (selectedTask.setupStatus === "running_post_command" && !hasSetupSession);

  // Build setupSessions map for TerminalManager
  const setupSessions = useMemo(() => {
    const map: Record<string, string | null | undefined> = {};
    if (selectedTask.setupTmuxSession) {
      map[selectedTask.id] = selectedTask.setupTmuxSession;
    }
    return map;
  }, [selectedTask.id, selectedTask.setupTmuxSession]);

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
      {showTabs && (panes.length > 0 || hasSetupSession) && (
        <TerminalTabs
          panes={panes}
          activePane={currentPane}
          onPaneChange={onPaneChange}
          setupSession={selectedTask.setupTmuxSession}
          setupStatus={selectedTask.setupStatus}
        />
      )}
      <div className="flex-1 p-4 overflow-auto">
        {showTerminal && (
          <TerminalManager
            ref={terminalManagerRef}
            activeTaskIds={activeTaskIds}
            currentTaskId={selectedTask.id}
            currentPane={currentPane}
            panes={panes}
            defaultCwd={selectedProject?.path}
            taskCwdMap={taskCwdMap}
            setupSessions={setupSessions}
          />
        )}
        {isTaskInProgressNoTerminal && (
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
      </div>
    </div>
  );
}
