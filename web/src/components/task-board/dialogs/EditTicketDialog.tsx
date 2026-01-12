import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Task } from "@/types";

interface EditTicketDialogProps {
  task: Task | null;
  onSubmit: (description: string, prLink: string) => Promise<void>;
  onCancel: () => void;
}

export function EditTicketDialog({ task, onSubmit, onCancel }: EditTicketDialogProps) {
  const [description, setDescription] = useState("");
  const [prLink, setPrLink] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setDescription(task.description || "");
      setPrLink(task.prLink || "");
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUpdating) return;

    // Basic URL validation
    const trimmedPrLink = prLink.trim();
    if (
      trimmedPrLink &&
      !trimmedPrLink.startsWith("http://") &&
      !trimmedPrLink.startsWith("https://")
    ) {
      alert("PR link must be a valid URL starting with http:// or https://");
      return;
    }

    setIsUpdating(true);
    try {
      await onSubmit(description.trim(), trimmedPrLink);
      onCancel();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={!!task} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
            autoFocus
          />
          <Input
            placeholder="PR link (optional, e.g., https://github.com/...)"
            value={prLink}
            onChange={(e) => setPrLink(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              "Update"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
