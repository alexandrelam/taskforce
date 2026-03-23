import { Router, Request, Response } from "express";
import { logger } from "../services/logger.js";
import { applyTrackingState } from "../services/tracking-service.js";

const router = Router();

async function handleTrackingRequest(
  req: Request,
  res: Response,
  targetColumn: "To Do" | "In Progress",
  action: "start" | "stop"
) {
  const { cwd } = req.body as { cwd: string };
  logger.debug(`[track/${action}] Received request with cwd: ${cwd}`);

  const result = await applyTrackingState(cwd, targetColumn);
  if (!result.success) {
    logger.debug(`[track/${action}] Failed for cwd: ${cwd} (${result.error})`);
    res.status(result.status).json(result);
    return;
  }

  logger.debug(`[track/${action}] Updated ticket '${result.ticketId}' to "${targetColumn}"`);
  res.json(result);
}

router.post("/start", async (req: Request, res: Response) => {
  await handleTrackingRequest(req, res, "In Progress", "start");
});

router.post("/stop", async (req: Request, res: Response) => {
  await handleTrackingRequest(req, res, "To Do", "stop");
});

export default router;
