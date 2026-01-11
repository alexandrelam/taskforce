import { useState, useEffect } from "react";
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

import { projectsApi } from "@/lib/api";
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

export function SettingsDialog({ onProjectsChange }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionName>("General");
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingCommandId, setEditingCommandId] = useState<string | null>(null);
  const [editingCommandValue, setEditingCommandValue] = useState("");

  const fetchProjects = async () => {
    const data = await projectsApi.getAll();
    setProjects(data);
  };

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

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
    const project = projects.find((p) => p.id === projectId);
    if (!project) return false;

    const newPanes = [...project.panes, { name: paneName }];
    await projectsApi.update(projectId, { panes: newPanes });
    await fetchProjects();
    onProjectsChange?.();
    return true;
  };

  const handleRemovePane = async (projectId: string, paneName: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const newPanes = project.panes.filter((p) => p.name !== paneName);
    await projectsApi.update(projectId, { panes: newPanes });
    await fetchProjects();
    onProjectsChange?.();
  };

  const handleCreateProject = async (name: string, path: string, command: string) => {
    await projectsApi.create({
      name,
      path,
      postWorktreeCommand: command || null,
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
    if (editingCommandId) {
      handleSaveCommand(editingCommandId, editingCommandValue);
      setEditingCommandId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                          isActive={activeSection === item.name}
                          onClick={() => setActiveSection(item.name)}
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
                    <BreadcrumbPage>{activeSection}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              {activeSection === "General" && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    General settings will appear here. Project-specific settings like post-worktree
                    commands can be configured in the Projects section.
                  </p>
                </div>
              )}
              {activeSection === "Projects" && (
                <>
                  <div className="space-y-4">
                    <Label>Existing Projects</Label>
                    {projects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No projects yet. Create one below.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {projects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            editingCommandId={editingCommandId}
                            editingCommandValue={editingCommandValue}
                            onEditCommandStart={(id, value) => {
                              setEditingCommandId(id);
                              setEditingCommandValue(value);
                            }}
                            onEditCommandChange={setEditingCommandValue}
                            onEditCommandBlur={handleEditCommandBlur}
                            onSaveEditor={handleSaveEditor}
                            onAddPane={handleAddPane}
                            onRemovePane={handleRemovePane}
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
