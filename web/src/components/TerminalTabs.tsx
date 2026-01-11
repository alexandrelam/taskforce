import { cn } from "@/lib/utils";
import type { Pane, SetupStatus } from "@/types";
import { Loader2, AlertCircle } from "lucide-react";

interface TerminalTabsProps {
  panes: Pane[];
  activePane: string;
  onPaneChange: (paneName: string) => void;
  setupSession?: string | null;
  setupStatus?: SetupStatus;
}

export function TerminalTabs({
  panes,
  activePane,
  onPaneChange,
  setupSession,
  setupStatus,
}: TerminalTabsProps) {
  // Build pane list: claude, [setup if active], ...custom panes
  const allPanes: { name: string; isSetup?: boolean }[] = [{ name: "claude" }];

  // Add setup tab if session exists and status is running_post_command or failed
  if (setupSession && (setupStatus === "running_post_command" || setupStatus === "failed")) {
    allPanes.push({ name: "setup", isSetup: true });
  }

  // Add custom panes
  allPanes.push(...panes.map((p) => ({ name: p.name })));

  return (
    <div className="flex border-b bg-muted/30">
      {allPanes.map((pane) => (
        <button
          key={pane.name}
          onClick={() => onPaneChange(pane.name)}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1",
            activePane === pane.name
              ? "border-primary text-primary bg-background"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50",
            pane.isSetup && setupStatus === "failed" && "text-destructive"
          )}
        >
          {pane.isSetup && setupStatus === "running_post_command" && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {pane.isSetup && setupStatus === "failed" && <AlertCircle className="h-3 w-3" />}
          {pane.name}
        </button>
      ))}
    </div>
  );
}
