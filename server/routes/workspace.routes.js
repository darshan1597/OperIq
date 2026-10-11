import { Router } from "express";
import {
  createRun,
  decideApproval,
  exportRecords,
  getWorkspace,
  respondToAppointment,
  reviewMessage,
  updateStaff,
  updateTask,
  updateProfile,
  createCustomer,
  createStaff,
} from "../controllers/workspace.controller.js";
import { publishAiProfile, previewAssistant, saveAiProfile, unpublishAiProfile } from "../controllers/ai-profile.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.use(requireAuth);
router.get("/workspace", asyncHandler(getWorkspace));
router.patch("/profile", asyncHandler(updateProfile));
router.post("/customers", asyncHandler(createCustomer));
router.post("/staff", asyncHandler(createStaff));
router.put("/ai-profile", asyncHandler(saveAiProfile));
router.post("/ai-profile/publish", asyncHandler(publishAiProfile));
router.post("/ai-profile/unpublish", asyncHandler(unpublishAiProfile));
router.post("/ai-profile/preview", asyncHandler(previewAssistant));
router.post("/runs", asyncHandler(createRun));
router.patch("/tasks/:id", asyncHandler(updateTask));
router.patch("/staff/:id", asyncHandler(updateStaff));
router.post("/approvals/:id/decision", asyncHandler(decideApproval));
router.post("/appointments/:id/respond", asyncHandler(respondToAppointment));
router.post("/messages/:id/review", asyncHandler(reviewMessage));
router.get("/export", asyncHandler(exportRecords));

export default router;
