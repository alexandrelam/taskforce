"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_js_1 = require("../services/logger.js");
const tracking_service_js_1 = require("../services/tracking-service.js");
const router = (0, express_1.Router)();
async function handleTrackingRequest(req, res, targetColumn, action) {
    const { cwd } = req.body;
    logger_js_1.logger.debug(`[track/${action}] Received request with cwd: ${cwd}`);
    const result = await (0, tracking_service_js_1.applyTrackingState)(cwd, targetColumn);
    if (!result.success) {
        logger_js_1.logger.debug(`[track/${action}] Failed for cwd: ${cwd} (${result.error})`);
        res.status(result.status).json(result);
        return;
    }
    logger_js_1.logger.debug(`[track/${action}] Updated ticket '${result.ticketId}' to "${targetColumn}"`);
    res.json(result);
}
router.post("/start", async (req, res) => {
    await handleTrackingRequest(req, res, "In Progress", "start");
});
router.post("/stop", async (req, res) => {
    await handleTrackingRequest(req, res, "To Do", "stop");
});
exports.default = router;
//# sourceMappingURL=tracking.js.map