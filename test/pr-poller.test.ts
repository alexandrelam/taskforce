import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = { id: string; prLink: string | null; prState: string | null };

async function loadPoller({
  settingsRows = [],
  ticketRows = [],
}: {
  settingsRows?: Array<{ value: string | null }>;
  ticketRows?: Row[];
} = {}) {
  const execSync = vi.fn();
  const updateRun = vi.fn();
  const db = {
    select: vi.fn((shape?: unknown) => {
      if (shape) {
        return {
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              all: vi.fn(() => ticketRows),
            })),
          })),
        };
      }

      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              all: vi.fn(() => settingsRows),
            })),
          })),
        })),
      };
    }),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          run: updateRun,
        })),
      })),
    })),
  };

  vi.doMock("child_process", () => ({ execSync }));
  vi.doMock("../src/db/index.js", () => ({ db }));
  vi.doMock("../src/db/schema.js", () => ({
    settings: { key: "key" },
    tickets: { id: "id", prLink: "prLink", prState: "prState" },
  }));
  vi.doMock("drizzle-orm", () => ({
    eq: vi.fn(() => "eq"),
    isNotNull: vi.fn(() => "isNotNull"),
  }));

  const mod = await import("../src/pr-poller.ts");
  return { mod, db, execSync, updateRun };
}

describe("pr poller", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-03-23T10:00:00Z").getTime());
  });

  it("starts immediately and uses the configured interval when gh is available", async () => {
    const { mod, execSync } = await loadPoller({
      settingsRows: [{ value: "45000" }],
      ticketRows: [{ id: "ticket-1", prLink: "https://github.com/acme/app/pull/1", prState: null }],
    });
    execSync.mockReturnValueOnce("").mockReturnValueOnce(
      JSON.stringify({
        state: "OPEN",
        mergeable: "MERGEABLE",
        reviewDecision: "APPROVED",
        statusCheckRollup: [{ conclusion: "SUCCESS" }],
        isDraft: false,
      })
    );
    const timeoutSpy = vi.spyOn(globalThis, "setTimeout");

    mod.startPrPoller();

    expect(execSync).toHaveBeenCalledWith("gh auth status", { stdio: "ignore" });
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 45000);
  });

  it("does nothing when gh is unavailable", async () => {
    const { mod, execSync, db } = await loadPoller();
    execSync.mockImplementation(() => {
      throw new Error("not logged in");
    });

    mod.startPrPoller();

    expect(db.update).not.toHaveBeenCalled();
  });

  it("skips recently closed PRs but refreshes malformed state", async () => {
    const { mod, execSync, updateRun } = await loadPoller({
      settingsRows: [{ value: "1000" }],
      ticketRows: [
        {
          id: "ticket-1",
          prLink: "https://github.com/acme/app/pull/1",
          prState: JSON.stringify({
            state: "CLOSED",
            lastCheckedAt: new Date("2026-03-23T09:30:00Z").getTime(),
          }),
        },
        {
          id: "ticket-2",
          prLink: "https://github.com/acme/app/pull/2",
          prState: "{bad json",
        },
      ],
    });
    execSync.mockReturnValueOnce("").mockReturnValueOnce(
      JSON.stringify({
        state: "OPEN",
        mergeable: "MERGEABLE",
        reviewDecision: null,
        statusCheckRollup: [{ status: "IN_PROGRESS" }],
        isDraft: false,
      })
    );

    mod.startPrPoller();

    expect(updateRun).toHaveBeenCalledTimes(1);
    expect(execSync).toHaveBeenCalledWith(
      'gh pr view "https://github.com/acme/app/pull/2" --json state,mergeable,reviewDecision,statusCheckRollup,isDraft',
      { encoding: "utf-8", timeout: 15000 }
    );
  });

  it("stores UNKNOWN state when gh pr view fails", async () => {
    const { mod, execSync, db } = await loadPoller({
      ticketRows: [{ id: "ticket-1", prLink: "https://github.com/acme/app/pull/1", prState: null }],
    });
    execSync.mockReturnValueOnce("").mockImplementationOnce(() => {
      throw new Error("gh failed");
    });

    mod.startPrPoller();

    const set = db.update.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(set).toHaveBeenCalledWith({
      prState: expect.stringContaining('"state":"UNKNOWN"'),
    });
  });

  it("derives FAILURE, PENDING, and SUCCESS check states from gh output", async () => {
    const failure = await loadPoller({
      ticketRows: [{ id: "ticket-1", prLink: "https://github.com/acme/app/pull/1", prState: null }],
    });
    failure.execSync.mockReturnValueOnce("").mockReturnValueOnce(
      JSON.stringify({
        state: "OPEN",
        mergeable: "MERGEABLE",
        reviewDecision: null,
        statusCheckRollup: [{ conclusion: "FAILURE" }],
        isDraft: false,
      })
    );
    failure.mod.startPrPoller();
    let set = failure.db.update.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(set).toHaveBeenCalledWith({
      prState: expect.stringContaining('"checksStatus":"FAILURE"'),
    });

    vi.resetModules();
    const pending = await loadPoller({
      ticketRows: [{ id: "ticket-1", prLink: "https://github.com/acme/app/pull/1", prState: null }],
    });
    pending.execSync.mockReturnValueOnce("").mockReturnValueOnce(
      JSON.stringify({
        state: "OPEN",
        mergeable: "MERGEABLE",
        reviewDecision: null,
        statusCheckRollup: [{ status: "IN_PROGRESS" }],
        isDraft: false,
      })
    );
    pending.mod.startPrPoller();
    set = pending.db.update.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(set).toHaveBeenCalledWith({
      prState: expect.stringContaining('"checksStatus":"PENDING"'),
    });

    vi.resetModules();
    const success = await loadPoller({
      ticketRows: [{ id: "ticket-1", prLink: "https://github.com/acme/app/pull/1", prState: null }],
    });
    success.execSync.mockReturnValueOnce("").mockReturnValueOnce(
      JSON.stringify({
        state: "OPEN",
        mergeable: "MERGEABLE",
        reviewDecision: null,
        statusCheckRollup: [{ state: "SUCCESS" }],
        isDraft: false,
      })
    );
    success.mod.startPrPoller();
    set = success.db.update.mock.results[0].value.set as ReturnType<typeof vi.fn>;
    expect(set).toHaveBeenCalledWith({
      prState: expect.stringContaining('"checksStatus":"SUCCESS"'),
    });
  });
});
