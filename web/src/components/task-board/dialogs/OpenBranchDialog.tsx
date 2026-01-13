import { useState } from "react";
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

export function OpenBranchDialog({ disabled, hasPostCommand, onSubmit }: OpenBranchDialogProps) {
  const [open, setOpen] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [description, setDescription] = useState("");
  const [runPostCommand, setRunPostCommand] = useState(true);
  const [isOpening, setIsOpening] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || isOpening) return;

    setIsOpening(true);
    try {
      await onSubmit(branchName.trim(), description.trim(), runPostCommand);
      setBranchName("");
      setDescription("");
      setRunPostCommand(true);
      setOpen(false);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          />
          {hasPostCommand && (
            <div className="flex items-center justify-between">
              <Label htmlFor="run-post-command-branch" className="text-sm text-muted-foreground">
                Run post-worktree command
              </Label>
              <Switch
                id="run-post-command-branch"
                checked={runPostCommand}
                onCheckedChange={setRunPostCommand}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isOpening}>
            {isOpening ? (
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
