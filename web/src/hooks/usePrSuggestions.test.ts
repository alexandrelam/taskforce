import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPrSuggestions } = vi.hoisted(() => ({
  getPrSuggestions: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  projectsApi: { getPrSuggestions },
}));

import { usePrSuggestions } from "./usePrSuggestions";

describe("usePrSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPrSuggestions.mockResolvedValue([
      {
        title: "Fix bug",
        url: "https://github.com/acme/app/pull/1",
        headRefName: "feature-x",
        number: 1,
      },
    ]);
  });

  it("does not fetch when no project is selected", async () => {
    const { result } = renderHook(() => usePrSuggestions(null));

    expect(result.current.suggestions).toEqual([]);
    expect(getPrSuggestions).not.toHaveBeenCalled();
  });

  it("fetches suggestions on mount and when the project changes", async () => {
    const { result, rerender } = renderHook(({ projectId }) => usePrSuggestions(projectId), {
      initialProps: { projectId: "project-1" },
    });

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });
    expect(getPrSuggestions).toHaveBeenCalledWith("project-1");

    getPrSuggestions.mockResolvedValueOnce([]);
    rerender({ projectId: "project-2" });

    await waitFor(() => {
      expect(getPrSuggestions).toHaveBeenCalledWith("project-2");
    });
  });
});
