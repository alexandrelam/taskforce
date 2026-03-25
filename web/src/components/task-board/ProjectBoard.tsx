import { useReducer, useState } from "react";
import { Loader2, GitPullRequest, MoreVertical, Plus, GitBranch } from "lucide-react";
import { usePrAutoFill } from "@/hooks/usePrAutoFill";
import { toast } from "sonner";
import { Kanban, KanbanBoard, KanbanColumn, KanbanOverlay } from "@/components/ui/kanban";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";

import { useGitOperations } from "@/hooks/useGitOperations";
import { usePrSuggestions, type PrSuggestion } from "@/hooks/usePrSuggestions";
import { ticketsApi } from "@/lib/api";

import { TicketCard } from "./TicketCard";
import { DeleteTicketDialog } from "./dialogs/DeleteTicketDialog";
import { EditTicketDialog } from "./dialogs/EditTicketDialog";

import type { Project, Task, Columns } from "@/types";

const COLUMN_ORDER = ["To Do", "In Progress", "Done"];

const COLUMN_COLORS: Record<string, string> = {
  "To Do": "bg-zinc-400",
  "In Progress": "bg-blue-500",
  Done: "bg-green-500",
};

// Controlled dialog components for mobile menu
interface ControlledCreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPostCommand?: boolean;
  onSubmit: (
    title: string,
    description: string,
    runPostCommand: boolean,
    prLink?: string,
    baseBranch?: string
  ) => Promise<void>;
}

interface ControlledCreateTicketDialogState {
  title: string;
  description: string;
  prLink: string;
  baseBranch: string;
  runPostCommand: boolean;
  isCreating: boolean;
}

type ControlledCreateTicketDialogAction =
  | { type: "setTitle"; value: string }
  | { type: "setDescription"; value: string }
  | { type: "setPrLink"; value: string }
  | { type: "setBaseBranch"; value: string }
  | { type: "setRunPostCommand"; value: boolean }
  | { type: "startCreating" }
  | { type: "finishCreating" }
  | { type: "reset" };

const initialControlledCreateTicketDialogState: ControlledCreateTicketDialogState = {
  title: "",
  description: "",
  prLink: "",
  baseBranch: "",
  runPostCommand: true,
  isCreating: false,
};

function controlledCreateTicketDialogReducer(
  state: ControlledCreateTicketDialogState,
  action: ControlledCreateTicketDialogAction
): ControlledCreateTicketDialogState {
  switch (action.type) {
    case "setTitle":
      return { ...state, title: action.value };
    case "setDescription":
      return { ...state, description: action.value };
    case "setPrLink":
      return { ...state, prLink: action.value };
    case "setBaseBranch":
      return { ...state, baseBranch: action.value };
    case "setRunPostCommand":
      return { ...state, runPostCommand: action.value };
    case "startCreating":
      return { ...state, isCreating: true };
    case "finishCreating":
      return { ...state, isCreating: false };
    case "reset":
      return initialControlledCreateTicketDialogState;
    default:
      return state;
  }
}

