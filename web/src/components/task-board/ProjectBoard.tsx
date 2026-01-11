import { useState, useEffect } from "react";
import { Loader2, GitPullRequest } from "lucide-react";
import { toast } from "sonner";
import { Kanban, KanbanBoard, KanbanColumn, KanbanOverlay } from "@/components/ui/kanban";
import { Button } from "@/components/ui/button";
import { MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";

import { useTickets } from "@/hooks/useTickets";
import { useGitOperations } from "@/hooks/useGitOperations";
import { ticketsApi } from "@/lib/api";

import { TicketCard } from "./TicketCard";
import { DeleteTicketDialog } from "./dialogs/DeleteTicketDialog";
import { CreateTicketDialog } from "./dialogs/CreateTicketDialog";
import { OpenBranchDialog } from "./dialogs/OpenBranchDialog";

import type { Project, Task, Columns } from "@/types";

const COLUMN_ORDER = ["To Do", "In Progress", "Done"];

interface ProjectBoardProps {
  project: Project;
  onOpenTask: (task: Task, projectId: string) => void;
  onColumnsChange?: (columns: Columns) => void;
}

export function ProjectBoard({ project, onOpenTask, onColumnsChange }: ProjectBoardProps) {
  const {
    columns,
    columnEnteredAt,
    createTicket,
    createFromBranch,
    deleteTicket,
    clearOverride,
    handleColumnsChange,
  } = useTickets(project.id);

  const { commitInfo, isPulling, pull } = useGitOperations(project.id);

  // Local UI state
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Task | null>(null);

  // Require 8px movement before drag starts - allows clicks to work
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  );

  // Notify parent whenever columns change (from polling or drag)
  useEffect(() => {
    onColumnsChange?.(columns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

  // Handle drag changes (updates local state + notifies parent)
  const wrappedHandleColumnsChange = (newColumns: Columns) => {
    handleColumnsChange(newColumns);
  };

  // Handlers
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
    <div className="border rounded-lg p-4 pb-6 bg-card">
      {/* Per-Board Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="font-semibold shrink-0">{project.name}</h2>
          {commitInfo && (
            <div className="flex items-center text-sm text-muted-foreground min-w-0">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                {commitInfo.hash}
              </span>
              <span className="ml-2 truncate min-w-0">{commitInfo.message}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" disabled={isPulling} onClick={pull}>
            {isPulling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitPullRequest className="h-4 w-4" />
            )}
            <span className="ml-1">Pull</span>
          </Button>
          <CreateTicketDialog onSubmit={handleCreateTicket} />
          <OpenBranchDialog onSubmit={handleOpenBranch} />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto">
        <Kanban
          value={columns}
          onValueChange={wrappedHandleColumnsChange}
          getItemValue={(item) => item.id}
          sensors={sensors}
        >
          <KanbanBoard className="items-stretch min-h-[200px]">
            {COLUMN_ORDER.map((columnId) => {
              const tasks = columns[columnId] || [];
              return (
                <KanbanColumn key={columnId} value={columnId} className="w-72 shrink-0 h-auto">
                  <div className="font-semibold text-muted-foreground mb-2 px-1">
                    {columnId}
                    <span className="ml-2 text-zinc-500 text-sm">{tasks.length}</span>
                  </div>
                  {tasks.map((task) => (
                    <TicketCard
                      key={task.id}
                      task={task}
                      columnEnteredAt={columnEnteredAt[task.id]}
                      hasEditor={!!project.editor}
                      isDeleting={deletingTicketId === task.id}
                      onClick={() => onOpenTask(task, project.id)}
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
                  <div className="w-72 p-3 bg-card rounded-lg border border-border opacity-90">
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
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteTicketDialog
        ticket={ticketToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTicketToDelete(null)}
      />
    </div>
  );
}
