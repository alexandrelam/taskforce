import { ChevronDown, Check } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsDialog } from "@/components/SettingsDialog";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface GlobalHeaderProps {
  projects: Project[];
  selectedProjects: Project[];
  projectDropdownOpen: boolean;
  onProjectDropdownToggle: () => void;
  onToggleProject: (project: Project) => void;
  onProjectsChange: () => void;
}

export function GlobalHeader({
  projects,
  selectedProjects,
  projectDropdownOpen,
  onProjectDropdownToggle,
  onToggleProject,
  onProjectsChange,
}: GlobalHeaderProps) {
  const getButtonLabel = () => {
    if (selectedProjects.length === 0) return "Select Projects";
    if (selectedProjects.length === 1) return selectedProjects[0].name;
    return `${selectedProjects.length} Projects`;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
      <div className="flex items-center gap-4">
        <img src="/taskforce-logo.png" alt="Taskforce" className="h-5" />
        {/* Multi-Select Project Dropdown */}
        <div className="relative">
          <button
            onClick={onProjectDropdownToggle}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
          >
            {getButtonLabel()}
            <ChevronDown className="h-4 w-4" />
          </button>
          {projectDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-popover border rounded-md shadow-lg z-50">
              <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                Select up to 3 projects
              </div>
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No projects. Create one in Settings.
                </div>
              ) : (
                projects.map((project) => {
                  const isSelected = selectedProjects.some((p) => p.id === project.id);
                  const isDisabled = !isSelected && selectedProjects.length >= 3;
                  return (
                    <button
                      key={project.id}
                      onClick={() => !isDisabled && onToggleProject(project)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2",
                        isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 border rounded flex items-center justify-center shrink-0",
                          isSelected ? "bg-primary border-primary" : "border-input"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className="truncate">{project.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <SettingsDialog onProjectsChange={onProjectsChange} />
      </div>
    </div>
  );
}
