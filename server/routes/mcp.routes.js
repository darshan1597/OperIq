import { Router } from "express";
import { handleMcp } from "../controllers/mcp.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.post("/", asyncHandler(handleMcp));
export default router;
