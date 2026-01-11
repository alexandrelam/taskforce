import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { projectsApi, settingsApi } from "@/lib/api";
import type { Project } from "@/types";

const MAX_SELECTED_PROJECTS = 3;

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    const data = await projectsApi.getAll();
    setProjects(data);
    return data;
  }, []);

  const toggleProjectSelection = useCallback((project: Project) => {
    setSelectedProjects((prev) => {
      const isSelected = prev.some((p) => p.id === project.id);
      let newSelection: Project[];

      if (isSelected) {
        // Deselect
        newSelection = prev.filter((p) => p.id !== project.id);
      } else if (prev.length < MAX_SELECTED_PROJECTS) {
        // Select (if under limit)
        newSelection = [...prev, project];
      } else {
        // At limit
        toast.info(`Maximum ${MAX_SELECTED_PROJECTS} projects can be selected`);
        return prev;
      }

      // Persist to settings
      settingsApi.set("selected_projects", JSON.stringify(newSelection.map((p) => p.id)));
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
          const selected = projectIds
            .map((id) => projectList.find((p) => p.id === id))
            .filter((p): p is Project => p !== undefined);
          setSelectedProjects(selected);
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
          setSelectedProjects([project]);
          // Migrate to new format
          await settingsApi.set("selected_projects", JSON.stringify([project.id]));
        }
      }
    };
    init();
  }, [fetchProjects]);

  return {
    projects,
    selectedProjects,
    projectDropdownOpen,
    setProjectDropdownOpen,
    fetchProjects,
    toggleProjectSelection,
  };
}
