import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ticketsApi } from "@/lib/api";
import type { Columns, Task, TicketResponse } from "@/types";

const INITIAL_COLUMNS: Columns = {
  "To Do": [],
  "In Progress": [],
  Done: [],
};

function createEmptyColumns(): Columns {
  return {
    "To Do": [],
    "In Progress": [],
    Done: [],
  };
}

function mapTicketToTask(ticket: TicketResponse): Task {
  return {
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
    prState: ticket.prState ? JSON.parse(ticket.prState) : null,
  };
}

function mapTicketsToColumns(tickets: TicketResponse[]): Columns {
  const nextColumns = createEmptyColumns();

  for (const ticket of tickets) {
    const column = nextColumns[ticket.column];
    if (column) {
      column.push(mapTicketToTask(ticket));
    }
  }

  return nextColumns;
}

export function useTaskBoardData(selectedProjectIds: string[]) {
  const [storedColumnsByProject, setStoredColumnsByProject] = useState<Record<string, Columns>>({});
  const [storedColumnEnteredAtByProject, setStoredColumnEnteredAtByProject] = useState<
    Record<string, Record<string, number>>
  >({});
  const previousSetupStatusRef = useRef<Record<string, string>>({});

  const fetchProjectTickets = useCallback(async (projectId: string) => {
    const tickets = await ticketsApi.getByProject(projectId);

    setStoredColumnsByProject((prev) => ({
      ...prev,
      [projectId]: mapTicketsToColumns(tickets),
    }));

    setStoredColumnEnteredAtByProject((prev) => {
      const now = Date.now();
      const current = { ...(prev[projectId] ?? {}) };
      for (const ticket of tickets) {
        if (!(ticket.id in current)) {
          current[ticket.id] = now;
        }
      }
      return {
        ...prev,
        [projectId]: current,
      };
    });

    for (const ticket of tickets) {
      const prevStatus = previousSetupStatusRef.current[ticket.id];
      const currentStatus = ticket.setupStatus;

      if (prevStatus === "running_post_command" && currentStatus === "failed") {
        toast.error("Setup failed", {
          description: ticket.setupError || "The setup process encountered an error",
        });
      }

      if (currentStatus) {
        previousSetupStatusRef.current[ticket.id] = currentStatus;
      }
    }

    return tickets;
  }, []);

  useEffect(() => {
    if (selectedProjectIds.length === 0) return;

    let cancelled = false;

    const refresh = async () => {
      try {
        await Promise.all(selectedProjectIds.map((projectId) => fetchProjectTickets(projectId)));
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch tickets", error);
        }
      }
    };

    refresh();
    const intervalId = window.setInterval(refresh, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [fetchProjectTickets, selectedProjectIds]);

  const columnsByProject = useMemo(() => {
    const next: Record<string, Columns> = {};
    for (const projectId of selectedProjectIds) {
      next[projectId] = storedColumnsByProject[projectId] ?? createEmptyColumns();
    }
    return next;
  }, [selectedProjectIds, storedColumnsByProject]);

  const columnEnteredAtByProject = useMemo(() => {
    const next: Record<string, Record<string, number>> = {};
    for (const projectId of selectedProjectIds) {
      next[projectId] = storedColumnEnteredAtByProject[projectId] ?? {};
    }
    return next;
  }, [selectedProjectIds, storedColumnEnteredAtByProject]);

  const createTicket = useCallback(
    async (
      projectId: string,
      title: string,
      description?: string,
      runPostCommand: boolean = true,
      prLink?: string,
      baseBranch?: string
    ) => {
      const ticket = await ticketsApi.create({
        title: title.trim(),
        projectId,
        description: description?.trim() || null,
        runPostCommand,
        prLink: prLink?.trim() || null,
        baseBranch: baseBranch?.trim() || null,
      });
      await fetchProjectTickets(projectId);
      return ticket;
    },
    [fetchProjectTickets]
  );

  const createFromBranch = useCallback(
    async (
      projectId: string,
      branchName: string,
      description?: string,
      runPostCommand: boolean = true,
      prLink?: string
    ) => {
      const ticket = await ticketsApi.createFromBranch({
        branchName: branchName.trim(),
        projectId,
        description: description?.trim() || null,
        runPostCommand,
        prLink: prLink?.trim() || null,
      });
      await fetchProjectTickets(projectId);
      return ticket;
    },
    [fetchProjectTickets]
  );

  const updateTicket = useCallback(
    async (
      projectId: string,
      ticketId: string,
      data: { column?: string; description?: string | null; prLink?: string | null }
    ) => {
      await ticketsApi.update(ticketId, data);
      await fetchProjectTickets(projectId);
    },
    [fetchProjectTickets]
  );

  const deleteTicket = useCallback(
    async (projectId: string, ticketId: string) => {
      await ticketsApi.delete(ticketId);
      await fetchProjectTickets(projectId);
    },
    [fetchProjectTickets]
  );

  const clearOverride = useCallback(
    async (projectId: string, ticketId: string) => {
      await ticketsApi.clearOverride(ticketId);
      await fetchProjectTickets(projectId);
      toast.success("Override cleared", {
        description: "Automatic status tracking re-enabled",
      });
    },
    [fetchProjectTickets]
  );

  const handleColumnsChange = useCallback(
    (projectId: string, nextColumns: Columns) => {
      const previousColumns = columnsByProject[projectId] ?? INITIAL_COLUMNS;

      setStoredColumnsByProject((prev) => ({
        ...prev,
        [projectId]: nextColumns,
      }));

      for (const [columnId, tasks] of Object.entries(nextColumns)) {
        for (const task of tasks) {
          const wasInColumn = previousColumns[columnId]?.some(
            (candidate) => candidate.id === task.id
          );
          if (!wasInColumn) {
            void ticketsApi.update(task.id, { column: columnId }).catch((error) => {
              console.error("Failed to persist ticket column change", error);
              void fetchProjectTickets(projectId);
            });
            setStoredColumnEnteredAtByProject((prev) => ({
              ...prev,
              [projectId]: {
                ...(prev[projectId] ?? {}),
                [task.id]: Date.now(),
              },
            }));
            break;
          }
        }
      }
    },
    [columnsByProject, fetchProjectTickets]
  );

  const taskCwdMap = useMemo(() => {
    const map: Record<string, string | null | undefined> = {};
    for (const columns of Object.values(columnsByProject)) {
      for (const tasks of Object.values(columns)) {
        for (const task of tasks) {
          if (task.worktreePath) {
            map[task.id] = task.worktreePath;
          }
        }
      }
    }
    return map;
  }, [columnsByProject]);

  return {
    columnsByProject,
    columnEnteredAtByProject,
    taskCwdMap,
    fetchProjectTickets,
    createTicket,
    createFromBranch,
    updateTicket,
    deleteTicket,
    clearOverride,
    handleColumnsChange,
  };
}
