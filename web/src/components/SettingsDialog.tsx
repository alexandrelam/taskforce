import { useState, useEffect } from "react";
import { Settings, FolderKanban, Trash2, Cog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

const API_BASE = "http://localhost:3000";

interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  postWorktreeCommand: string | null;
}

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
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");
  const [newProjectCommand, setNewProjectCommand] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingCommandId, setEditingCommandId] = useState<string | null>(null);
  const [editingCommandValue, setEditingCommandValue] = useState("");

  const fetchProjects = async () => {
    const res = await fetch(`${API_BASE}/api/projects`);
    const data = await res.json();
    setProjects(data);
  };

  const saveProjectCommand = async (projectId: string, command: string) => {
    await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postWorktreeCommand: command }),
    });
    await fetchProjects();
  };

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectPath.trim()) return;

    setSaving(true);
    await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProjectName.trim(),
        path: newProjectPath.trim(),
        postWorktreeCommand: newProjectCommand.trim() || null,
      }),
    });
    setNewProjectName("");
    setNewProjectPath("");
    setNewProjectCommand("");
    setSaving(false);
    await fetchProjects();
    onProjectsChange?.();
  };

  const handleDeleteProject = async (id: string) => {
    await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE" });
    await fetchProjects();
    onProjectsChange?.();
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
                          <div key={project.id} className="rounded-md border p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{project.name}</div>
                                <div className="text-sm text-muted-foreground">{project.path}</div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteProject(project.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Post-worktree command (e.g., npm i)"
                                value={
                                  editingCommandId === project.id
                                    ? editingCommandValue
                                    : (project.postWorktreeCommand ?? "")
                                }
                                onChange={(e) => {
                                  setEditingCommandId(project.id);
                                  setEditingCommandValue(e.target.value);
                                }}
                                onBlur={() => {
                                  if (editingCommandId === project.id) {
                                    saveProjectCommand(project.id, editingCommandValue);
                                    setEditingCommandId(null);
                                  }
                                }}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleCreateProject} className="space-y-4 border-t pt-4">
                    <Label>Add New Project</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Project name"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                      />
                      <Input
                        placeholder="/path/to/your/project"
                        value={newProjectPath}
                        onChange={(e) => setNewProjectPath(e.target.value)}
                      />
                      <Input
                        placeholder="Post-worktree command (e.g., npm i)"
                        value={newProjectCommand}
                        onChange={(e) => setNewProjectCommand(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={saving || !newProjectName.trim() || !newProjectPath.trim()}
                      >
                        {saving ? "Creating..." : "Create Project"}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
