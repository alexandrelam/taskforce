"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPrPoller = startPrPoller;
const child_process_1 = require("child_process");
const drizzle_orm_1 = require("drizzle-orm");
const index_js_1 = require("./db/index.js");
const schema_js_1 = require("./db/schema.js");
const DEFAULT_INTERVAL = 120000; // 2 minutes
function ghAvailable() {
    try {
        (0, child_process_1.execSync)("gh auth status", { stdio: "ignore" });
        return true;
    }
    catch {
        return false;
    }
}
function getInterval() {
    const result = index_js_1.db
        .select()
        .from(schema_js_1.settings)
        .where((0, drizzle_orm_1.eq)(schema_js_1.settings.key, "prPollInterval"))
        .limit(1)
        .all();
    const val = result[0]?.value;
    if (val) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 30000)
            return n;
    }
    return DEFAULT_INTERVAL;
}
function deriveChecksStatus(statusCheckRollup) {
    if (!statusCheckRollup || statusCheckRollup.length === 0)
        return null;
    if (statusCheckRollup.some((c) => c.conclusion === "FAILURE" || c.conclusion === "ERROR"))
        return "FAILURE";
    if (statusCheckRollup.some((c) => {
        if (c.status)
            return c.status !== "COMPLETED";
        if (c.state)
            return c.state !== "SUCCESS";
        return false;
    }))
        return "PENDING";
    return "SUCCESS";
}
function checkPr(url) {
    try {
        const raw = (0, child_process_1.execSync)(`gh pr view "${url}" --json state,mergeable,reviewDecision,statusCheckRollup,isDraft`, { encoding: "utf-8", timeout: 15000 });
        const data = JSON.parse(raw);
        return {
            state: data.state,
            mergeable: data.mergeable,
            reviewDecision: data.reviewDecision || null,
            checksStatus: deriveChecksStatus(data.statusCheckRollup),
            isDraft: data.isDraft,
            lastCheckedAt: Date.now(),
        };
    }
    catch (err) {
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
    const rows = index_js_1.db
        .select({ id: schema_js_1.tickets.id, prLink: schema_js_1.tickets.prLink, prState: schema_js_1.tickets.prState })
        .from(schema_js_1.tickets)
        .where((0, drizzle_orm_1.isNotNull)(schema_js_1.tickets.prLink))
        .all();
    for (const row of rows) {
        if (!row.prLink)
            continue;
        // Skip MERGED/CLOSED PRs checked within last hour
        if (row.prState) {
            try {
                const prev = JSON.parse(row.prState);
                if ((prev.state === "MERGED" || prev.state === "CLOSED") &&
                    Date.now() - prev.lastCheckedAt < 3600000) {
                    continue;
                }
            }
            catch {
                /* ignore malformed JSON */
            }
        }
        const state = checkPr(row.prLink);
        index_js_1.db.update(schema_js_1.tickets)
            .set({ prState: JSON.stringify(state) })
            .where((0, drizzle_orm_1.eq)(schema_js_1.tickets.id, row.id))
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
function startPrPoller() {
    if (!ghAvailable()) {
        console.log("PR poller disabled: gh CLI not authenticated");
        return;
    }
    console.log("PR poller started");
    // Run first tick immediately
    tick();
    scheduleNext();
}
//# sourceMappingURL=pr-poller.js.map