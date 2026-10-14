import { Router } from "express";
import { getPublicBusiness, previewAssistant } from "../controllers/ai-profile.controller.js";
import { asyncHandler } from "../utils/async-handler.js";
import { createPublicBooking, getAvailability, getCustomerBookings, getCustomerStatus, getRescheduleAvailability, requestCustomerCode, requestPublicReschedule, verifyCustomerCode } from "../controllers/public-booking.controller.js";

const router = Router();
router.get("/businesses/:slug", asyncHandler(getPublicBusiness));
router.post("/businesses/:slug/chat", asyncHandler(previewAssistant));
router.post("/businesses/:slug/verification/request", asyncHandler(requestCustomerCode));
router.post("/businesses/:slug/verification/confirm", asyncHandler(verifyCustomerCode));
router.get("/businesses/:slug/availability", asyncHandler(getAvailability));
router.post("/businesses/:slug/bookings", asyncHandler(createPublicBooking));
router.get("/businesses/:slug/customer-bookings", asyncHandler(getCustomerBookings));
router.get("/businesses/:slug/customer-status", asyncHandler(getCustomerStatus));
router.get("/businesses/:slug/reschedule-availability", asyncHandler(getRescheduleAvailability));
router.post("/businesses/:slug/reschedule-requests", asyncHandler(requestPublicReschedule));
export default router;
