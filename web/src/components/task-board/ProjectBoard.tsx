import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

import { useTickets } from "@/hooks/useTickets";
import { useGitOperations } from "@/hooks/useGitOperations";
import { usePrSuggestions, type PrSuggestion } from "@/hooks/usePrSuggestions";
import { ticketsApi } from "@/lib/api";

import { useStacks } from "@/hooks/useStacks";
import { StackConnectorProvider } from "@/contexts/StackConnectorContext";
import { StackConnectors } from "./StackConnectors";
import { StackHeader } from "./StackHeader";
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

function ControlledCreateTicketDialog({
  open,
  onOpenChange,
  hasPostCommand,
  onSubmit,
}: ControlledCreateTicketDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prLink, setPrLink] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [runPostCommand, setRunPostCommand] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { isFetchingPr, handlePrLinkPaste } = usePrAutoFill({
    title,
    baseBranch,
    setTitle,
    setBaseBranch,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onSubmit(
        title.trim(),
        description.trim(),
        runPostCommand,
        prLink.trim(),
        baseBranch.trim() || undefined
      );
      setTitle("");
      setDescription("");
      setPrLink("");
      setBaseBranch("");
      setRunPostCommand(true);
      onOpenChange(false);
    } finally {
      setIsCreating(false);
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          />
          <div className="relative">
            <Input
              placeholder="PR link (optional, e.g., https://github.com/...)"
              value={prLink}
              onChange={(e) => setPrLink(e.target.value)}
              onPaste={handlePrLinkPaste}
            />
            {isFetchingPr && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Input
            placeholder="Base branch (optional, defaults to current branch)"
            value={baseBranch}
            onChange={(e) => setBaseBranch(e.target.value)}
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
                checked={runPostCommand}
                onCheckedChange={setRunPostCommand}
              />
            </div>
          )}
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
  );
}

interface ControlledOpenBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPostCommand?: boolean;
  onSubmit: (branchName: string, description: string, runPostCommand: boolean) => Promise<void>;
}

