import { useReducer } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface CreateProjectFormProps {
  onSubmit: (name: string, path: string, command: string, useWorktrees: boolean) => Promise<void>;
}

interface CreateProjectFormState {
  name: string;
  path: string;
  command: string;
  useWorktrees: boolean;
  saving: boolean;
}

type CreateProjectFormAction =
  | { type: "setName"; value: string }
  | { type: "setPath"; value: string }
  | { type: "setCommand"; value: string }
  | { type: "setUseWorktrees"; value: boolean }
  | { type: "startSaving" }
  | { type: "finishSaving" }
  | { type: "reset" };

const initialState: CreateProjectFormState = {
  name: "",
  path: "",
  command: "",
  useWorktrees: true,
  saving: false,
};

function createProjectFormReducer(
  state: CreateProjectFormState,
  action: CreateProjectFormAction
): CreateProjectFormState {
  switch (action.type) {
    case "setName":
      return { ...state, name: action.value };
    case "setPath":
      return { ...state, path: action.value };
    case "setCommand":
      return { ...state, command: action.value };
    case "setUseWorktrees":
      return { ...state, useWorktrees: action.value };
    case "startSaving":
      return { ...state, saving: true };
    case "finishSaving":
      return { ...state, saving: false };
    case "reset":
      return initialState;
    default:
      return state;
  }
}

export function CreateProjectForm({ onSubmit }: CreateProjectFormProps) {
  const [state, dispatch] = useReducer(createProjectFormReducer, initialState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.name.trim() || !state.path.trim()) return;

    dispatch({ type: "startSaving" });
    try {
      await onSubmit(
        state.name.trim(),
        state.path.trim(),
        state.command.trim(),
        state.useWorktrees
      );
      dispatch({ type: "reset" });
    } finally {
      dispatch({ type: "finishSaving" });
    }
  };

  const isSubmitDisabled = state.saving || !state.name.trim() || !state.path.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
      <Label>Add New Project</Label>
      <div className="space-y-2">
        <Input
          placeholder="Project name"
          value={state.name}
          onChange={(e) => dispatch({ type: "setName", value: e.target.value })}
        />
        <Input
          placeholder="/path/to/your/project"
          value={state.path}
          onChange={(e) => dispatch({ type: "setPath", value: e.target.value })}
        />
        <Input
          placeholder="Post-worktree command (e.g., npm i)"
          value={state.command}
          onChange={(e) => dispatch({ type: "setCommand", value: e.target.value })}
        />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-muted-foreground">Use worktrees</Label>
            <p className="text-xs text-muted-foreground/70">
              When disabled, tickets use branches only
            </p>
          </div>
          <Switch
            checked={state.useWorktrees}
            onCheckedChange={(value) => dispatch({ type: "setUseWorktrees", value })}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitDisabled}>
          {state.saving ? "Creating..." : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
