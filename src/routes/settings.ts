import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { settings } from "../db/schema.js";

const router = Router();

router.get("/:key", async (req: Request<{ key: string }>, res: Response) => {
  const key = req.params.key;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  res.json({ value: result[0]?.value ?? null });
});

router.put("/:key", async (req: Request<{ key: string }>, res: Response) => {
  const key = req.params.key;
  const { value } = req.body as { value: string };
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
  res.json({ success: true });
});

export default router;
