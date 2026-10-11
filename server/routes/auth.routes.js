import { Router } from "express";
import { currentUser, googleLogin, login, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/google", asyncHandler(googleLogin));
router.get("/me", requireAuth, asyncHandler(currentUser));

export default router;
