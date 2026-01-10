import { useState } from "react";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { Terminal } from "./Terminal";
import type { UniqueIdentifier } from "@dnd-kit/core";

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

  const handleCardClick = (task: Task, e: React.MouseEvent) => {
    // Prevent opening terminal when dragging
    if ((e.target as HTMLElement).closest("[data-dragging]")) return;
    setSelectedTask(task);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      {/* Kanban Board */}
      <div className="flex-1 p-6 overflow-auto">
        <h1 className="text-2xl font-bold mb-6">Task Board</h1>
        <Kanban value={columns} onValueChange={setColumns} getItemValue={(item) => item.id}>
          <KanbanBoard>
            {Object.entries(columns).map(([columnId, tasks]) => (
              <KanbanColumn key={columnId} value={columnId} className="w-80 shrink-0">
                <div className="font-semibold text-zinc-300 mb-2 px-1">
                  {columnId}
                  <span className="ml-2 text-zinc-500 text-sm">{tasks.length}</span>
                </div>
                {tasks.map((task) => (
                  <KanbanItem
                    key={task.id}
                    value={task.id}
                    asHandle
                    onClick={(e) => handleCardClick(task, e)}
                    className="p-3 bg-zinc-800 rounded-md border border-zinc-700 hover:border-zinc-500 transition-colors"
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
                  <div className="w-80 p-3 bg-zinc-800 rounded-lg border border-zinc-600 opacity-90">
                    {value}
                  </div>
                );
              }
              const task = Object.values(columns)
                .flat()
                .find((t) => t.id === value);
              return (
                <div className="p-3 bg-zinc-800 rounded-md border border-zinc-500 opacity-90">
                  {task?.title}
                </div>
              );
            }}
          </KanbanOverlay>
        </Kanban>
      </div>

      {/* Terminal Panel */}
      {selectedTask && (
        <div className="w-[600px] border-l border-zinc-800 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <div>
              <div className="text-sm text-zinc-400">Terminal</div>
              <div className="font-medium">{selectedTask.title}</div>
            </div>
            <button
              onClick={() => setSelectedTask(null)}
              className="text-zinc-400 hover:text-white p-1"
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
            <Terminal key={selectedTask.id} />
          </div>
        </div>
      )}
    </div>
  );
}
