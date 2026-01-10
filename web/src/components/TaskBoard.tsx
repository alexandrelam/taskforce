import { useState, useRef, useCallback } from "react";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { TerminalManager, type TerminalManagerHandle } from "./TerminalManager";
import { SettingsDialog } from "./SettingsDialog";
import {
  type UniqueIdentifier,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

interface Task {
  id: string;
  title: string;
}

type Columns = Record<UniqueIdentifier, Task[]>;

const initialColumns: Columns = {
  "To Do": [
    { id: "1", title: "Setup project" },
    { id: "2", title: "Design database schema" },
  ],
  "In Progress": [{ id: "3", title: "Implement API endpoints" }],
  Done: [{ id: "4", title: "Create repository" }],
};

export function TaskBoard() {
  const [columns, setColumns] = useState<Columns>(initialColumns);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>([]);
  const terminalManagerRef = useRef<TerminalManagerHandle>(null);

  // Require 8px movement before drag starts - allows clicks to work
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  );

  const handleCardClick = (task: Task) => {
    setSelectedTask(task);
    // Add to active terminals if not already present
    setActiveTaskIds((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]));
  };

  const handleClosePanel = useCallback(() => {
    // Close all terminal sessions when panel is closed
    terminalManagerRef.current?.closeAll();
    setActiveTaskIds([]);
    setSelectedTask(null);
  }, []);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Kanban Board */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Task Board</h1>
          <SettingsDialog />
        </div>
        <Kanban
          value={columns}
          onValueChange={setColumns}
          getItemValue={(item) => item.id}
          sensors={sensors}
        >
          <KanbanBoard>
            {Object.entries(columns).map(([columnId, tasks]) => (
              <KanbanColumn key={columnId} value={columnId} className="w-80 shrink-0">
                <div className="font-semibold text-muted-foreground mb-2 px-1">
                  {columnId}
                  <span className="ml-2 text-zinc-500 text-sm">{tasks.length}</span>
                </div>
                {tasks.map((task) => (
                  <KanbanItem
                    key={task.id}
                    value={task.id}
                    asHandle
                    onClick={() => handleCardClick(task)}
                    className="p-3 bg-card rounded-md border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="text-sm">{task.title}</div>
                  </KanbanItem>
                ))}
              </KanbanColumn>
            ))}
          </KanbanBoard>
          <KanbanOverlay>
            {({ value, variant }) => {
              if (variant === "column") {
                return (
                  <div className="w-80 p-3 bg-card rounded-lg border border-border opacity-90">
                    {value}
                  </div>
                );
              }
              const task = Object.values(columns)
                .flat()
                .find((t) => t.id === value);
              return (
                <div className="p-3 bg-card rounded-md border border-border opacity-90">
                  {task?.title}
                </div>
              );
            }}
          </KanbanOverlay>
        </Kanban>
      </div>

      {/* Terminal Panel */}
      {selectedTask && (
        <div className="w-[600px] border-l border-border flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <div className="text-sm text-muted-foreground">Terminal</div>
              <div className="font-medium">{selectedTask.title}</div>
            </div>
            <button
              onClick={handleClosePanel}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 p-4">
            <TerminalManager
              ref={terminalManagerRef}
              activeTaskIds={activeTaskIds}
              currentTaskId={selectedTask.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}
