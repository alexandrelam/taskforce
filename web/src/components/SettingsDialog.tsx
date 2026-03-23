import { useReducer } from "react";
import { Settings, FolderKanban, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

import { Input } from "@/components/ui/input";
import { projectsApi, settingsApi } from "@/lib/api";
import { ProjectCard, CreateProjectForm } from "./settings";
import type { Project } from "@/types";

type SectionName = "General" | "Projects";

const navItems: { name: SectionName; icon: typeof Cog }[] = [
  { name: "General", icon: Cog },
  { name: "Projects", icon: FolderKanban },
];

interface SettingsDialogProps {
  onProjectsChange?: () => void;
}

interface SettingsDialogState {
  open: boolean;
  activeSection: SectionName;
  projects: Project[];
  editingCommand: {
    projectId: string | null;
    value: string;
  };
  prPollMinutes: string;
}

type SettingsDialogAction =
  | { type: "setOpen"; open: boolean }
  | { type: "setActiveSection"; section: SectionName }
  | { type: "setProjects"; projects: Project[] }
  | { type: "startCommandEdit"; projectId: string; value: string }
  | { type: "changeCommandEdit"; value: string }
  | { type: "finishCommandEdit" }
  | { type: "setPrPollMinutes"; value: string }
  | { type: "hydrateOnOpen"; projects: Project[]; prPollMinutes: string };

const initialState: SettingsDialogState = {
  open: false,
  activeSection: "General",
  projects: [],
  editingCommand: {
    projectId: null,
    value: "",
  },
  prPollMinutes: "2",
};

function settingsDialogReducer(
  state: SettingsDialogState,
  action: SettingsDialogAction
): SettingsDialogState {
  switch (action.type) {
    case "setOpen":
      return {
        ...state,
        open: action.open,
        editingCommand: action.open ? state.editingCommand : initialState.editingCommand,
      };
    case "setActiveSection":
      return { ...state, activeSection: action.section };
    case "setProjects":
      return { ...state, projects: action.projects };
    case "startCommandEdit":
      return {
        ...state,
        editingCommand: {
          projectId: action.projectId,
          value: action.value,
        },
      };
    case "changeCommandEdit":
      if (!state.editingCommand.projectId) {
        return state;
      }

      return {
        ...state,
        editingCommand: {
          ...state.editingCommand,
          value: action.value,
        },
      };
    case "finishCommandEdit":
      return {
        ...state,
        editingCommand: initialState.editingCommand,
      };
    case "setPrPollMinutes":
      return { ...state, prPollMinutes: action.value };
    case "hydrateOnOpen":
      return {
        ...state,
        open: true,
        projects: action.projects,
        prPollMinutes: action.prPollMinutes,
        editingCommand: initialState.editingCommand,
      };
    default:
      return state;
  }
}

export function SettingsDialog({ onProjectsChange }: SettingsDialogProps) {
  const [state, dispatch] = useReducer(settingsDialogReducer, initialState);

  const fetchProjects = async () => {
    const data = await projectsApi.getAll();
    dispatch({ type: "setProjects", projects: data });
    return data;
  };

  const getPrPollMinutes = async () => {
    const { value } = await settingsApi.get("prPollInterval");
    if (!value) {
      return initialState.prPollMinutes;
    }

    const parsedMilliseconds = parseInt(value, 10);
    if (Number.isNaN(parsedMilliseconds)) {
      return initialState.prPollMinutes;
    }

    return String(parsedMilliseconds / 60000);
  };

  const handleOpenChange = async (nextOpen: boolean) => {
    if (!nextOpen) {
      dispatch({ type: "setOpen", open: false });
      return;
    }

    const [projects, prPollMinutes] = await Promise.all([fetchProjects(), getPrPollMinutes()]);
    dispatch({
      type: "hydrateOnOpen",
      projects,
      prPollMinutes,
    });
  };

  const handleSaveCommand = async (projectId: string, command: string) => {
    await projectsApi.update(projectId, { postWorktreeCommand: command });
    await fetchProjects();
  };

  const handleSaveEditor = async (projectId: string, editor: string) => {
    await projectsApi.update(projectId, {
      editor: editor === "none" ? null : editor,
    });
    await fetchProjects();
    onProjectsChange?.();
  };

  const handleAddPane = async (projectId: string, paneName: string): Promise<boolean> => {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return false;

    const newPanes = [...project.panes, { name: paneName }];
    await projectsApi.update(projectId, { panes: newPanes });
    await fetchProjects();
    onProjectsChange?.();
    return true;
  };

  const handleRemovePane = async (projectId: string, paneName: string) => {
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;

    const newPanes = project.panes.filter((p) => p.name !== paneName);
    await projectsApi.update(projectId, { panes: newPanes });
    await fetchProjects();
    onProjectsChange?.();
  };

  const handleToggleWorktrees = async (projectId: string, enabled: boolean) => {
    await projectsApi.update(projectId, { useWorktrees: enabled });
    await fetchProjects();
    onProjectsChange?.();
  };

  const handleCreateProject = async (
    name: string,
    path: string,
    command: string,
    useWorktrees: boolean
  ) => {
    await projectsApi.create({
      name,
      path,
      postWorktreeCommand: command || null,
      useWorktrees,
    });
    await fetchProjects();
    onProjectsChange?.();
  };

  const handleDeleteProject = async (id: string) => {
    await projectsApi.delete(id);
    await fetchProjects();
    onProjectsChange?.();
  };

  const handleEditCommandBlur = () => {
    if (state.editingCommand.projectId) {
      void handleSaveCommand(state.editingCommand.projectId, state.editingCommand.value);
      dispatch({ type: "finishCommandEdit" });
    }
  };

  return (
    <Dialog open={state.open} onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Configure your application settings.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navItems.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          isActive={state.activeSection === item.name}
                          onClick={() => dispatch({ type: "setActiveSection", section: item.name })}
                        >
                          <item.icon />
                          <span>{item.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{state.activeSection}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              {state.activeSection === "General" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pr-poll-interval">PR status check interval (minutes)</Label>
                    <Input
                      id="pr-poll-interval"
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={state.prPollMinutes}
                      onChange={(e) =>
                        dispatch({ type: "setPrPollMinutes", value: e.target.value })
                      }
                      onBlur={() => {
                        const mins = Math.max(0.5, parseFloat(state.prPollMinutes) || 2);
                        dispatch({ type: "setPrPollMinutes", value: String(mins) });
                        settingsApi.set("prPollInterval", String(mins * 60000));
                      }}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      How often to check GitHub PR status for tickets with a PR link. Minimum 0.5
                      minutes.
                    </p>
                  </div>
                </div>
              )}
              {state.activeSection === "Projects" && (
                <>
                  <div className="space-y-4">
                    <Label>Existing Projects</Label>
                    {state.projects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No projects yet. Create one below.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {state.projects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            editingCommandId={state.editingCommand.projectId}
                            editingCommandValue={state.editingCommand.value}
                            onEditCommandStart={(id, value) => {
                              dispatch({ type: "startCommandEdit", projectId: id, value });
                            }}
                            onEditCommandChange={(value) =>
                              dispatch({ type: "changeCommandEdit", value })
                            }
                            onEditCommandBlur={handleEditCommandBlur}
                            onSaveEditor={handleSaveEditor}
                            onAddPane={handleAddPane}
                            onRemovePane={handleRemovePane}
                            onToggleWorktrees={handleToggleWorktrees}
                            onDelete={handleDeleteProject}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <CreateProjectForm onSubmit={handleCreateProject} />
                </>
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
