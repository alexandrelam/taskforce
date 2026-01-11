"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const drizzle_orm_1 = require("drizzle-orm");
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const router = (0, express_1.Router)();
router.get("/:key", async (req, res) => {
    const key = req.params.key;
    const result = await index_js_1.db.select().from(schema_js_1.settings).where((0, drizzle_orm_1.eq)(schema_js_1.settings.key, key)).limit(1);
    res.json({ value: result[0]?.value ?? null });
});
router.put("/:key", async (req, res) => {
    const key = req.params.key;
    const { value } = req.body;
    await index_js_1.db
        .insert(schema_js_1.settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: schema_js_1.settings.key, set: { value } });
    res.json({ success: true });
});
exports.default = router;
//# sourceMappingURL=settings.js.map