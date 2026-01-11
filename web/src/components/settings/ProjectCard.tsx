import { useState } from "react";
import { Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project } from "@/types";

const EDITOR_OPTIONS = [
  { value: "none", label: "None" },
  { value: "vscode", label: "VS Code" },
  { value: "cursor", label: "Cursor" },
  { value: "neovim", label: "Neovim" },
  { value: "intellij", label: "IntelliJ IDEA" },
];

interface ProjectCardProps {
  project: Project;
  editingCommandId: string | null;
  editingCommandValue: string;
  onEditCommandStart: (id: string, value: string) => void;
  onEditCommandChange: (value: string) => void;
  onEditCommandBlur: () => void;
  onSaveEditor: (projectId: string, editor: string) => void;
  onAddPane: (projectId: string, paneName: string) => Promise<boolean>;
  onRemovePane: (projectId: string, paneName: string) => void;
  onDelete: (projectId: string) => void;
}

export function ProjectCard({
  project,
  editingCommandId,
  editingCommandValue,
  onEditCommandStart,
  onEditCommandChange,
  onEditCommandBlur,
  onSaveEditor,
  onAddPane,
  onRemovePane,
  onDelete,
}: ProjectCardProps) {
  const [newPaneName, setNewPaneName] = useState("");
  const [paneError, setPaneError] = useState<string | null>(null);

  const handleAddPane = async () => {
    if (!newPaneName.trim()) {
      setPaneError("Pane name cannot be empty");
      return;
    }

    const existingNames = ["claude", ...project.panes.map((p) => p.name.toLowerCase())];
    if (existingNames.includes(newPaneName.trim().toLowerCase())) {
      setPaneError("Pane name already exists");
      return;
    }

    setPaneError(null);
    const success = await onAddPane(project.id, newPaneName.trim());
    if (success) {
      setNewPaneName("");
    }
  };

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{project.name}</div>
          <div className="text-sm text-muted-foreground">{project.path}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onDelete(project.id)}>
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
            onEditCommandStart(project.id, e.target.value);
            onEditCommandChange(e.target.value);
          }}
          onBlur={onEditCommandBlur}
          className="text-sm"
        />
      </div>
      <div className="border-t pt-2 mt-2">
        <Label className="text-xs text-muted-foreground">Editor</Label>
        <Select
          value={project.editor || "none"}
          onValueChange={(value) => onSaveEditor(project.id, value)}
        >
          <SelectTrigger className="w-full mt-1 h-8 text-sm">
            <SelectValue placeholder="Select an editor" />
          </SelectTrigger>
          <SelectContent>
            {EDITOR_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="border-t pt-2 mt-2">
        <Label className="text-xs text-muted-foreground">Terminal Panes</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            claude (default)
          </span>
          {project.panes.map((pane) => (
            <span
              key={pane.name}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium"
            >
              {pane.name}
              <button
                type="button"
                onClick={() => onRemovePane(project.id, pane.name)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Input
            placeholder="New pane name"
            value={newPaneName}
            onChange={(e) => {
              setPaneError(null);
              setNewPaneName(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddPane();
              }
            }}
            className="text-sm h-8"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddPane}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        {paneError && <p className="text-xs text-destructive mt-1">{paneError}</p>}
      </div>
    </div>
  );
}