function ControlledCreateTicketDialog({
  open,
  onOpenChange,
  hasPostCommand,
  onSubmit,
}: ControlledCreateTicketDialogProps) {
  const [state, dispatch] = useReducer(
    controlledCreateTicketDialogReducer,
    initialControlledCreateTicketDialogState
  );
  const { isFetchingPr, handlePrLinkPaste } = usePrAutoFill({
    title: state.title,
    baseBranch: state.baseBranch,
    setTitle: (value) => dispatch({ type: "setTitle", value }),
    setBaseBranch: (value) => dispatch({ type: "setBaseBranch", value }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.title.trim() || state.isCreating) return;

    dispatch({ type: "startCreating" });
    try {
      await onSubmit(
        state.title.trim(),
        state.description.trim(),
        state.runPostCommand,
        state.prLink.trim(),
        state.baseBranch.trim() || undefined
      );
      dispatch({ type: "reset" });
      onOpenChange(false);
    } finally {
      dispatch({ type: "finishCreating" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Ticket title"
            value={state.title}
            onChange={(e) => dispatch({ type: "setTitle", value: e.target.value })}
          />
          <textarea
            placeholder="Description (optional)"
            value={state.description}
            onChange={(e) => dispatch({ type: "setDescription", value: e.target.value })}
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          />
          <div className="relative">
            <Input
              placeholder="PR link (optional, e.g., https://github.com/...)"
              value={state.prLink}
              onChange={(e) => dispatch({ type: "setPrLink", value: e.target.value })}
              onPaste={handlePrLinkPaste}
            />
            {isFetchingPr && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Input
            placeholder="Base branch (optional, defaults to current branch)"
            value={state.baseBranch}
            onChange={(e) => dispatch({ type: "setBaseBranch", value: e.target.value })}
          />
          {hasPostCommand && (
            <div className="flex items-center justify-between">
              <Label
                htmlFor="run-post-command-mobile-board"
                className="text-sm text-muted-foreground"
              >
                Run post-worktree command
              </Label>
              <Switch
                id="run-post-command-mobile-board"
                checked={state.runPostCommand}
                onCheckedChange={(value) => dispatch({ type: "setRunPostCommand", value })}
              />
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={state.isCreating || !state.title.trim()}
          >
            {state.isCreating ? (
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
  );
}

interface ControlledOpenBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPostCommand?: boolean;
  onSubmit: (branchName: string, description: string, runPostCommand: boolean) => Promise<void>;
}

interface ControlledOpenBranchDialogState {
  branchName: string;
  description: string;
  runPostCommand: boolean;
  isOpening: boolean;
}

type ControlledOpenBranchDialogAction =
  | { type: "setBranchName"; value: string }
  | { type: "setDescription"; value: string }
  | { type: "setRunPostCommand"; value: boolean }
  | { type: "startOpening" }
  | { type: "finishOpening" }
  | { type: "reset" };

const initialControlledOpenBranchDialogState: ControlledOpenBranchDialogState = {
  branchName: "",
  description: "",
  runPostCommand: true,
  isOpening: false,
};

function controlledOpenBranchDialogReducer(
  state: ControlledOpenBranchDialogState,
  action: ControlledOpenBranchDialogAction
): ControlledOpenBranchDialogState {
  switch (action.type) {
    case "setBranchName":
      return { ...state, branchName: action.value };
    case "setDescription":
      return { ...state, description: action.value };
    case "setRunPostCommand":
      return { ...state, runPostCommand: action.value };
    case "startOpening":
      return { ...state, isOpening: true };
    case "finishOpening":
      return { ...state, isOpening: false };
    case "reset":
      return initialControlledOpenBranchDialogState;
    default:
      return state;
  }
}

function ControlledOpenBranchDialog({
  open,
  onOpenChange,
  hasPostCommand,
  onSubmit,
}: ControlledOpenBranchDialogProps) {
  const [state, dispatch] = useReducer(
    controlledOpenBranchDialogReducer,
    initialControlledOpenBranchDialogState
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.branchName.trim() || state.isOpening) return;

    dispatch({ type: "startOpening" });
    try {
      await onSubmit(state.branchName.trim(), state.description.trim(), state.runPostCommand);
      dispatch({ type: "reset" });
      onOpenChange(false);
    } finally {
      dispatch({ type: "finishOpening" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open Existing Branch</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Branch name (e.g., feature-x or origin/feature-x)"
            value={state.branchName}
            onChange={(e) => dispatch({ type: "setBranchName", value: e.target.value })}
          />
          <textarea
            placeholder="Description (optional)"
            value={state.description}
            onChange={(e) => dispatch({ type: "setDescription", value: e.target.value })}
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          />
          {hasPostCommand && (
            <div className="flex items-center justify-between">
              <Label
                htmlFor="run-post-command-branch-mobile-board"
                className="text-sm text-muted-foreground"
              >
                Run post-worktree command
              </Label>
              <Switch
                id="run-post-command-branch-mobile-board"
                checked={state.runPostCommand}
                onCheckedChange={(value) => dispatch({ type: "setRunPostCommand", value })}
              />
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={state.isOpening || !state.branchName.trim()}
          >
            {state.isOpening ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Opening...
              </>
            ) : (
              "Open Branch"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TicketStarterProps {
  pr: PrSuggestion;
  projectId: string;
  onCreated: (url: string) => void;
}

function TicketStarter({ pr, projectId, onCreated }: TicketStarterProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleClick = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await ticketsApi.create({
        title: pr.title,
        prLink: pr.url,
        projectId,
        baseBranch: pr.headRefName,
      });
      onCreated(pr.url);
    } catch (error) {
      console.error("Failed to create ticket from PR:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      data-testid={`pr-suggestion-${pr.number}`}
      disabled={isCreating}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md border border-dashed border-border bg-muted/40 hover:bg-muted/70 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isCreating ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <GitPullRequest className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <span className="text-xs text-muted-foreground truncate">
        #{pr.number} · {pr.title}
      </span>
    </button>
  );
}

interface ProjectBoardProps {
  project: Project;
  columns: Columns;
  columnEnteredAt: Record<string, number>;
  onOpenTask: (task: Task, projectId: string) => void;
  onCreateTicket: (
    projectId: string,
    title: string,
    description: string,
    runPostCommand: boolean,
    prLink?: string,
    baseBranch?: string
  ) => Promise<void>;
  onCreateFromBranch: (
    projectId: string,
    branchName: string,
    description: string,
    runPostCommand: boolean
  ) => Promise<void>;
  onDeleteTicket: (projectId: string, ticketId: string) => Promise<void>;
  onClearOverride: (projectId: string, ticketId: string) => Promise<void>;
  onUpdateTicket: (
    projectId: string,
    ticketId: string,
    data: { column?: string; description?: string | null; prLink?: string | null }
  ) => Promise<void>;
  onColumnsChange: (projectId: string, columns: Columns) => void;
  selectedTaskId: string | null;
}

interface ProjectBoardUiState {
  deletingTicketId: string | null;
  ticketToDelete: Task | null;
  ticketToEdit: Task | null;
  ticketEditDescription: string;
  ticketEditPrLink: string;
  createTicketOpen: boolean;
  openBranchOpen: boolean;
}

type ProjectBoardUiAction =
  | { type: "setDeletingTicketId"; ticketId: string | null }
  | { type: "setTicketToDelete"; ticket: Task | null }
  | { type: "openEditTicket"; ticket: Task }
  | { type: "closeEditTicket" }
  | { type: "setTicketEditDescription"; value: string }
  | { type: "setTicketEditPrLink"; value: string }
  | { type: "setCreateTicketOpen"; open: boolean }
  | { type: "setOpenBranchOpen"; open: boolean };

const initialProjectBoardUiState: ProjectBoardUiState = {
  deletingTicketId: null,
  ticketToDelete: null,
  ticketToEdit: null,
  ticketEditDescription: "",
  ticketEditPrLink: "",
  createTicketOpen: false,
  openBranchOpen: false,
};

function projectBoardUiReducer(
  state: ProjectBoardUiState,
  action: ProjectBoardUiAction
): ProjectBoardUiState {
  switch (action.type) {
    case "setDeletingTicketId":
      return { ...state, deletingTicketId: action.ticketId };
    case "setTicketToDelete":
      return { ...state, ticketToDelete: action.ticket };
    case "openEditTicket":
      return {
        ...state,
        ticketToEdit: action.ticket,
        ticketEditDescription: action.ticket.description || "",
        ticketEditPrLink: action.ticket.prLink || "",
      };
    case "closeEditTicket":
      return {
        ...state,
        ticketToEdit: null,
        ticketEditDescription: "",
        ticketEditPrLink: "",
      };
    case "setTicketEditDescription":
      return { ...state, ticketEditDescription: action.value };
    case "setTicketEditPrLink":
      return { ...state, ticketEditPrLink: action.value };
    case "setCreateTicketOpen":
      return { ...state, createTicketOpen: action.open };
    case "setOpenBranchOpen":
      return { ...state, openBranchOpen: action.open };
    default:
      return state;
  }
}

export function ProjectBoard({
  project,
  columns,
  columnEnteredAt,
  onOpenTask,
  onCreateTicket,
  onCreateFromBranch,
  onDeleteTicket,
  onClearOverride,
  onUpdateTicket,
  onColumnsChange,
  selectedTaskId,
}: ProjectBoardProps) {
  const { commitInfo, isPulling, pull } = useGitOperations(project.id);
  const { suggestions, setSuggestions } = usePrSuggestions(project.id);

  // Local UI state
  const [uiState, dispatch] = useReducer(projectBoardUiReducer, initialProjectBoardUiState);

  // Require 8px movement before drag starts - allows clicks to work
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  );

  // Handlers
  const handleCreateTicket = async (
    title: string,
    description: string,
    runPostCommand: boolean,
    prLink?: string,
    baseBranch?: string
  ) => {
    await onCreateTicket(project.id, title, description, runPostCommand, prLink, baseBranch);
  };

  const handleOpenBranch = async (
    branchName: string,
    description: string,
    runPostCommand: boolean
  ) => {
    await onCreateFromBranch(project.id, branchName, description, runPostCommand);
  };

  const handleDeleteTicketClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    dispatch({ type: "setTicketToDelete", ticket: task });
  };

  const handleConfirmDelete = async () => {
    if (!uiState.ticketToDelete) return;

    const taskId = uiState.ticketToDelete.id;
    dispatch({ type: "setDeletingTicketId", ticketId: taskId });
    try {
      await onDeleteTicket(project.id, taskId);
    } catch (error) {
      console.error("Failed to delete ticket:", error);
    } finally {
      dispatch({ type: "setDeletingTicketId", ticketId: null });
      dispatch({ type: "setTicketToDelete", ticket: null });
    }
  };

  const handleClearOverride = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    await onClearOverride(project.id, taskId);
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

  const handleStarterCreated = (url: string) => {
    setSuggestions((prev) => prev.filter((s) => s.url !== url));
  };

  const handleEditTicketClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    dispatch({ type: "openEditTicket", ticket: task });
  };

  const handleConfirmEdit = async (description: string, prLink: string) => {
    if (!uiState.ticketToEdit) return;

    try {
      await onUpdateTicket(project.id, uiState.ticketToEdit.id, {
        description: description || null,
        prLink: prLink || null,
      });
      dispatch({ type: "closeEditTicket" });
      // Polling will refresh the data automatically
    } catch (error) {
      console.error("Failed to update ticket:", error);
      toast.error("Failed to update ticket", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="flex flex-col">
      {/* Per-Board Header */}
      <div
        className="flex items-center justify-between mb-3"
        data-testid={`project-board-${project.id}`}
      >
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label={`Open ${project.name} board menu`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={isPulling} onClick={pull}>
                {isPulling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <GitPullRequest className="h-4 w-4 mr-2" />
                )}
                <span>Pull</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => dispatch({ type: "setCreateTicketOpen", open: true })}
              >
                <Plus className="h-4 w-4 mr-2" />
                <span>Add Ticket</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => dispatch({ type: "setOpenBranchOpen", open: true })}
              >
                <GitBranch className="h-4 w-4 mr-2" />
                <span>Open Branch</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Kanban Board */}
      <Kanban
        value={columns}
        onValueChange={(nextColumns) => onColumnsChange(project.id, nextColumns)}
        getItemValue={(item) => item.id}
        sensors={sensors}
      >
        <KanbanBoard className="items-stretch min-h-[200px] h-full">
          {COLUMN_ORDER.map((columnId) => {
            const tasks = columns[columnId] || [];
            return (
              <KanbanColumn
                key={columnId}
                value={columnId}
                data-testid={`column-${project.id}-${columnId.toLowerCase().replace(/\s+/g, "-")}`}
                className="flex-1 min-w-[220px] flex flex-col"
              >
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border px-1">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${COLUMN_COLORS[columnId] ?? "bg-zinc-400"}`}
                  />
                  <span className="font-semibold text-muted-foreground text-sm">{columnId}</span>
                  <span className="text-zinc-500 text-xs">{tasks.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                  {columnId === "To Do" && suggestions.length > 0 && (
                    <div className="mb-2 space-y-1">
                      <p className="text-xs text-muted-foreground px-1">Quick starters</p>
                      {suggestions.map((pr) => (
                        <TicketStarter
                          key={pr.url}
                          pr={pr}
                          projectId={project.id}
                          onCreated={handleStarterCreated}
                        />
                      ))}
                    </div>
                  )}
                  {tasks.map((task) => (
                    <TicketCard
                      key={task.id}
                      task={task}
                      columnEnteredAt={columnEnteredAt[task.id]}
                      hasEditor={!!project.editor}
                      isDeleting={uiState.deletingTicketId === task.id}
                      isSelected={selectedTaskId === task.id}
                      onClick={() => onOpenTask(task, project.id)}
                      onDelete={(e) => handleDeleteTicketClick(e, task)}
                      onClearOverride={(e) => handleClearOverride(e, task.id)}
                      onOpenEditor={(e) => handleOpenEditor(e, task.id)}
                      onEditTicket={(e) => handleEditTicketClick(e, task)}
                    />
                  ))}
                </div>
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

      {/* Delete Confirmation Dialog */}
      <DeleteTicketDialog
        ticket={uiState.ticketToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => dispatch({ type: "setTicketToDelete", ticket: null })}
      />

      {/* Edit Ticket Dialog */}
      <EditTicketDialog
        task={uiState.ticketToEdit}
        description={uiState.ticketEditDescription}
        prLink={uiState.ticketEditPrLink}
        onDescriptionChange={(value) => dispatch({ type: "setTicketEditDescription", value })}
        onPrLinkChange={(value) => dispatch({ type: "setTicketEditPrLink", value })}
        onSubmit={handleConfirmEdit}
        onCancel={() => dispatch({ type: "closeEditTicket" })}
      />

      {/* Controlled dialogs for mobile menu */}
      <ControlledCreateTicketDialog
        open={uiState.createTicketOpen}
        onOpenChange={(open) => dispatch({ type: "setCreateTicketOpen", open })}
        hasPostCommand={!!project.postWorktreeCommand}
        onSubmit={handleCreateTicket}
      />
      <ControlledOpenBranchDialog
        open={uiState.openBranchOpen}
        onOpenChange={(open) => dispatch({ type: "setOpenBranchOpen", open })}
        hasPostCommand={!!project.postWorktreeCommand}
        onSubmit={handleOpenBranch}
      />
    </div>
  );
}
