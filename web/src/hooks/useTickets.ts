import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ticketsApi } from "@/lib/api";
import type { Columns, Task, TicketResponse } from "@/types";

const INITIAL_COLUMNS: Columns = {
  "To Do": [],
  "In Progress": [],
  Done: [],
};

export function useTickets(selectedProjectId: string | null) {
  const [columns, setColumns] = useState<Columns>(INITIAL_COLUMNS);
  const [columnEnteredAt, setColumnEnteredAt] = useState<Record<string, number>>({});
  const previousColumnsRef = useRef<Columns | null>(null);
  const previousSetupStatusRef = useRef<Record<string, string>>({});

  // Fetch tickets with polling
  useEffect(() => {
    if (!selectedProjectId) {
      setColumns(INITIAL_COLUMNS);
      return;
    }

    const fetchTickets = () => {
      ticketsApi
        .getByProject(selectedProjectId)
        .then((tickets: TicketResponse[]) => {
          const newColumns: Columns = {
            "To Do": [],
            "In Progress": [],
            Done: [],
          };
          tickets.forEach((ticket) => {
            const col = newColumns[ticket.column];
            if (col) {
              col.push({
                id: ticket.id,
                title: ticket.title,
                worktreePath: ticket.worktreePath,
                isMain: ticket.isMain,
                setupStatus: ticket.setupStatus,
                setupError: ticket.setupError,
                setupLogs: ticket.setupLogs,
                setupTmuxSession: ticket.setupTmuxSession,
                description: ticket.description,
                statusOverride: ticket.statusOverride,
                prLink: ticket.prLink,
              });
            }
          });
          setColumns(newColumns);

          // Detect setup status changes and show toast for failures
          tickets.forEach((ticket) => {
            const prevStatus = previousSetupStatusRef.current[ticket.id];
            const currentStatus = ticket.setupStatus;

            // Detect transition to failed state
            if (prevStatus === "running_post_command" && currentStatus === "failed") {
              toast.error("Setup failed", {
                description: ticket.setupError || "The setup process encountered an error",
              });
            }

            // Update previous status
            if (currentStatus) {
              previousSetupStatusRef.current[ticket.id] = currentStatus;
            }
          });

          // Initialize columnEnteredAt for new tickets
          setColumnEnteredAt((prev) => {
            const now = Date.now();
            const updated = { ...prev };
            tickets.forEach((ticket) => {
              if (!(ticket.id in updated)) {
                updated[ticket.id] = now;
              }
            });
            return updated;
          });
        })
        .catch(console.error);
    };

    fetchTickets();
    const intervalId = setInterval(fetchTickets, 2000);
    return () => clearInterval(intervalId);
  }, [selectedProjectId]);

  const createTicket = useCallback(
    async (
      title: string,
      description?: string,
      runPostCommand: boolean = true,
      prLink?: string
    ) => {
      if (!selectedProjectId) return null;

      const ticket = await ticketsApi.create({
        title: title.trim(),
        projectId: selectedProjectId,
        description: description?.trim() || null,
        runPostCommand,
        prLink: prLink?.trim() || null,
      });

      setColumns((prev) => ({
        ...prev,
        "To Do": [
          ...prev["To Do"],
          {
            id: ticket.id,
            title: ticket.title,
            worktreePath: ticket.worktreePath,
            setupStatus: ticket.setupStatus,
            description: ticket.description,
            prLink: ticket.prLink,
          },
        ],
      }));

      return ticket;
    },
    [selectedProjectId]
  );

  const createFromBranch = useCallback(
    async (
      branchName: string,
      description?: string,
      runPostCommand: boolean = true,
      prLink?: string
    ) => {
      if (!selectedProjectId) return null;

      const ticket = await ticketsApi.createFromBranch({
        branchName: branchName.trim(),
        projectId: selectedProjectId,
        description: description?.trim() || null,
        runPostCommand,
        prLink: prLink?.trim() || null,
      });

      setColumns((prev) => ({
        ...prev,
        "To Do": [
          ...prev["To Do"],
          {
            id: ticket.id,
            title: ticket.title,
            worktreePath: ticket.worktreePath,
            setupStatus: ticket.setupStatus,
            description: ticket.description,
            prLink: ticket.prLink,
          },
        ],
      }));

      return ticket;
    },
    [selectedProjectId]
  );

  const deleteTicket = useCallback(async (taskId: string) => {
    await ticketsApi.delete(taskId);
    setColumns((prev) => {
      const newColumns: Columns = {};
      for (const [colId, tasks] of Object.entries(prev)) {
        newColumns[colId] = tasks.filter((t) => t.id !== taskId);
      }
      return newColumns;
    });
  }, []);

  const clearOverride = useCallback(async (taskId: string) => {
    await ticketsApi.clearOverride(taskId);
    setColumns((prev) => {
      const newColumns: Columns = {};
      for (const [colId, tasks] of Object.entries(prev)) {
        newColumns[colId] = tasks.map((t) =>
          t.id === taskId ? { ...t, statusOverride: false } : t
        );
      }
      return newColumns;
    });
    toast.success("Override cleared", {
      description: "Automatic status tracking re-enabled",
    });
  }, []);

  const handleColumnsChange = useCallback(
    (newColumns: Columns) => {
      const prev = previousColumnsRef.current || columns;

      // Find task that moved columns
      for (const [colId, tasks] of Object.entries(newColumns)) {
        for (const task of tasks) {
          const wasInColumn = prev[colId]?.some((t: Task) => t.id === task.id);
          if (!wasInColumn) {
            // Task moved to this column, persist to backend
            ticketsApi.update(task.id, { column: colId }).catch(console.error);
            // Reset timer when ticket moves to a different column
            setColumnEnteredAt((prevTimes) => ({
              ...prevTimes,
              [task.id]: Date.now(),
            }));
            break;
          }
        }
      }

      previousColumnsRef.current = newColumns;
      setColumns(newColumns);
    },
    [columns]
  );

  return {
    columns,
    columnEnteredAt,
    createTicket,
    createFromBranch,
    deleteTicket,
    clearOverride,
    handleColumnsChange,
  };
}
