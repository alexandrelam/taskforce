import { useReducer } from "react";
import { Loader2, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface OpenBranchDialogProps {
  disabled?: boolean;
  hasPostCommand?: boolean;
  onSubmit: (branchName: string, description: string, runPostCommand: boolean) => Promise<void>;
}

interface OpenBranchDialogState {
  open: boolean;
  branchName: string;
  description: string;
  runPostCommand: boolean;
  isOpening: boolean;
}

type OpenBranchDialogAction =
  | { type: "setOpen"; open: boolean }
  | { type: "setBranchName"; value: string }
  | { type: "setDescription"; value: string }
  | { type: "setRunPostCommand"; value: boolean }
  | { type: "startOpening" }
  | { type: "finishOpening" }
  | { type: "reset" };

const initialState: OpenBranchDialogState = {
  open: false,
  branchName: "",
  description: "",
  runPostCommand: true,
  isOpening: false,
};

function openBranchDialogReducer(
  state: OpenBranchDialogState,
  action: OpenBranchDialogAction
): OpenBranchDialogState {
  switch (action.type) {
    case "setOpen":
      return { ...state, open: action.open };
    case "setBranchName":
      return { ...state, branchName: action.value };
    case "setDescription":
      return { ...state, description: action.value };
    case "setRunPostCommand":
      return { ...state, runPostCommand: action.value };
    case "startOpening":
      return { ...state, isOpening: true };
    case "finishOpening":
      return { ...state, isOpening: false };
    case "reset":
      return {
        ...initialState,
        open: state.open,
      };
    default:
      return state;
  }
}

export function OpenBranchDialog({ disabled, hasPostCommand, onSubmit }: OpenBranchDialogProps) {
  const [state, dispatch] = useReducer(openBranchDialogReducer, initialState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.branchName.trim() || state.isOpening) return;

    dispatch({ type: "startOpening" });
    try {
      await onSubmit(state.branchName.trim(), state.description.trim(), state.runPostCommand);
      dispatch({ type: "reset" });
      dispatch({ type: "setOpen", open: false });
    } finally {
      dispatch({ type: "finishOpening" });
    }
  };

  return (
    <Dialog open={state.open} onOpenChange={(open) => dispatch({ type: "setOpen", open })}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <GitBranch className="h-4 w-4 mr-1" />
          Open Branch
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open Existing Branch</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Branch name (e.g., feature-x or origin/feature-x)"
            value={state.branchName}
            onChange={(e) => dispatch({ type: "setBranchName", value: e.target.value })}
          />
          <textarea
            placeholder="Description (optional)"
            value={state.description}
            onChange={(e) => dispatch({ type: "setDescription", value: e.target.value })}
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          />
          {hasPostCommand && (
            <div className="flex items-center justify-between">
              <Label htmlFor="run-post-command-branch" className="text-sm text-muted-foreground">
                Run post-worktree command
              </Label>
              <Switch
                id="run-post-command-branch"
                checked={state.runPostCommand}
                onCheckedChange={(value) => dispatch({ type: "setRunPostCommand", value })}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={state.isOpening}>
            {state.isOpening ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Opening...
              </>
            ) : (
              "Open Branch"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
