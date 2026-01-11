import { useState, useMemo } from "react";
import { Kanban, KanbanBoard, KanbanColumn, KanbanOverlay } from "@/components/ui/kanban";
import { MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { toast } from "sonner";

import { useProjects } from "@/hooks/useProjects";
import { useTickets } from "@/hooks/useTickets";
import { useGitOperations } from "@/hooks/useGitOperations";
import { useTerminalPanel } from "@/hooks/useTerminalPanel";
import { useTimer } from "@/hooks/useTimer";
import { ticketsApi } from "@/lib/api";

import { TaskBoardHeader, TerminalPanel, TicketCard, DeleteTicketDialog } from "./task-board";

import type { Task } from "@/types";

const COLUMN_ORDER = ["To Do", "In Progress", "Done"];

export function TaskBoard() {
  // Custom hooks
  const {
    projects,
    selectedProject,
    projectDropdownOpen,
    setProjectDropdownOpen,
    fetchProjects,
    selectProject,
  } = useProjects();

  const {
    columns,
    columnEnteredAt,
    createTicket,
    createFromBranch,
    deleteTicket,
    clearOverride,
    handleColumnsChange,
  } = useTickets(selectedProject?.id ?? null);

  const { commitInfo, isPulling, pull } = useGitOperations(selectedProject?.id ?? null);

  const {
    selectedTask,
    activeTaskIds,
    currentPane,
    setCurrentPane,
    terminalManagerRef,
    openTask,
    closePanel,
  } = useTerminalPanel(columns);

  useTimer();

  // Local UI state
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Task | null>(null);

  // Require 8px movement before drag starts - allows clicks to work
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  );

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

  // Handlers
  const handleSelectProject = (project: typeof selectedProject) => {
    if (project) {
      selectProject(project, closePanel);
    }
  };

  const handleCreateTicket = async (title: string, description: string) => {
    await createTicket(title, description);
  };

  const handleOpenBranch = async (branchName: string, description: string) => {
    await createFromBranch(branchName, description);
  };

  const handleDeleteTicketClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setTicketToDelete(task);
  };

  const handleConfirmDelete = async () => {
    if (!ticketToDelete) return;

    const taskId = ticketToDelete.id;
    setDeletingTicketId(taskId);
    try {
      await deleteTicket(taskId);
      if (selectedTask?.id === taskId) {
        closePanel();
      }
    } catch (error) {
      console.error("Failed to delete ticket:", error);
    } finally {
      setDeletingTicketId(null);
      setTicketToDelete(null);
    }
  };

  const handleClearOverride = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    await clearOverride(taskId);
  };

  const handleOpenEditor = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      const data = await ticketsApi.openEditor(taskId);
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

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Kanban Board */}
      <div className="flex-1 p-6 overflow-auto">
        <TaskBoardHeader
          projects={projects}
          selectedProject={selectedProject}
          projectDropdownOpen={projectDropdownOpen}
          commitInfo={commitInfo}
          isPulling={isPulling}
          onProjectDropdownToggle={() => setProjectDropdownOpen(!projectDropdownOpen)}
          onSelectProject={handleSelectProject}
          onPull={pull}
          onCreateTicket={handleCreateTicket}
          onOpenBranch={handleOpenBranch}
          onProjectsChange={fetchProjects}
        />

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
                    {tasks.map((task) => (
                      <TicketCard
                        key={task.id}
                        task={task}
                        columnEnteredAt={columnEnteredAt[task.id]}
                        hasEditor={!!selectedProject?.editor}
                        isDeleting={deletingTicketId === task.id}
                        onClick={() => openTask(task)}
                        onDelete={(e) => handleDeleteTicketClick(e, task)}
                        onClearOverride={(e) => handleClearOverride(e, task.id)}
                        onOpenEditor={(e) => handleOpenEditor(e, task.id)}
                      />
                    ))}
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
      {selectedTask && (
        <TerminalPanel
          selectedTask={selectedTask}
          selectedProject={selectedProject}
          currentPane={currentPane}
          activeTaskIds={activeTaskIds}
          taskCwdMap={taskCwdMap}
          terminalManagerRef={terminalManagerRef}
          onPaneChange={setCurrentPane}
          onClose={closePanel}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteTicketDialog
        ticket={ticketToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTicketToDelete(null)}
      />
    </div>
  );
}
