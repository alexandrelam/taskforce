import { useState, useEffect } from "react";
import { Settings, Terminal as TerminalIcon } from "lucide-react";
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

const navItems = [{ name: "Terminal", icon: TerminalIcon }];

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [projectPath, setProjectPath] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetch(`${API_BASE}/api/settings/project_path`)
        .then((res) => res.json())
        .then((data) => setProjectPath(data.value || ""))
        .catch(() => {});
    }
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`${API_BASE}/api/settings/project_path`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: projectPath }),
    });
    setSaving(false);
    setOpen(false);
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
                        <SidebarMenuButton asChild isActive>
                          <a href="#">
                            <item.icon />
                            <span>{item.name}</span>
                          </a>
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
                    <BreadcrumbPage>Terminal</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </header>
            <div className="flex flex-1 flex-col gap-6 p-6">
              <div className="space-y-2">
                <Label htmlFor="project-path">Project Path</Label>
                <Input
                  id="project-path"
                  placeholder="/path/to/your/project"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  The terminal will open in this directory when launched.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  );
}
