import { useState, useRef, useCallback, useEffect } from "react";
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  KanbanOverlay,
} from "@/components/ui/kanban";
import { TerminalManager, type TerminalManagerHandle } from "./TerminalManager";
import { SettingsDialog } from "./SettingsDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  type UniqueIdentifier,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

const API_BASE = "http://localhost:3000";
const STORAGE_KEY_ACTIVE_TASKS = "terminal_active_task_ids";
const STORAGE_KEY_SELECTED_TASK = "terminal_selected_task_id";

interface Task {
  id: string;
  title: string;
}

type Columns = Record<UniqueIdentifier, Task[]>;

const COLUMN_ORDER = ["To Do", "In Progress", "Done"];

function getStoredActiveTaskIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_TASKS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getStoredSelectedTaskId(): string | null {
  return localStorage.getItem(STORAGE_KEY_SELECTED_TASK);
}

export function TaskBoard() {
  const [columns, setColumns] = useState<Columns>({
    "To Do": [],
    "In Progress": [],
    Done: [],
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTaskIds, setActiveTaskIds] = useState<string[]>(getStoredActiveTaskIds);
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const terminalManagerRef = useRef<TerminalManagerHandle>(null);
  const previousColumnsRef = useRef<Columns | null>(null);

  // Require 8px movement before drag starts - allows clicks to work
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } })
  );

  // Fetch tickets on mount and restore selected task from localStorage
  useEffect(() => {
    fetch(`${API_BASE}/api/tickets`)
      .then((res) => res.json())
      .then((tickets: { id: string; title: string; column: string }[]) => {
        const newColumns: Columns = {
          "To Do": [],
          "In Progress": [],
          Done: [],
        };
        tickets.forEach((ticket) => {
          const col = newColumns[ticket.column];
          if (col) {
            col.push({ id: ticket.id, title: ticket.title });
          }
        });
        setColumns(newColumns);

        // Restore selected task from localStorage if it exists
        const storedSelectedId = getStoredSelectedTaskId();
        if (storedSelectedId) {
          const task = tickets.find((t) => t.id === storedSelectedId);
          if (task) {
            setSelectedTask({ id: task.id, title: task.title });
          }
        }
      })
      .catch(console.error);
  }, []);

  // Persist activeTaskIds to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACTIVE_TASKS, JSON.stringify(activeTaskIds));
  }, [activeTaskIds]);

  // Persist selected task ID to localStorage
  useEffect(() => {
    if (selectedTask) {
      localStorage.setItem(STORAGE_KEY_SELECTED_TASK, selectedTask.id);
    } else {
      localStorage.removeItem(STORAGE_KEY_SELECTED_TASK);
    }
  }, [selectedTask]);

  const handleCardClick = (task: Task) => {
    setSelectedTask(task);
    // Add to active terminals if not already present
    setActiveTaskIds((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]));
  };

  const handleClosePanel = useCallback(() => {
    // Kill all terminal sessions when panel is explicitly closed
    terminalManagerRef.current?.killAll();
    setActiveTaskIds([]);
    setSelectedTask(null);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_TASKS);
    localStorage.removeItem(STORAGE_KEY_SELECTED_TASK);
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTicketTitle.trim() }),
      });
      const ticket = await res.json();
      setColumns((prev) => ({
        ...prev,
        "To Do": [...prev["To Do"], { id: ticket.id, title: ticket.title }],
      }));
      setNewTicketTitle("");
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to create ticket:", error);
    }
  };

  const handleDeleteTicket = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE}/api/tickets/${taskId}`, { method: "DELETE" });

      // Kill terminal session for this ticket if it exists
      terminalManagerRef.current?.killOne(taskId);
      setActiveTaskIds((prev) => prev.filter((id) => id !== taskId));

      setColumns((prev) => {
        const newColumns: Columns = {};
        for (const [colId, tasks] of Object.entries(prev)) {
          newColumns[colId] = tasks.filter((t) => t.id !== taskId);
        }
        return newColumns;
      });

      // If deleted task was selected, clear selection
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      console.error("Failed to delete ticket:", error);
    }
  };

  const handleColumnsChange = (newColumns: Columns) => {
    const prev = previousColumnsRef.current || columns;

    // Find task that moved columns
    for (const [colId, tasks] of Object.entries(newColumns)) {
      for (const task of tasks) {
        const wasInColumn = prev[colId]?.some((t) => t.id === task.id);
        if (!wasInColumn) {
          // Task moved to this column, persist to backend
          fetch(`${API_BASE}/api/tickets/${task.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ column: colId }),
          }).catch(console.error);
          break;
        }
      }
    }

    previousColumnsRef.current = newColumns;
    setColumns(newColumns);
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Kanban Board */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Task Board</h1>
          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Add Ticket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Ticket</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTicket} className="space-y-4">
                  <Input
                    placeholder="Ticket title"
                    value={newTicketTitle}
                    onChange={(e) => setNewTicketTitle(e.target.value)}
                    autoFocus
                  />
                  <Button type="submit" className="w-full">
                    Create
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <SettingsDialog />
          </div>
        </div>
        <Kanban
          value={columns}
          onValueChange={handleColumnsChange}
          getItemValue={(item) => item.id}
          sensors={sensors}
        >
          <KanbanBoard>
            {COLUMN_ORDER.map((columnId) => {
              const tasks = columns[columnId] || [];
              return (
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
                      className="group p-3 bg-card rounded-md border border-border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm">{task.title}</div>
                        <button
                          onClick={(e) => handleDeleteTicket(e, task.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </KanbanItem>
                  ))}
                </KanbanColumn>
              );
            })}
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
