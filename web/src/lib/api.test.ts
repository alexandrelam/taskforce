import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("api client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null from getCommit when the backend responds with an ApiError", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3325/");
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    const { projectsApi } = await import("./api");
    await expect(projectsApi.getCommit("project-1")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3325/api/projects/project-1/commit",
      undefined
    );
  });

  it("throws the text body for non-json errors", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response("Service unavailable", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );

    const { ticketsApi } = await import("./api");
    await expect(ticketsApi.getPrInfo("https://github.com/acme/app/pull/1")).rejects.toMatchObject({
      message: "Service unavailable",
      status: 503,
    } satisfies Partial<Error & { status: number }>);
  });

  it("treats 204 responses as undefined for mutating endpoints", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const { ticketsApi } = await import("./api");
    await expect(ticketsApi.delete("ticket-1")).resolves.toBeUndefined();
  });

  it("returns an empty array when fetching PR suggestions fails", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockRejectedValue(new Error("offline"));

    const { projectsApi } = await import("./api");
    await expect(projectsApi.getPrSuggestions("project-1")).resolves.toEqual([]);
  });
});
