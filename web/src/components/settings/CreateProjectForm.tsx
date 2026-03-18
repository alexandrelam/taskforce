import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CreateProjectFormProps {
  onSubmit: (name: string, path: string, command: string, useWorktrees: boolean) => Promise<void>;
}

export function CreateProjectForm({ onSubmit }: CreateProjectFormProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [command, setCommand] = useState("");
  const [useWorktrees, setUseWorktrees] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) return;

    setSaving(true);
    try {
      await onSubmit(name.trim(), path.trim(), command.trim(), useWorktrees);
      setName("");
      setPath("");
      setCommand("");
      setUseWorktrees(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
      <Label>Add New Project</Label>
      <div className="space-y-2">
        <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          placeholder="/path/to/your/project"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        />
        <Input
          placeholder="Post-worktree command (e.g., npm i)"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-muted-foreground">Use worktrees</Label>
            <p className="text-xs text-muted-foreground/70">
              When disabled, tickets use branches only
            </p>
          </div>
          <Switch checked={useWorktrees} onCheckedChange={setUseWorktrees} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !name.trim() || !path.trim()}>
          {saving ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
