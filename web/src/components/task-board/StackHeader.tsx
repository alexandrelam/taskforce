import { useState } from "react";
import { Link, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ticketsApi } from "@/lib/api";
import type { Stack, EdgeHealth } from "@/hooks/useStacks";
import type { Task } from "@/types";

const HEALTH_COLORS: Record<EdgeHealth, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
};

interface StackHeaderProps {
  stack: Stack;
  tasks: Map<string, Task>;
  onResyncComplete: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function StackHeader({
  stack,
  tasks,
  onResyncComplete,
  onMouseEnter,
  onMouseLeave,
}: StackHeaderProps) {
  const [isResyncing, setIsResyncing] = useState(false);

  const needsResync = stack.members.some((m) => m.needsResync);
  const orderedIds = stack.members.map((m) => m.ticketId);

  const handleResync = async () => {
    if (isResyncing) return;
    setIsResyncing(true);

    try {
      const result = await ticketsApi.resyncStack(orderedIds);
      const failures = result.results.filter((r: { success: boolean }) => !r.success);
      if (failures.length > 0) {
        toast.error("Resync partially failed", {
          description: `${failures.length} ticket(s) failed to resync`,
        });
      } else {
        toast.success("Stack resynced", {
          description: `${result.results.length} PRs rebased and updated`,
        });
      }
      onResyncComplete();
    } catch (error) {
      toast.error("Resync failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <div
      className="absolute top-2 left-1/2 -translate-x-1/2 z-20 animate-in fade-in duration-200"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center gap-3 rounded-lg border bg-card/95 backdrop-blur-sm px-3 py-2 shadow-md whitespace-nowrap">
        <Link className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Stack chain visualization */}
        <div className="flex items-center gap-1">
          {stack.members.map((member, idx) => {
            const task = tasks.get(member.ticketId);
            return (
              <div key={member.ticketId} className="flex items-center gap-1">
                <div
                  className={`h-3 w-3 rounded-full border-2 border-background ${HEALTH_COLORS[member.edgeHealth]}`}
                  title={task?.title || member.ticketId}
                />
                {idx < stack.members.length - 1 && (
                  <div className="w-3 h-px bg-muted-foreground/40" />
                )}
              </div>
            );
          })}
        </div>

        <span className="text-xs text-muted-foreground">Stack of {stack.members.length}</span>

        {needsResync && (
          <Button
            variant="default"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={handleResync}
            disabled={isResyncing}
          >
            {isResyncing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Resyncing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Resync Stack
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
