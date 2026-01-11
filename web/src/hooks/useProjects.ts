import { useState, useCallback, useEffect } from "react";
import { projectsApi, settingsApi } from "@/lib/api";
import type { Project } from "@/types";

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    const data = await projectsApi.getAll();
    setProjects(data);
    return data;
  }, []);

  const selectProject = useCallback(async (project: Project, onSelect?: () => void) => {
    setSelectedProject(project);
    setProjectDropdownOpen(false);
    onSelect?.();
    await settingsApi.set("selected_project", project.id);
  }, []);

  // Load projects and restore selection on mount
  useEffect(() => {
    const init = async () => {
      const projectList = await fetchProjects();
      const settingsData = await settingsApi.get("selected_project");
      if (settingsData.value) {
        const project = projectList.find((p) => p.id === settingsData.value);
        if (project) {
          setSelectedProject(project);
        }
      }
    };
    init();
  }, [fetchProjects]);

  return {
    projects,
    selectedProject,
    projectDropdownOpen,
    setProjectDropdownOpen,
    fetchProjects,
    selectProject,
  };
}