function ControlledOpenBranchDialog({
  open,
  onOpenChange,
  hasPostCommand,
  onSubmit,
}: ControlledOpenBranchDialogProps) {
  const [branchName, setBranchName] = useState("");
  const [description, setDescription] = useState("");
  const [runPostCommand, setRunPostCommand] = useState(true);
  const [isOpening, setIsOpening] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || isOpening) return;

    setIsOpening(true);
    try {
      await onSubmit(branchName.trim(), description.trim(), runPostCommand);
      setBranchName("");
      setDescription("");
      setRunPostCommand(true);
      onOpenChange(false);
    } finally {
      setIsOpening(false);
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
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
                checked={runPostCommand}
                onCheckedChange={setRunPostCommand}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isOpening}>
            {isOpening ? (
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
  onOpenTask: (task: Task, projectId: string) => void;
  onColumnsChange?: (columns: Columns) => void;
  selectedTaskId: string | null;
}

export function ProjectBoard({
  project,
  onOpenTask,
  onColumnsChange,
  selectedTaskId,
}: ProjectBoardProps) {
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
  const { suggestions, setSuggestions } = usePrSuggestions(project.id);
  const { stacks, stackByTicketId, memberByTicketId } = useStacks(columns);

  // Stack UI state
  const [hoveredStackId, setHoveredStackId] = useState<string | null>(null);
  const boardContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Build a task lookup map for StackHeader
  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const tasks of Object.values(columns)) {
      for (const t of tasks) {
        map.set(t.id, t);
      }
    }
    return map;
  }, [columns]);

  // Delayed hover: gives user time to move mouse to the StackHeader
  const handleStackHover = useCallback(
    (ticketId: string | null) => {
      clearTimeout(hoverTimeoutRef.current);
      if (!ticketId) {
        hoverTimeoutRef.current = setTimeout(() => setHoveredStackId(null), 300);
        return;
      }
      const stack = stackByTicketId.get(ticketId);
      setHoveredStackId(stack?.id || null);
    },
    [stackByTicketId]
  );

  // Called by StackHeader to keep itself visible while hovered
  const handleStackHeaderEnter = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
  }, []);

  const handleStackHeaderLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredStackId(null), 300);
  }, []);

  const hoveredStack = hoveredStackId ? stacks.find((s) => s.id === hoveredStackId) : null;

  // Local UI state
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Task | null>(null);
  const [ticketToEdit, setTicketToEdit] = useState<Task | null>(null);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [openBranchOpen, setOpenBranchOpen] = useState(false);

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
  const handleCreateTicket = async (
    title: string,
    description: string,
    runPostCommand: boolean,
    prLink?: string,
    baseBranch?: string
  ) => {
    await createTicket(title, description, runPostCommand, prLink, baseBranch);
  };

  const handleOpenBranch = async (
    branchName: string,
    description: string,
    runPostCommand: boolean
  ) => {
    await createFromBranch(branchName, description, runPostCommand);
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

  const handleStarterCreated = (url: string) => {
    setSuggestions((prev) => prev.filter((s) => s.url !== url));
  };

  const handleEditTicketClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setTicketToEdit(task);
  };

  const handleConfirmEdit = async (description: string, prLink: string) => {
    if (!ticketToEdit) return;

    try {
      await ticketsApi.update(ticketToEdit.id, {
        description: description || null,
        prLink: prLink || null,
      });
      setTicketToEdit(null);
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
      <div className="flex items-center justify-between mb-3">
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
              <Button variant="outline" size="sm">
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
              <DropdownMenuItem onSelect={() => setCreateTicketOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                <span>Add Ticket</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setOpenBranchOpen(true)}>
                <GitBranch className="h-4 w-4 mr-2" />
                <span>Open Branch</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Kanban Board */}
      <StackConnectorProvider>
        <div className="relative" ref={boardContainerRef}>
          {hoveredStack && (
            <StackHeader
              stack={hoveredStack}
              tasks={taskMap}
              onResyncComplete={() => setHoveredStackId(null)}
              onMouseEnter={handleStackHeaderEnter}
              onMouseLeave={handleStackHeaderLeave}
            />
          )}
          <StackConnectors
            stacks={stacks}
            hoveredStackId={hoveredStackId}
            containerRef={boardContainerRef}
          />
          <Kanban
            value={columns}
            onValueChange={wrappedHandleColumnsChange}
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
                    className="flex-1 min-w-[220px] flex flex-col"
                  >
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border px-1">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${COLUMN_COLORS[columnId] ?? "bg-zinc-400"}`}
                      />
                      <span className="font-semibold text-muted-foreground text-sm">
                        {columnId}
                      </span>
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
                      {tasks.map((task) => {
                        const member = memberByTicketId.get(task.id);
                        const stack = stackByTicketId.get(task.id);
                        return (
                          <TicketCard
                            key={task.id}
                            task={task}
                            columnId={columnId}
                            columnEnteredAt={columnEnteredAt[task.id]}
                            hasEditor={!!project.editor}
                            isDeleting={deletingTicketId === task.id}
                            isSelected={selectedTaskId === task.id}
                            stackMember={member}
                            isStackHighlighted={!!stack && hoveredStackId === stack.id}
                            onStackHover={handleStackHover}
                            onClick={() => onOpenTask(task, project.id)}
                            onDelete={(e) => handleDeleteTicketClick(e, task)}
                            onClearOverride={(e) => handleClearOverride(e, task.id)}
                            onOpenEditor={(e) => handleOpenEditor(e, task.id)}
                            onEditTicket={(e) => handleEditTicketClick(e, task)}
                          />
                        );
                      })}
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
        </div>
      </StackConnectorProvider>

      {/* Delete Confirmation Dialog */}
      <DeleteTicketDialog
        ticket={ticketToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTicketToDelete(null)}
      />

      {/* Edit Ticket Dialog */}
      <EditTicketDialog
        task={ticketToEdit}
        onSubmit={handleConfirmEdit}
        onCancel={() => setTicketToEdit(null)}
      />

      {/* Controlled dialogs for mobile menu */}
      <ControlledCreateTicketDialog
        open={createTicketOpen}
        onOpenChange={setCreateTicketOpen}
        hasPostCommand={!!project.postWorktreeCommand}
        onSubmit={handleCreateTicket}
      />
      <ControlledOpenBranchDialog
        open={openBranchOpen}
        onOpenChange={setOpenBranchOpen}
        hasPostCommand={!!project.postWorktreeCommand}
        onSubmit={handleOpenBranch}
      />
    </div>
  );
}
