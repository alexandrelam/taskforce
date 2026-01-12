import { KanbanItem } from "@/components/ui/kanban";
import {
  Loader2,
  GitBranch,
  AlertCircle,
  Lock,
  ExternalLink,
  Clock,
  GitPullRequest,
  Pencil,
} from "lucide-react";
import { formatElapsedTime } from "@/hooks/useTimer";
import type { Task } from "@/types";

interface TicketCardProps {
  task: Task;
  columnEnteredAt: number | undefined;
  hasEditor: boolean;
  isDeleting: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onClearOverride: (e: React.MouseEvent) => void;
  onOpenEditor: (e: React.MouseEvent) => void;
  onEditTicket: (e: React.MouseEvent) => void;
}

export function TicketCard({
  task,
  columnEnteredAt,
  hasEditor,
  isDeleting,
  onClick,
  onDelete,
  onClearOverride,
  onOpenEditor,
  onEditTicket,
}: TicketCardProps) {
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

  const handlePRClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.prLink) {
      window.open(task.prLink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <KanbanItem
      value={task.id}
      asHandle
      onClick={onClick}
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
          {isSetupInProgress && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          {isSetupFailed && <AlertCircle className="h-3 w-3 text-destructive" />}
          {task.isMain && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
              <GitBranch className="h-3 w-3" />
              main
            </span>
          )}
          {!task.isMain && task.title}
        </div>
        <div className="flex items-center gap-1">
          {task.prLink && (
            <button
              onClick={handlePRClick}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary p-1 transition-opacity"
              title="Open PR"
            >
              <GitPullRequest className="h-3.5 w-3.5" />
            </button>
          )}
          {!task.isMain && (
            <button
              onClick={onEditTicket}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary p-1 transition-opacity"
              title="Edit ticket"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {hasEditor && !isSetupInProgress && !isSetupFailed && (
            <button
              onClick={onOpenEditor}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary p-1 transition-opacity"
              title="Open in editor"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          {hasOverride && (
            <button
              onClick={onClearOverride}
              className="text-amber-500 hover:text-amber-600 p-1 transition-colors"
              title="Manual status - click to re-enable automatic tracking"
            >
              <Lock className="h-3.5 w-3.5" />
            </button>
          )}
          {!task.isMain && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className={`p-1 transition-opacity ${
                isDeleting
                  ? "opacity-100 text-muted-foreground cursor-not-allowed"
                  : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              }`}
            >
              {isDeleting ? (
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
        <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</div>
      )}
      {isSetupInProgress && (
        <div className="text-xs text-muted-foreground mt-1">{getStatusText()}</div>
      )}
      {isSetupFailed && <div className="text-xs text-destructive mt-1">Setup failed</div>}
      {!isSetupInProgress && !isSetupFailed && columnEnteredAt && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Clock className="h-3 w-3" />
          {formatElapsedTime(Date.now() - columnEnteredAt)}
        </div>
      )}
    </KanbanItem>
  );
}
