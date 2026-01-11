import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { projectsApi } from "@/lib/api";
import type { CommitInfo } from "@/types";

export function useGitOperations(selectedProjectId: string | null) {
  const [commitInfo, setCommitInfo] = useState<CommitInfo | null>(null);
  const [isPulling, setIsPulling] = useState(false);

  const fetchCommitInfo = useCallback(async () => {
    if (!selectedProjectId) {
      setCommitInfo(null);
      return;
    }
    const info = await projectsApi.getCommit(selectedProjectId);
    setCommitInfo(info);
  }, [selectedProjectId]);

  const pull = useCallback(async () => {
    if (!selectedProjectId || isPulling) return;

    setIsPulling(true);
    try {
      const data = await projectsApi.pull(selectedProjectId);

      if (data.success) {
        toast.success("Git pull successful", {
          description: data.output?.trim() || "Repository updated",
        });
        fetchCommitInfo();
      } else {
        toast.error("Git pull failed", {
          description: data.error,
        });
      }
    } catch (error) {
      toast.error("Git pull failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsPulling(false);
    }
  }, [selectedProjectId, isPulling, fetchCommitInfo]);

  useEffect(() => {
    fetchCommitInfo();
  }, [fetchCommitInfo]);

  return {
    commitInfo,
    isPulling,
    pull,
    fetchCommitInfo,
  };
}
