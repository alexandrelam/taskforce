import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { projectsApi, settingsApi } from "@/lib/api";
import type { Project } from "@/types";

const MAX_SELECTED_PROJECTS = 3;

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [storedSelectedProjectIds, setStoredSelectedProjectIds] = useState<string[]>([]);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    const data = await projectsApi.getAll();
    setProjects(data);
    setStoredSelectedProjectIds((prev) => {
      const filtered = prev.filter((id) => data.some((project) => project.id === id));
      if (filtered.length !== prev.length) {
        void settingsApi.set("selected_projects", JSON.stringify(filtered));
      }
      return filtered;
    });
    return data;
  }, []);

  const selectedProjectIds = storedSelectedProjectIds.filter((id) =>
    projects.some((project) => project.id === id)
  );

  const toggleProjectSelection = useCallback((project: Project) => {
    setStoredSelectedProjectIds((prev) => {
      const isSelected = prev.includes(project.id);
      let newSelection: string[];

      if (isSelected) {
        newSelection = prev.filter((id) => id !== project.id);
      } else if (prev.length < MAX_SELECTED_PROJECTS) {
        newSelection = [...prev, project.id];
      } else {
        toast.info(`Maximum ${MAX_SELECTED_PROJECTS} projects can be selected`);
        return prev;
      }

      void settingsApi.set("selected_projects", JSON.stringify(newSelection));
      return newSelection;
    });
  }, []);

  // Load projects and restore selection on mount
  useEffect(() => {
    const init = async () => {
      const projectList = await fetchProjects();

      // Try new format first
      const settingsData = await settingsApi.get("selected_projects");
      if (settingsData.value) {
        try {
          const projectIds = JSON.parse(settingsData.value) as string[];
          setStoredSelectedProjectIds(
            projectIds.filter((id) => projectList.some((project) => project.id === id))
          );
          return;
        } catch {
          // Fall through to old format
        }
      }

      // Fallback: try old single-project format for migration
      const oldSettingsData = await settingsApi.get("selected_project");
      if (oldSettingsData.value) {
        const project = projectList.find((p) => p.id === oldSettingsData.value);
        if (project) {
          setStoredSelectedProjectIds([project.id]);
          await settingsApi.set("selected_projects", JSON.stringify([project.id]));
        }
      }
    };
    init();
  }, [fetchProjects]);

  const selectedProjects = selectedProjectIds
    .map((id) => projects.find((project) => project.id === id))
    .filter((project): project is Project => project !== undefined);

  return {
    projects,
    selectedProjectIds,
    selectedProjects,
    projectDropdownOpen,
    setProjectDropdownOpen,
    fetchProjects,
    toggleProjectSelection,
  };
}
