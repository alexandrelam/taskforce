import { useState, useEffect } from "react";
import { projectsApi } from "@/lib/api";

export type PrSuggestion = {
  title: string;
  url: string;
  headRefName: string;
  number: number;
};

export function usePrSuggestions(projectId: string | null) {
  const [suggestions, setSuggestions] = useState<PrSuggestion[]>([]);

  useEffect(() => {
    if (!projectId) return;
    projectsApi.getPrSuggestions(projectId).then(setSuggestions);
  }, [projectId]);

  return { suggestions, setSuggestions };
}
