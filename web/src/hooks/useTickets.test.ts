import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TicketResponse } from "@/types";

const getByProject = vi.fn();
const create = vi.fn();
const deleteTicket = vi.fn();
const clearOverride = vi.fn();
const update = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock("@/lib/api", () => ({
  ticketsApi: {
    getByProject,
    create,
    delete: deleteTicket,
    clearOverride,
    update,
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
    success: toastSuccess,
  },
}));

describe("useTickets", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    getByProject.mockResolvedValue([]);
  });

  it("does not poll when there is no selected project", async () => {
    const { useTickets } = await import("./useTickets");
    const { result } = renderHook(() => useTickets(null));

    expect(result.current.columns).toEqual({
      "To Do": [],
      "In Progress": [],
      Done: [],
    });
    expect(getByProject).not.toHaveBeenCalled();
  });

  it("maps tickets into columns, parses pr state, and initializes timers", async () => {
    const tickets: TicketResponse[] = [
      {
        id: "t1",
        title: "Task 1",
        column: "In Progress",
        worktreePath: "/repo/task-1",
        prState:
          '{"state":"OPEN","mergeable":"MERGEABLE","reviewDecision":"APPROVED","checksStatus":"SUCCESS","isDraft":false,"lastCheckedAt":1}',
      },
    ];
    getByProject.mockResolvedValue(tickets);
    vi.setSystemTime(new Date("2026-03-23T10:00:00Z"));

    const { useTickets } = await import("./useTickets");
    const { result } = renderHook(() => useTickets("project-1"));

    await waitFor(() => {
      expect(result.current.columns["In Progress"]).toHaveLength(1);
    });

    expect(result.current.columns["In Progress"][0].prState).toEqual({
      state: "OPEN",
      mergeable: "MERGEABLE",
      reviewDecision: "APPROVED",
      checksStatus: "SUCCESS",
      isDraft: false,
      lastCheckedAt: 1,
    });
    expect(result.current.columnEnteredAt).toEqual({ t1: Date.now() });
  });

  it("shows a toast when setup transitions from running to failed", async () => {
    const intervalCallbacks: Array<() => void> = [];
    vi.spyOn(globalThis, "setInterval").mockImplementation(((callback: TimerHandler) => {
      intervalCallbacks.push(callback as () => void);
      return 1 as unknown as ReturnType<typeof setInterval>;
    }) as typeof setInterval);
    getByProject
      .mockResolvedValueOnce([
        { id: "t1", title: "Task 1", column: "To Do", setupStatus: "running_post_command" },
      ])
      .mockResolvedValueOnce([
        {
          id: "t1",
          title: "Task 1",
          column: "To Do",
          setupStatus: "failed",
          setupError: "npm install failed",
        },
      ]);

    const { useTickets } = await import("./useTickets");
    renderHook(() => useTickets("project-1"));

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      intervalCallbacks[0]?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Setup failed", {
        description: "npm install failed",
      });
    });
  });

  it("optimistically adds created tickets and persists column moves", async () => {
    update.mockResolvedValue(undefined);
    create.mockResolvedValue({
      id: "t2",
      title: "New Task",
      column: "To Do",
      worktreePath: null,
      setupStatus: "pending",
      description: "desc",
      prLink: null,
    });

    const { useTickets } = await import("./useTickets");
    const { result } = renderHook(() => useTickets("project-1"));

    await act(async () => {
      await result.current.createTicket("  New Task  ", " desc ");
    });

    expect(create).toHaveBeenCalledWith({
      title: "New Task",
      projectId: "project-1",
      description: "desc",
      runPostCommand: true,
      prLink: null,
      baseBranch: null,
    });
    expect(result.current.columns["To Do"]).toEqual([
      {
        id: "t2",
        title: "New Task",
        worktreePath: null,
        setupStatus: "pending",
        description: "desc",
        prLink: null,
      },
    ]);

    await act(async () => {
      result.current.handleColumnsChange({
        "To Do": [],
        "In Progress": result.current.columns["To Do"],
        Done: [],
      });
    });

    expect(update).toHaveBeenCalledWith("t2", { column: "In Progress" });
  });

  it("clears overrides in local state after the API succeeds", async () => {
    getByProject.mockResolvedValue([
      { id: "t1", title: "Task 1", column: "To Do", statusOverride: true },
    ]);
    const { useTickets } = await import("./useTickets");
    const { result } = renderHook(() => useTickets("project-1"));

    await waitFor(() => {
      expect(result.current.columns["To Do"]).toHaveLength(1);
    });

    await act(async () => {
      await result.current.clearOverride("t1");
    });

    expect(clearOverride).toHaveBeenCalledWith("t1");
    expect(result.current.columns["To Do"][0].statusOverride).toBe(false);
    expect(toastSuccess).toHaveBeenCalledWith("Override cleared", {
      description: "Automatic status tracking re-enabled",
    });
  });
});
