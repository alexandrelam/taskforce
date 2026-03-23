import { useReducer } from "react";
import { Loader2 } from "lucide-react";
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
import { usePrAutoFill } from "@/hooks/usePrAutoFill";

interface CreateTicketDialogProps {
  disabled?: boolean;
  hasPostCommand?: boolean;
  onSubmit: (
    title: string,
    description: string,
    runPostCommand: boolean,
    prLink?: string,
    baseBranch?: string
  ) => Promise<void>;
}

interface CreateTicketDialogState {
  open: boolean;
  title: string;
  description: string;
  prLink: string;
  baseBranch: string;
  runPostCommand: boolean;
  isCreating: boolean;
}

type CreateTicketDialogAction =
  | { type: "setOpen"; open: boolean }
  | { type: "setTitle"; value: string }
  | { type: "setDescription"; value: string }
  | { type: "setPrLink"; value: string }
  | { type: "setBaseBranch"; value: string }
  | { type: "setRunPostCommand"; value: boolean }
  | { type: "startCreating" }
  | { type: "finishCreating" }
  | { type: "reset" };

const initialState: CreateTicketDialogState = {
  open: false,
  title: "",
  description: "",
  prLink: "",
  baseBranch: "",
  runPostCommand: true,
  isCreating: false,
};

function createTicketDialogReducer(
  state: CreateTicketDialogState,
  action: CreateTicketDialogAction
): CreateTicketDialogState {
  switch (action.type) {
    case "setOpen":
      return { ...state, open: action.open };
    case "setTitle":
      return { ...state, title: action.value };
    case "setDescription":
      return { ...state, description: action.value };
    case "setPrLink":
      return { ...state, prLink: action.value };
    case "setBaseBranch":
      return { ...state, baseBranch: action.value };
    case "setRunPostCommand":
      return { ...state, runPostCommand: action.value };
    case "startCreating":
      return { ...state, isCreating: true };
    case "finishCreating":
      return { ...state, isCreating: false };
    case "reset":
      return {
        ...initialState,
        open: state.open,
      };
    default:
      return state;
  }
}

export function CreateTicketDialog({
  disabled,
  hasPostCommand,
  onSubmit,
}: CreateTicketDialogProps) {
  const [state, dispatch] = useReducer(createTicketDialogReducer, initialState);
  const { isFetchingPr, handlePrLinkPaste } = usePrAutoFill({
    title: state.title,
    baseBranch: state.baseBranch,
    setTitle: (value) => dispatch({ type: "setTitle", value }),
    setBaseBranch: (value) => dispatch({ type: "setBaseBranch", value }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.title.trim() || state.isCreating) return;

    dispatch({ type: "startCreating" });
    try {
      await onSubmit(
        state.title.trim(),
        state.description.trim(),
        state.runPostCommand,
        state.prLink.trim(),
        state.baseBranch.trim() || undefined
      );
      dispatch({ type: "reset" });
      dispatch({ type: "setOpen", open: false });
    } finally {
      dispatch({ type: "finishCreating" });
    }
  };

  return (
    <Dialog open={state.open} onOpenChange={(open) => dispatch({ type: "setOpen", open })}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          Add Ticket
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Ticket title"
            value={state.title}
            onChange={(e) => dispatch({ type: "setTitle", value: e.target.value })}
          />
          <textarea
            placeholder="Description (optional)"
            value={state.description}
            onChange={(e) => dispatch({ type: "setDescription", value: e.target.value })}
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          />
          <div className="relative">
            <Input
              placeholder="PR link (optional, e.g., https://github.com/...)"
              value={state.prLink}
              onChange={(e) => dispatch({ type: "setPrLink", value: e.target.value })}
              onPaste={handlePrLinkPaste}
            />
            {isFetchingPr && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Input
            placeholder="Base branch (optional, defaults to current branch)"
            value={state.baseBranch}
            onChange={(e) => dispatch({ type: "setBaseBranch", value: e.target.value })}
          />
          {hasPostCommand && (
            <div className="flex items-center justify-between">
              <Label htmlFor="run-post-command" className="text-sm text-muted-foreground">
                Run post-worktree command
              </Label>
              <Switch
                id="run-post-command"
                checked={state.runPostCommand}
                onCheckedChange={(value) => dispatch({ type: "setRunPostCommand", value })}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={state.isCreating}>
            {state.isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
