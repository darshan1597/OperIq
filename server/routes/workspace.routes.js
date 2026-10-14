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
  askWorkspace,
} from "../controllers/workspace.controller.js";
import { publishAiProfile, previewAssistant, saveAiProfile, unpublishAiProfile } from "../controllers/ai-profile.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/auth.middleware.js";
import { deleteMember, getMembers, updateMember } from "../controllers/access.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

const router = Router();
router.use(requireAuth);
router.get("/workspace", asyncHandler(getWorkspace));
router.patch("/profile", allowRoles("owner"), asyncHandler(updateProfile));
router.get("/members", allowRoles("owner"), asyncHandler(getMembers));
router.patch("/members/:id", allowRoles("owner"), asyncHandler(updateMember));
router.delete("/members/:id", allowRoles("owner"), asyncHandler(deleteMember));
router.post("/customers", allowRoles("owner", "manager", "receptionist"), asyncHandler(createCustomer));
router.post("/staff", allowRoles("owner", "manager"), asyncHandler(createStaff));
router.put("/ai-profile", allowRoles("owner"), asyncHandler(saveAiProfile));
router.post("/ai-profile/publish", allowRoles("owner"), asyncHandler(publishAiProfile));
router.post("/ai-profile/unpublish", allowRoles("owner"), asyncHandler(unpublishAiProfile));
router.post("/ai-profile/preview", allowRoles("owner"), asyncHandler(previewAssistant));
router.post("/runs", allowRoles("owner", "manager"), asyncHandler(createRun));
router.post("/ask", allowRoles("owner", "manager"), asyncHandler(askWorkspace));
router.patch("/tasks/:id", asyncHandler(updateTask));
router.patch("/staff/:id", allowRoles("owner", "manager", "staff"), asyncHandler(updateStaff));
router.post("/approvals/:id/decision", allowRoles("owner", "manager"), asyncHandler(decideApproval));
router.post("/appointments/:id/respond", allowRoles("owner", "manager", "receptionist"), asyncHandler(respondToAppointment));
router.post("/messages/:id/review", allowRoles("owner", "manager", "receptionist"), asyncHandler(reviewMessage));
router.get("/export", allowRoles("owner", "manager"), asyncHandler(exportRecords));

export default router;
