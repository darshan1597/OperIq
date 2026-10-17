import { Router } from "express";
import { acceptInvitation, changePassword, currentUser, googleLogin, invitationDetails, login, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/google", asyncHandler(googleLogin));
router.get("/invitations/:token", asyncHandler(invitationDetails));
router.post("/invitations/:token/accept", asyncHandler(acceptInvitation));
router.get("/me", requireAuth, asyncHandler(currentUser));
router.patch("/password", requireAuth, asyncHandler(changePassword));

export default router;
