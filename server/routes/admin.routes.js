import { Router } from "express";
import { askAdmin, getAdminOverview } from "../controllers/admin.controller.js";
import { requireAuth, requirePlatformAdmin } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.use(requireAuth, requirePlatformAdmin);
router.get("/overview", asyncHandler(getAdminOverview));
router.post("/ask", asyncHandler(askAdmin));

export default router;
