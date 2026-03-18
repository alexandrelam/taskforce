import { useEffect, useRef } from "react";
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
  Link,
} from "lucide-react";
import { formatElapsedTime } from "@/hooks/useTimer";
import type { Task, PrState } from "@/types";
import type { StackMember } from "@/hooks/useStacks";
import { Ripple } from "@/components/ui/ripple";
import { useStackConnector } from "@/contexts/StackConnectorContext";

function getPrReviewDisplay(
  pr: PrState
): { color: string; dotClass: string; label: string } | null {
  if (pr.error) return null;
  if (pr.state === "MERGED")
    return { color: "text-purple-500", dotClass: "bg-purple-500", label: "Merged" };
  if (pr.state === "CLOSED")
    return { color: "text-muted-foreground", dotClass: "bg-muted-foreground", label: "Closed" };
  if (pr.isDraft)
    return { color: "text-muted-foreground", dotClass: "bg-muted-foreground", label: "Draft" };
  if (pr.reviewDecision === "CHANGES_REQUESTED")
    return { color: "text-orange-500", dotClass: "bg-orange-500", label: "Changes requested" };
  if (pr.reviewDecision === "APPROVED")
    return { color: "text-green-500", dotClass: "bg-green-500", label: "Approved" };
  return { color: "text-blue-500", dotClass: "bg-blue-500", label: "Review required" };
}

function getPrCiDisplay(pr: PrState): { color: string; dotClass: string; label: string } | null {
  if (pr.error) return null;
  if (pr.state === "MERGED" || pr.state === "CLOSED") return null;
  if (pr.mergeable === "CONFLICTING")
    return { color: "text-red-500", dotClass: "bg-red-500", label: "Conflicts" };
  if (pr.checksStatus === "FAILURE")
    return { color: "text-red-500", dotClass: "bg-red-500", label: "Checks failing" };
  if (pr.checksStatus === "PENDING")
    return { color: "text-yellow-500", dotClass: "bg-yellow-500", label: "Checks running" };
  if (pr.checksStatus === "SUCCESS")
    return { color: "text-green-500", dotClass: "bg-green-500", label: "Checks passing" };
  return null;
}

interface TicketCardProps {
  task: Task;
  columnId: string;
  columnEnteredAt: number | undefined;
  hasEditor: boolean;
  isDeleting: boolean;
  isSelected: boolean;
  stackMember?: StackMember;
  isStackHighlighted?: boolean;
  onStackHover?: (stackId: string | null) => void;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onClearOverride: (e: React.MouseEvent) => void;
  onOpenEditor: (e: React.MouseEvent) => void;
  onEditTicket: (e: React.MouseEvent) => void;
}

