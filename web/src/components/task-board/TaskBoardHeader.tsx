import { Loader2, GitPullRequest, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsDialog } from "@/components/SettingsDialog";
import { CreateTicketDialog } from "./dialogs/CreateTicketDialog";
import { OpenBranchDialog } from "./dialogs/OpenBranchDialog";
import type { Project, CommitInfo } from "@/types";

interface TaskBoardHeaderProps {
  projects: Project[];
  selectedProject: Project | null;
  projectDropdownOpen: boolean;
  commitInfo: CommitInfo | null;
  isPulling: boolean;
  onProjectDropdownToggle: () => void;
  onSelectProject: (project: Project) => void;
  onPull: () => void;
  onCreateTicket: (title: string, description: string) => Promise<void>;
  onOpenBranch: (branchName: string, description: string) => Promise<void>;
  onProjectsChange: () => void;
}

export function TaskBoardHeader({
  projects,
  selectedProject,
  projectDropdownOpen,
  commitInfo,
  isPulling,
  onProjectDropdownToggle,
  onSelectProject,
  onPull,
  onCreateTicket,
  onOpenBranch,
  onProjectsChange,
}: TaskBoardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <img src="/taskforce-logo.png" alt="Taskforce" className="h-5" />
        {/* Project Selector */}
        <div className="relative">
          <button
            onClick={onProjectDropdownToggle}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
          >
            {selectedProject ? selectedProject.name : "Select Project"}
            <ChevronDown className="h-4 w-4" />
          </button>
          {projectDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-popover border rounded-md shadow-lg z-50">
              {projects.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No projects. Create one in Settings.
                </div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-accent ${
                      selectedProject?.id === project.id ? "bg-accent" : ""
                    }`}
                  >
                    {project.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {selectedProject && commitInfo && (
          <div className="flex-1 min-w-0 flex items-center text-sm text-muted-foreground">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
              {commitInfo.hash}
            </span>
            <span className="ml-2 truncate min-w-0">{commitInfo.message}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!selectedProject || isPulling}
          onClick={onPull}
        >
          {isPulling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GitPullRequest className="h-4 w-4" />
          )}
          <span className="ml-1">Pull</span>
        </Button>
        <CreateTicketDialog disabled={!selectedProject} onSubmit={onCreateTicket} />
        <OpenBranchDialog disabled={!selectedProject} onSubmit={onOpenBranch} />
        <ThemeToggle />
        <SettingsDialog onProjectsChange={onProjectsChange} />
      </div>
    </div>
  );
}
