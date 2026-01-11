import { useState, useMemo, useCallback } from "react";

import { useProjects } from "@/hooks/useProjects";
import { useTerminalPanel } from "@/hooks/useTerminalPanel";
import { useTimer } from "@/hooks/useTimer";

import { GlobalHeader, ProjectBoard, TerminalPanel } from "./task-board";

import type { Columns } from "@/types";

export function TaskBoard() {
  // Custom hooks
  const {
    projects,
    selectedProjects,
    projectDropdownOpen,
    setProjectDropdownOpen,
    fetchProjects,
    toggleProjectSelection,
  } = useProjects();

  const {
    selectedTask,
    selectedProjectId,
    activeTaskIds,
    currentPane,
    setCurrentPane,
    terminalManagerRef,
    openTask,
    closePanel,
    updateTaskFromColumns,
  } = useTerminalPanel();

  useTimer();

  // Track all columns from all projects for terminal cwd mapping
  const [allColumns, setAllColumns] = useState<Record<string, Columns>>({});

  // Handle columns change from any ProjectBoard
  const handleColumnsChange = useCallback(
    (projectId: string, columns: Columns) => {
      setAllColumns((prev) => ({ ...prev, [projectId]: columns }));
      updateTaskFromColumns(columns);
    },
    [updateTaskFromColumns]
  );

  // Build combined cwd map from all projects' columns
  const taskCwdMap = useMemo(() => {
    const map: Record<string, string | null | undefined> = {};
    Object.values(allColumns).forEach((columns) => {
      Object.values(columns)
        .flat()
        .forEach((task) => {
          if (task.worktreePath) {
            map[task.id] = task.worktreePath;
          }
        });
    });
    return map;
  }, [allColumns]);

  // Find the project for the selected task
  const selectedProject = selectedProjects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left: Boards Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global Header */}
        <GlobalHeader
          projects={projects}
          selectedProjects={selectedProjects}
          projectDropdownOpen={projectDropdownOpen}
          onProjectDropdownToggle={() => setProjectDropdownOpen(!projectDropdownOpen)}
          onToggleProject={toggleProjectSelection}
          onProjectsChange={fetchProjects}
        />

        {/* Stacked Boards */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {selectedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
              <p className="text-lg mb-2">No projects selected</p>
              <p className="text-sm">Select up to 3 projects from the dropdown above</p>
            </div>
          ) : (
            selectedProjects.map((project) => (
              <ProjectBoard
                key={project.id}
                project={project}
                onOpenTask={openTask}
                onColumnsChange={(columns) => handleColumnsChange(project.id, columns)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Terminal Panel (shared) */}
      {selectedTask && (
        <TerminalPanel
          selectedTask={selectedTask}
          selectedProject={selectedProject}
          currentPane={currentPane}
          activeTaskIds={activeTaskIds}
          taskCwdMap={taskCwdMap}
          terminalManagerRef={terminalManagerRef}
          onPaneChange={setCurrentPane}
          onClose={closePanel}
        />
      )}
    </div>
  );
}
