import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { TerminalManager, type TerminalManagerHandle } from "./TerminalManager";
import { TerminalTabs } from "./TerminalTabs";
import { SettingsDialog } from "./SettingsDialog";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  type UniqueIdentifier,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ChevronDown,
  Loader2,
  GitPullRequest,
  GitBranch,
  AlertCircle,
  Lock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface CommitInfo {
  hash: string;
  message: string;
}

const API_BASE = "http://localhost:3325";

type SetupStatus = "pending" | "creating_worktree" | "running_post_command" | "ready" | "failed";

interface Task {
  id: string;
  title: string;
  worktreePath?: string | null;
  isMain?: boolean | null;
  setupStatus?: SetupStatus;
  setupError?: string | null;
  setupLogs?: string | null;
  description?: string | null;
  statusOverride?: boolean | null;
}

interface Pane {
  name: string;
}

interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  panes: Pane[];
  editor: string | null;
}

type Columns = Record<UniqueIdentifier, Task[]>;

const COLUMN_ORDER = ["To Do", "In Progress", "Done"];

export function TaskBoard() {
  const [columns, setColumns] = useState<Columns>({
    "To Do": [],
    "In Progress": [],
    Done: [],
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([]);
  const [currentPane, setCurrentPane] = useState<string>("claude");
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const terminalManagerRef = useRef<TerminalManagerHandle>(null);
  const previousColumnsRef = useRef<Columns | null>(null);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  // Git state
  const [commitInfo, setCommitInfo] = useState<CommitInfo | null>(null);
  const [isPulling, setIsPulling] = useState(false);

  // Require 8px movement before drag starts - allows clicks to work
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch projects on mount
  const fetchProjects = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/projects`);
    const data: Project[] = await res.json();
    setProjects(data);
    return data;
  }, []);

  // Fetch commit info for selected project
  const fetchCommitInfo = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/commit`);
      if (res.ok) {
        const data: CommitInfo = await res.json();
        setCommitInfo(data);
      } else {
        setCommitInfo(null);
      }
    } catch {
      setCommitInfo(null);
    }
  }, []);

  // Load projects and selected project on mount
  useEffect(() => {
    const init = async () => {
      const projectList = await fetchProjects();
      // Load selected project from settings
      const settingsRes = await fetch(`${API_BASE}/api/settings/selected_project`);
      const settingsData = await settingsRes.json();
      if (settingsData.value) {
        const project = projectList.find((p) => p.id === settingsData.value);
        if (project) {
          setSelectedProject(project);
        }
      }
    };
    init();
  }, [fetchProjects]);

  // Fetch tickets when selected project changes, with polling
  useEffect(() => {
    if (!selectedProject) {
      setColumns({ "To Do": [], "In Progress": [], Done: [] });
      setCommitInfo(null);
      return;
    }

    const fetchTickets = () => {
      fetch(`${API_BASE}/api/tickets?projectId=${selectedProject.id}`)
        .then((res) => res.json())
        .then(
          (
            tickets: {
              id: string;
              title: string;
              column: string;
              worktreePath?: string | null;
              isMain?: boolean | null;
              setupStatus?: SetupStatus;
              setupError?: string | null;
              setupLogs?: string | null;
              description?: string | null;
              statusOverride?: boolean | null;
            }[]
          ) => {
            const newColumns: Columns = {
              "To Do": [],
              "In Progress": [],
              Done: [],
            };
            tickets.forEach((ticket) => {
              const col = newColumns[ticket.column];
              if (col) {
                col.push({
                  id: ticket.id,
                  title: ticket.title,
                  worktreePath: ticket.worktreePath,
                  isMain: ticket.isMain,
                  setupStatus: ticket.setupStatus,
                  setupError: ticket.setupError,
                  setupLogs: ticket.setupLogs,
                  description: ticket.description,
                  statusOverride: ticket.statusOverride,
                });
              }
            });
            setColumns(newColumns);
          }
        )
        .catch(console.error);
    };

    // Initial fetch
    fetchTickets();

    // Fetch commit info
    fetchCommitInfo(selectedProject.id);

    // Poll every 2 seconds for updates
    const intervalId = setInterval(fetchTickets, 2000);

    // Cleanup on unmount or project change
    return () => clearInterval(intervalId);
  }, [selectedProject, fetchCommitInfo]);

  const handleSelectProject = async (project: Project) => {
    setSelectedProject(project);
    setProjectDropdownOpen(false);
    // Close terminal panel when switching projects
    handleClosePanel();
    // Persist selection
    await fetch(`${API_BASE}/api/settings/selected_project`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: project.id }),
    });
  };

  const handleCardClick = (task: Task) => {
    setSelectedTask(task);
    // Reset to claude pane when clicking a new task
    setCurrentPane("claude");
    // Add to active terminals if not already present
    setActiveTaskIds((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]));
  };

  const handleClosePanel = useCallback(() => {
    // Close all terminal sessions when panel is closed
    terminalManagerRef.current?.closeAll();
    setActiveTaskIds([]);
    setSelectedTask(null);
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !selectedProject || isCreating) return;

    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTicketTitle.trim(),
          projectId: selectedProject.id,
          description: newTicketDescription.trim() || null,
        }),
      });
      const ticket = await res.json();
      setColumns((prev) => ({
        ...prev,
        "To Do": [
          ...prev["To Do"],
          {
            id: ticket.id,
            title: ticket.title,
            worktreePath: ticket.worktreePath,
            setupStatus: ticket.setupStatus,
            description: ticket.description,
          },
        ],
      }));
      setNewTicketTitle("");
      setNewTicketDescription("");
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to create ticket:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTicket = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setDeletingTicketId(taskId);
    try {
      await fetch(`${API_BASE}/api/tickets/${taskId}`, { method: "DELETE" });
      setColumns((prev) => {
        const newColumns: Columns = {};
        for (const [colId, tasks] of Object.entries(prev)) {
          newColumns[colId] = tasks.filter((t) => t.id !== taskId);
        }
        return newColumns;
      });
      // If deleted task was selected, close the panel
      if (selectedTask?.id === taskId) {
        handleClosePanel();
      }
    } catch (error) {
      console.error("Failed to delete ticket:", error);
    } finally {
      setDeletingTicketId(null);
    }
  };

  const handleClearOverride = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/tickets/${taskId}/clear-override`, { method: "PATCH" });
      setColumns((prev) => {
        const newColumns: Columns = {};
        for (const [colId, tasks] of Object.entries(prev)) {
          newColumns[colId] = tasks.map((t) =>
            t.id === taskId ? { ...t, statusOverride: false } : t
          );
        }
        return newColumns;
      });
      toast.success("Override cleared", {
        description: "Automatic status tracking re-enabled",
      });
    } catch (error) {
      console.error("Failed to clear override:", error);
    }
  };

  const handleOpenEditor = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/tickets/${taskId}/open-editor`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Editor opened", {
          description: "Opening project in your configured editor",
        });
      } else {
        toast.error("Failed to open editor", {
          description: data.error,
        });
      }
    } catch (error) {
      toast.error("Failed to open editor", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleColumnsChange = (newColumns: Columns) => {
    const prev = previousColumnsRef.current || columns;

    // Find task that moved columns
    for (const [colId, tasks] of Object.entries(newColumns)) {
      for (const task of tasks) {
        const wasInColumn = prev[colId]?.some((t) => t.id === task.id);
        if (!wasInColumn) {
          // Task moved to this column, persist to backend
          fetch(`${API_BASE}/api/tickets/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ column: colId }),
          }).catch(console.error);
          break;
        }
      }
    }

    previousColumnsRef.current = newColumns;
    setColumns(newColumns);
  };

  const handleProjectsChange = () => {
    fetchProjects();
  };

  const handlePull = async () => {
    if (!selectedProject || isPulling) return;

    setIsPulling(true);
    try {
      const res = await fetch(`${API_BASE}/api/projects/${selectedProject.id}/pull`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Git pull successful", {
          description: data.output?.trim() || "Repository updated",
        });
        // Refresh commit info after successful pull
        fetchCommitInfo(selectedProject.id);
      } else {
        toast.error("Git pull failed", {
          description: data.error,
        });
      }
    } catch (error) {
      toast.error("Git pull failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPulling(false);
    }
  };

  // Build a map of task IDs to their worktree paths for terminal cwd
  const taskCwdMap = useMemo(() => {
    const map: Record<string, string | null | undefined> = {};
    Object.values(columns)
      .flat()
      .forEach((task) => {
        if (task.worktreePath) {
          map[task.id] = task.worktreePath;
        }
      });
    return map;
  }, [columns]);

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

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Kanban Board */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src="/taskforce-logo.png" alt="Taskforce" className="h-5" />
            {/* Project Selector */}
            <div className="relative">
              <button
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
              >
                {selectedProject ? selectedProject.name : "Select Project"}
                <ChevronDown className="h-4 w-4" />
              </button>
              {projectDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-popover border rounded-md shadow-lg z-50">
                  {projects.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">
                      No projects. Create one in Settings.
                    </div>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleSelectProject(project)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                          selectedProject?.id === project.id ? "bg-accent" : ""
                        }`}
                      >
                        {project.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedProject && commitInfo && (
              <div className="flex-1 min-w-0 flex items-center text-sm text-muted-foreground">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {commitInfo.hash}
                </span>
                <span className="ml-2 truncate min-w-0">{commitInfo.message}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!selectedProject || isPulling}
              onClick={handlePull}
            >
              {isPulling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GitPullRequest className="h-4 w-4" />
              )}
              <span className="ml-1">Pull</span>
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!selectedProject}>
                  Add Ticket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Ticket</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <Input
                    placeholder="Ticket title"
                    value={newTicketTitle}
                    onChange={(e) => setNewTicketTitle(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newTicketDescription}
                    onChange={(e) => setNewTicketDescription(e.target.value)}
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                  />
                  <Button type="submit" className="w-full" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <ThemeToggle />
            <SettingsDialog onProjectsChange={handleProjectsChange} />
          </div>
        </div>

        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
            <p className="text-lg mb-2">No project selected</p>
            <p className="text-sm">Select a project from the dropdown or create one in Settings</p>
          </div>
        ) : (
          <Kanban
            value={columns}
            onValueChange={handleColumnsChange}
            getItemValue={(item) => item.id}
            sensors={sensors}
          >
            <KanbanBoard>
              {COLUMN_ORDER.map((columnId) => {
                const tasks = columns[columnId] || [];
                return (
                  <KanbanColumn key={columnId} value={columnId} className="w-80 shrink-0">
                    <div className="font-semibold text-muted-foreground mb-2 px-1">
                      {columnId}
                      <span className="ml-2 text-zinc-500 text-sm">{tasks.length}</span>
                    </div>
                    {tasks.map((task) => {
                      const isSetupInProgress =
                        task.setupStatus === "pending" ||
                        task.setupStatus === "creating_worktree" ||
                        task.setupStatus === "running_post_command";
                      const isSetupFailed = task.setupStatus === "failed";
                      const hasOverride = task.statusOverride === true;

                      const getStatusText = () => {
                        switch (task.setupStatus) {
                          case "pending":
                            return "Setting up...";
                          case "creating_worktree":
                            return "Creating worktree...";
                          case "running_post_command":
                            return "Installing dependencies...";
                          default:
                            return "";
                        }
                      };

                      return (
                        <KanbanItem
                          key={task.id}
                          value={task.id}
                          asHandle
                          onClick={() => handleCardClick(task)}
                          className={`group p-3 bg-card rounded-md border transition-colors ${
                            isSetupFailed
                              ? "border-destructive/50 hover:border-destructive"
                              : hasOverride
                                ? "border-amber-500/50 hover:border-amber-500"
                                : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              {isSetupInProgress && (
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                              )}
                              {isSetupFailed && (
                                <AlertCircle className="h-3 w-3 text-destructive" />
                              )}
                              {task.isMain && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                                  <GitBranch className="h-3 w-3" />
                                  main
                                </span>
                              )}
                              {!task.isMain && task.title}
                            </div>
                            <div className="flex items-center gap-1">
                              {selectedProject?.editor && !isSetupInProgress && !isSetupFailed && (
                                <button
                                  onClick={(e) => handleOpenEditor(e, task.id)}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary p-1 transition-opacity"
                                  title="Open in editor"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {hasOverride && (
                                <button
                                  onClick={(e) => handleClearOverride(e, task.id)}
                                  className="text-amber-500 hover:text-amber-600 p-1 transition-colors"
                                  title="Manual status - click to re-enable automatic tracking"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {!task.isMain && (
                                <button
                                  onClick={(e) => handleDeleteTicket(e, task.id)}
                                  disabled={deletingTicketId === task.id}
                                  className={`p-1 transition-opacity ${
                                    deletingTicketId === task.id
                                      ? "opacity-100 text-muted-foreground cursor-not-allowed"
                                      : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                  }`}
                                >
                                  {deletingTicketId === task.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M3 6h18" />
                                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                    </svg>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          {task.description && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </div>
                          )}
                          {isSetupInProgress && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {getStatusText()}
                            </div>
                          )}
                          {isSetupFailed && (
                            <div className="text-xs text-destructive mt-1">Setup failed</div>
                          )}
                        </KanbanItem>
                      );
                    })}
                  </KanbanColumn>
                );
              })}
            </KanbanBoard>
            <KanbanOverlay>
              {({ value, variant }) => {
                if (variant === "column") {
                  return (
                    <div className="w-80 p-3 bg-card rounded-lg border border-border opacity-90">
                      {value}
                    </div>
                  );
                }
                const task = Object.values(columns)
                  .flat()
                  .find((t) => t.id === value);
                return (
                  <div className="p-3 bg-card rounded-md border border-border opacity-90">
                    {task?.title}
                  </div>
                );
              }}
            </KanbanOverlay>
          </Kanban>
        )}
      </div>

      {/* Terminal Panel */}
      {selectedTask &&
        (() => {
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

          return (
            <div className="w-[600px] border-l border-border flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <div className="text-sm text-muted-foreground">{getPanelTitle()}</div>
                  <div className="font-medium">{selectedTask.title}</div>
                </div>
                <button
                  onClick={handleClosePanel}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
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
              {isTaskReady && selectedProject && selectedProject.panes.length > 0 && (
                <TerminalTabs
                  panes={selectedProject.panes}
                  activePane={currentPane}
                  onPaneChange={setCurrentPane}
                />
              )}
              <div className="flex-1 p-4 overflow-auto">
                {isTaskReady && (
                  <TerminalManager
                    ref={terminalManagerRef}
                    activeTaskIds={activeTaskIds}
                    currentTaskId={selectedTask.id}
                    currentPane={currentPane}
                    panes={selectedProject?.panes ?? []}
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
        })()}
    </div>
  );
}
