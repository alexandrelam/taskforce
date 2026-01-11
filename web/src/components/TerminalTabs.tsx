import { cn } from "@/lib/utils";
import type { Pane } from "@/types";

interface TerminalTabsProps {
  panes: Pane[];
  activePane: string;
  onPaneChange: (paneName: string) => void;
}

export function TerminalTabs({ panes, activePane, onPaneChange }: TerminalTabsProps) {
  // Always include "claude" as the first tab
  const allPanes = [{ name: "claude" }, ...panes];

  return (
    <div className="flex border-b bg-muted/30">
      {allPanes.map((pane) => (
        <button
          key={pane.name}
          onClick={() => onPaneChange(pane.name)}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activePane === pane.name
              ? "border-primary text-primary bg-background"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {pane.name}
        </button>
      ))}
    </div>
  );
}
