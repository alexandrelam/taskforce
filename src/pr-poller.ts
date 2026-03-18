import { execSync } from "child_process";
import { isNotNull, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { tickets, settings } from "./db/schema.js";

const DEFAULT_INTERVAL = 120000; // 2 minutes

interface PrState {
  state: string;
  mergeable: string;
  reviewDecision: string | null;
  checksStatus: string | null;
  isDraft: boolean;
  lastCheckedAt: number;
  error?: string;
}

function ghAvailable(): boolean {
  try {
    execSync("gh auth status", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getInterval(): number {
  const result = db
    .select()
    .from(settings)
    .where(eq(settings.key, "prPollInterval"))
    .limit(1)
    .all();
  const val = result[0]?.value;
  if (val) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 30000) return n;
  }
  return DEFAULT_INTERVAL;
}

function deriveChecksStatus(
  statusCheckRollup: { conclusion: string; status: string }[] | null
): string | null {
  if (!statusCheckRollup || statusCheckRollup.length === 0) return null;
  if (statusCheckRollup.some((c) => c.conclusion === "FAILURE" || c.conclusion === "ERROR"))
    return "FAILURE";
  if (statusCheckRollup.some((c) => c.status !== "COMPLETED")) return "PENDING";
  return "SUCCESS";
}

function checkPr(url: string): PrState {
  try {
    const raw = execSync(
      `gh pr view "${url}" --json state,mergeable,reviewDecision,statusCheckRollup,isDraft`,
      { encoding: "utf-8", timeout: 15000 }
    );
    const data = JSON.parse(raw);
    return {
      state: data.state,
      mergeable: data.mergeable,
      reviewDecision: data.reviewDecision || null,
      checksStatus: deriveChecksStatus(data.statusCheckRollup),
      isDraft: data.isDraft,
      lastCheckedAt: Date.now(),
    };
  } catch (err: unknown) {
    return {
      state: "UNKNOWN",
      mergeable: "UNKNOWN",
      reviewDecision: null,
      checksStatus: null,
      isDraft: false,
      lastCheckedAt: Date.now(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function tick() {
  const rows = db
    .select({ id: tickets.id, prLink: tickets.prLink, prState: tickets.prState })
    .from(tickets)
    .where(isNotNull(tickets.prLink))
    .all();

  for (const row of rows) {
    if (!row.prLink) continue;

    // Skip MERGED/CLOSED PRs checked within last hour
    if (row.prState) {
      try {
        const prev: PrState = JSON.parse(row.prState);
        if (
          (prev.state === "MERGED" || prev.state === "CLOSED") &&
          Date.now() - prev.lastCheckedAt < 3600000
        ) {
          continue;
        }
      } catch {
        /* ignore malformed JSON */
      }
    }

    const state = checkPr(row.prLink);
    db.update(tickets)
      .set({ prState: JSON.stringify(state) })
      .where(eq(tickets.id, row.id))
      .run();
  }
}

function scheduleNext() {
  const interval = getInterval();
  setTimeout(() => {
    tick();
    scheduleNext();
  }, interval);
}

export function startPrPoller() {
  if (!ghAvailable()) {
    console.log("PR poller disabled: gh CLI not authenticated");
    return;
  }
  console.log("PR poller started");
  // Run first tick immediately
  tick();
  scheduleNext();
}
