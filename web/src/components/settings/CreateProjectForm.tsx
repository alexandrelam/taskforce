import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateProjectFormProps {
  onSubmit: (name: string, path: string, command: string) => Promise<void>;
}

export function CreateProjectForm({ onSubmit }: CreateProjectFormProps) {
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [command, setCommand] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !path.trim()) return;

    setSaving(true);
    try {
      await onSubmit(name.trim(), path.trim(), command.trim());
      setName("");
      setPath("");
      setCommand("");
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
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !name.trim() || !path.trim()}>
          {saving ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
