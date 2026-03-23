import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAll, settingsGet, settingsSet, toastInfo } = vi.hoisted(() => ({
  getAll: vi.fn(),
  settingsGet: vi.fn(),
  settingsSet: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  projectsApi: { getAll },
  settingsApi: { get: settingsGet, set: settingsSet },
}));

vi.mock("sonner", () => ({
  toast: { info: toastInfo },
}));

import { useProjects } from "./useProjects";

describe("useProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAll.mockResolvedValue([
      { id: "p1", name: "One" },
      { id: "p2", name: "Two" },
      { id: "p3", name: "Three" },
      { id: "p4", name: "Four" },
    ]);
    settingsGet.mockResolvedValue({ value: null });
    settingsSet.mockResolvedValue(undefined);
  });

  it("restores selected projects from persisted multi-select state", async () => {
    settingsGet
      .mockResolvedValueOnce({ value: JSON.stringify(["p1", "p3"]) })
      .mockResolvedValueOnce({ value: null });

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.selectedProjectIds).toEqual(["p1", "p3"]);
    });
    expect(getAll).toHaveBeenCalled();
  });

  it("migrates the legacy single-project setting", async () => {
    settingsGet.mockImplementation(async (key: string) => {
      if (key === "selected_projects") {
        return { value: "{bad json" };
      }
      if (key === "selected_project") {
        return { value: "p2" };
      }
      return { value: null };
    });

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.selectedProjectIds).toEqual(["p2"]);
    });
    expect(settingsSet).toHaveBeenCalledWith("selected_projects", '["p2"]');
  });

  it("enforces the 3-project selection limit and persists valid changes", async () => {
    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects).toHaveLength(4);
    });

    await act(async () => {
      result.current.toggleProjectSelection({ id: "p1", name: "One" });
      result.current.toggleProjectSelection({ id: "p2", name: "Two" });
      result.current.toggleProjectSelection({ id: "p3", name: "Three" });
      result.current.toggleProjectSelection({ id: "p4", name: "Four" });
    });

    expect(result.current.selectedProjectIds).toEqual(["p1", "p2", "p3"]);
    expect(settingsSet).toHaveBeenCalledWith("selected_projects", '["p1"]');
    expect(settingsSet).toHaveBeenCalledWith("selected_projects", '["p1","p2"]');
    expect(settingsSet).toHaveBeenCalledWith("selected_projects", '["p1","p2","p3"]');
    expect(toastInfo).toHaveBeenCalledWith("Maximum 3 projects can be selected");
  });

  it("drops stale persisted ids after refreshing projects", async () => {
    settingsGet.mockImplementation(async (key: string) => {
      if (key === "selected_projects") {
        return { value: JSON.stringify(["p1", "missing"]) };
      }
      return { value: null };
    });

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.selectedProjectIds).toEqual(["p1"]);
    });
    expect(settingsSet).not.toHaveBeenCalled();
  });
});
