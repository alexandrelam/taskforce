import { useState } from "react";
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

interface CreateTicketDialogProps {
  disabled?: boolean;
  hasPostCommand?: boolean;
  onSubmit: (
    title: string,
    description: string,
    runPostCommand: boolean,
    prLink?: string
  ) => Promise<void>;
}

export function CreateTicketDialog({
  disabled,
  hasPostCommand,
  onSubmit,
}: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prLink, setPrLink] = useState("");
  const [runPostCommand, setRunPostCommand] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onSubmit(title.trim(), description.trim(), runPostCommand, prLink.trim());
      setTitle("");
      setDescription("");
      setPrLink("");
      setRunPostCommand(true);
      setOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
          />
          <Input
            placeholder="PR link (optional, e.g., https://github.com/...)"
            value={prLink}
            onChange={(e) => setPrLink(e.target.value)}
          />
          {hasPostCommand && (
            <div className="flex items-center justify-between">
              <Label htmlFor="run-post-command" className="text-sm text-muted-foreground">
                Run post-worktree command
              </Label>
              <Switch
                id="run-post-command"
                checked={runPostCommand}
                onCheckedChange={setRunPostCommand}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isCreating}>
            {isCreating ? (
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