export function TicketCard({
  task,
  columnId,
  columnEnteredAt,
  hasEditor,
  isDeleting,
  isSelected,
  stackMember,
  isStackHighlighted,
  onStackHover,
  onClick,
  onDelete,
  onClearOverride,
  onOpenEditor,
  onEditTicket,
}: TicketCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { registerCardRef, unregisterCardRef } = useStackConnector();

  useEffect(() => {
    const el = cardRef.current;
    if (el) {
      registerCardRef(task.id, el);
    }
    return () => unregisterCardRef(task.id);
  }, [task.id, registerCardRef, unregisterCardRef]);
  const isSetupInProgress =
    task.setupStatus === "pending" ||
    task.setupStatus === "creating_worktree" ||
    task.setupStatus === "running_post_command";
  const isSetupFailed = task.setupStatus === "failed";
  const hasOverride = task.statusOverride === true;
  const isClaudeWorking =
    columnId === "In Progress" && !hasOverride && !isSetupInProgress && !isSetupFailed;
  const prReview = task.prState ? getPrReviewDisplay(task.prState) : null;
  const prCi = task.prState ? getPrCiDisplay(task.prState) : null;

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

  const handleMouseEnter = () => {
    if (stackMember && onStackHover) {
      // Find the stack ID (root) - the member knows its position
      // We pass the stack.id from the parent through a data attribute
      onStackHover(task.id);
    }
  };

  const handleMouseLeave = () => {
    if (stackMember && onStackHover) {
      onStackHover(null);
    }
  };

  return (
    <div
      ref={cardRef}
      data-ticket-id={task.id}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <KanbanItem
        value={task.id}
        asHandle
        onClick={onClick}
        className={`group p-3 bg-card rounded-md border-2 transition-all duration-300 relative overflow-hidden ${
          isSelected
            ? "border-primary"
            : isClaudeWorking
              ? "border-transparent"
              : isStackHighlighted
                ? "border-blue-400/70 hover:border-blue-400"
                : isSetupFailed
                  ? "border-destructive/50 hover:border-destructive"
                  : hasOverride
                    ? "border-amber-500/50 hover:border-amber-500"
                    : "border-border hover:border-primary/50"
        }`}
      >
        {isClaudeWorking && (
          <div
            className="absolute top-1/2 left-1/2 w-[200%] aspect-square -translate-x-1/2 -translate-y-1/2 animate-[claude-border-spin_2.5s_linear_infinite]"
            style={{
              background: `conic-gradient(
                rgba(101, 131, 240, 0.25) 0deg,
                rgba(101, 131, 240, 0.25) 200deg,
                rgba(125, 141, 255, 0.6) 240deg,
                rgba(125, 141, 255, 0.9) 265deg,
                white 272deg,
                rgba(125, 141, 255, 0.9) 279deg,
                rgba(125, 141, 255, 0.6) 310deg,
                rgba(101, 131, 240, 0.25) 340deg,
                rgba(101, 131, 240, 0.25) 360deg
              )`,
            }}
          />
        )}
        {isClaudeWorking && (
          <div className="absolute inset-[2px] rounded-[calc(var(--radius-md)-2px)] bg-card" />
        )}
        {isSelected && <Ripple mainCircleSize={100} numCircles={5} />}
        <div className={isClaudeWorking ? "relative z-10" : ""}>
          <div className="flex items-center">
            <div className="flex items-center gap-2 text-sm">
              {isSetupInProgress && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
              {isSetupFailed && <AlertCircle className="h-3 w-3 text-destructive" />}
              {task.isMain && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded">
                  <GitBranch className="h-3 w-3" />
                  main
                </span>
              )}
              {!task.isMain && task.title}
              {stackMember && (
                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-500 rounded ml-1">
                  <Link className="h-2.5 w-2.5" />
                  {stackMember.position}/{stackMember.total}
                </span>
              )}
            </div>
          </div>
          {task.description && (
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </div>
          )}
          {(prReview || prCi) && (
            <div className="flex items-center gap-3 mt-1">
              {prReview && (
                <div className={`flex items-center gap-1.5 text-xs ${prReview.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${prReview.dotClass}`} />
                  {prReview.label}
                </div>
              )}
              {prCi && (
                <div className={`flex items-center gap-1.5 text-xs ${prCi.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${prCi.dotClass}`} />
                  {prCi.label}
                </div>
              )}
            </div>
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
          {stackMember?.needsResync && (
            <div className="flex items-center gap-1 text-xs text-amber-500 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Needs resync
            </div>
          )}
          <div className="flex items-center justify-end gap-1 mt-1">
            {task.prLink && (
              <button
                onClick={handlePRClick}
                className={`p-1 transition-opacity ${prReview ? `${prReview.color}` : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary"}`}
                title={[prReview?.label, prCi?.label].filter(Boolean).join(" · ") || "Open PR"}
              >
                <GitPullRequest className="h-3.5 w-3.5" />
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
                onClick={onEditTicket}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary p-1 transition-opacity"
                title="Edit ticket"
              >
                <Pencil className="h-3.5 w-3.5" />
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
      </KanbanItem>
    </div>
  );
}
