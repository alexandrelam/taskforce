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
  const [saving, setSaving] = useState(false);
  const [postWorktreeCommand, setPostWorktreeCommand] = useState("");
  const [savingCommand, setSavingCommand] = useState(false);

  const fetchProjects = async () => {
    const res = await fetch(`${API_BASE}/api/projects`);
    const data = await res.json();
    setProjects(data);
  };

  const fetchPostWorktreeCommand = async () => {
    const res = await fetch(`${API_BASE}/api/settings/worktree_post_command`);
    const data = await res.json();
    setPostWorktreeCommand(data.value ?? "");
  };

  const savePostWorktreeCommand = async () => {
    setSavingCommand(true);
    await fetch(`${API_BASE}/api/settings/worktree_post_command`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: postWorktreeCommand }),
    });
    setSavingCommand(false);
  };

  useEffect(() => {
    if (open) {
      fetchProjects();
      fetchPostWorktreeCommand();
    }
  }, [open]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectPath.trim()) return;

    setSaving(true);
    await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName.trim(), path: newProjectPath.trim() }),
    });
    setNewProjectName("");
    setNewProjectPath("");
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
                  <div className="space-y-2">
                    <Label htmlFor="post-worktree-command">Post-worktree command</Label>
                    <p className="text-sm text-muted-foreground">
                      Command to run after creating a git worktree for a new ticket (e.g., "npm i",
                      "bundle install")
                    </p>
                    <Input
                      id="post-worktree-command"
                      placeholder="npm i"
                      value={postWorktreeCommand}
                      onChange={(e) => setPostWorktreeCommand(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={savePostWorktreeCommand} disabled={savingCommand}>
                      {savingCommand ? "Saving..." : "Save"}
                    </Button>
                  </div>
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
                      <div className="space-y-2">
                        {projects.map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between rounded-md border p-3"
                          >
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
