import { useCallback, useEffect } from "react";

import { useProjects } from "@/hooks/useProjects";
import { useTerminalPanel } from "@/hooks/useTerminalPanel";
import { useTimer } from "@/hooks/useTimer";
import { useTaskBoardData } from "@/features/task-board/useTaskBoardData";

import { GlobalHeader, ProjectBoard, TerminalPanel } from "./task-board";

export function TaskBoard() {
  const {
    projects,
    selectedProjectIds,
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

  const {
    columnsByProject,
    columnEnteredAtByProject,
    taskCwdMap,
    createTicket,
    createFromBranch,
    updateTicket,
    deleteTicket,
    clearOverride,
    handleColumnsChange,
  } = useTaskBoardData(selectedProjectIds);

  const handleProjectColumnsChange = useCallback(
    (projectId: string, columns: (typeof columnsByProject)[string]) => {
      handleColumnsChange(projectId, columns);
      updateTaskFromColumns(columns);
    },
    [handleColumnsChange, updateTaskFromColumns]
  );

  const handleCreateTicket = useCallback(
    async (
      projectId: string,
      title: string,
      description: string,
      runPostCommand: boolean,
      prLink?: string,
      baseBranch?: string
    ) => {
      await createTicket(projectId, title, description, runPostCommand, prLink, baseBranch);
    },
    [createTicket]
  );

  const handleCreateFromBranch = useCallback(
    async (projectId: string, branchName: string, description: string, runPostCommand: boolean) => {
      await createFromBranch(projectId, branchName, description, runPostCommand);
    },
    [createFromBranch]
  );

  useEffect(() => {
    Object.values(columnsByProject).forEach((columns) => {
      updateTaskFromColumns(columns);
    });
  }, [columnsByProject, updateTaskFromColumns]);

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
        <div className="flex-1 flex flex-col overflow-y-auto px-6 pt-4">
          {selectedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
              <p className="text-lg mb-2">No projects selected</p>
              <p className="text-sm">Select up to 3 projects from the dropdown above</p>
            </div>
          ) : (
            selectedProjects.map((project, index) => (
              <div key={project.id} className={index > 0 ? "border-t border-border pt-4 mt-4" : ""}>
                <ProjectBoard
                  project={project}
                  columns={
                    columnsByProject[project.id] ?? { "To Do": [], "In Progress": [], Done: [] }
                  }
                  columnEnteredAt={columnEnteredAtByProject[project.id] ?? {}}
                  onOpenTask={openTask}
                  onCreateTicket={handleCreateTicket}
                  onCreateFromBranch={handleCreateFromBranch}
                  onDeleteTicket={deleteTicket}
                  onClearOverride={clearOverride}
                  onUpdateTicket={updateTicket}
                  onColumnsChange={handleProjectColumnsChange}
                  selectedTaskId={selectedTask?.id ?? null}
                />
              </div>
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
