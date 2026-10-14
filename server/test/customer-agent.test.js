import test from "node:test";
import assert from "node:assert/strict";

import { collectCustomerIdentity, CUSTOMER_IDENTITY_PERMISSIONS, missingCustomerIdentityFields, normalizeCustomerDecision, repairCustomerDecision, validateCustomerDecision } from "../services/customer-agent.service.js";

test("every customer account mutation requires identity verification", () => {
  assert.deepEqual(CUSTOMER_IDENTITY_PERMISSIONS, ["createBooking", "cancelBooking", "rescheduleBooking", "issueRefund"]);
  assert.equal(CUSTOMER_IDENTITY_PERMISSIONS.includes("sensitiveData"), false);
  assert.equal(CUSTOMER_IDENTITY_PERMISSIONS.includes("answerQuestions"), false);
});

test("customer identity collection preserves partial details across chat turns", () => {
  const partial = collectCustomerIdentity(["I want to book Classic Haircut", "darshan, darshan@gmail.com"]);
  assert.deepEqual(partial, { name: "darshan", email: "darshan@gmail.com", phone: "" });
  assert.deepEqual(missingCustomerIdentityFields(partial), ["contact phone number"]);

  const complete = collectCustomerIdentity(["I want to book Classic Haircut", "darshan, darshan@gmail.com", "+91 9876543210"]);
  assert.deepEqual(complete, { name: "darshan", email: "darshan@gmail.com", phone: "+91 9876543210" });
  assert.deepEqual(missingCustomerIdentityFields(complete), []);
});

test("null model fields are repaired without replacing the AI answer", () => {
  const decision = {
    kind: "clarify",
    permission: null,
    action: null,
    params: {},
    answer: "Could you share the name and email for your appointment?",
  };
  const repaired = repairCustomerDecision(decision, "I wanna reschedule my booking");
  assert.equal(repaired.permission, "rescheduleBooking");
  assert.equal(repaired.answer, decision.answer);
  assert.equal(repaired.kind, "clarify");
});

test("unknown tool names cannot pass through decision repair", () => {
  const repaired = repairCustomerDecision(
    { kind: "clarify", permission: null, action: null, params: {}, answer: "Which appointment should I change?" },
    "Reschedule my booking",
  );
  assert.equal(repaired.action, null);
  assert.equal(repaired.permission, "rescheduleBooking");
});

test("reschedules cannot fall through to general business answers", () => {
  const problems = validateCustomerDecision(
    { kind: "information", permission: "answerQuestions", action: null, params: {}, answer: "Please provide your phone number." },
    { requestedPermission: "rescheduleBooking", verified: { bookings: [{ service: "Haircut", date: "2026-10-20", time: "14:30", status: "Confirmed" }] } },
  );
  assert.ok(problems.some((item) => item.includes("permission=rescheduleBooking")));
  assert.ok(problems.some((item) => item.includes("never kind=information")));
  assert.ok(problems.some((item) => item.includes("phone number")));
});

test("even correctly labelled reschedules cannot use the information route", () => {
  const problems = validateCustomerDecision(
    { kind: "information", permission: "rescheduleBooking", action: null, params: {}, answer: "I can help with that." },
    { requestedPermission: "rescheduleBooking", verified: { bookings: [{ service: "Haircut", date: "2026-10-20", time: "14:30", status: "Confirmed" }] } },
  );
  assert.ok(problems.some((item) => item.includes("never kind=information")));
});

test("a verified zero-booking result may be a final customer-agent answer", () => {
  const problems = validateCustomerDecision(
    { kind: "information", permission: "rescheduleBooking", action: null, params: {}, answer: "I couldn't find any bookings for your verified account." },
    { requestedPermission: "rescheduleBooking", verified: { bookings: [] } },
  );
  assert.deepEqual(problems, []);
});

test("verified reschedule clarification must reference fetched appointments", () => {
  const problems = validateCustomerDecision(
    { kind: "clarify", permission: "rescheduleBooking", action: null, params: {}, answer: "Which booking do you mean?" },
    { requestedPermission: "rescheduleBooking", verified: { bookings: [{ service: "Classic Haircut", date: "2026-10-20", time: "14:30", status: "Confirmed" }] } },
  );
  assert.ok(problems.some((item) => item.includes("every manageable appointment")));
});

test("verified customers with no bookings receive an explicit no-bookings answer", () => {
  const misleading = validateCustomerDecision(
    { kind: "clarify", permission: "rescheduleBooking", action: null, params: {}, answer: "Please provide your full name and appointment time." },
    { requestedPermission: "rescheduleBooking", verified: { bookings: [] } },
  );
  assert.ok(misleading.some((item) => item.includes("already verified")));
  assert.ok(misleading.some((item) => item.includes("no manageable appointments")));

  const truthful = validateCustomerDecision(
    { kind: "clarify", permission: "rescheduleBooking", action: null, params: {}, answer: "I couldn't find any appointments for your verified account." },
    { requestedPermission: "rescheduleBooking", verified: { bookings: [] } },
  );
  assert.deepEqual(truthful, []);
});

test("cancelled-only customers cannot start a reschedule action", () => {
  const problems = validateCustomerDecision(
    { kind: "action", permission: "rescheduleBooking", action: "prepare_booking_reschedule", params: { bookingId: "cancelled-1", date: "2026-10-20", time: "14:30" }, answer: "" },
    { requestedPermission: "rescheduleBooking", verified: { bookings: [{ id: "cancelled-1", service: "Haircut", date: "2026-10-18", time: "10:00", status: "Cancelled" }] } },
  );
  assert.ok(problems.some((item) => item.includes("no reschedule action")));
});

test("multiple verified appointments must all be shown before selection", () => {
  const verified = { bookings: [
    { id: "one", service: "Haircut", date: "2026-10-20", time: "14:30", status: "Confirmed" },
    { id: "two", service: "Beard Trim", date: "2026-10-22", time: "11:00", status: "Confirmed" },
  ] };
  const incomplete = validateCustomerDecision(
    { kind: "clarify", permission: "rescheduleBooking", action: null, params: {}, answer: "I found your Haircut on 2026-10-20 at 14:30." },
    { requestedPermission: "rescheduleBooking", verified },
  );
  assert.ok(incomplete.some((item) => item.includes("every manageable appointment")));

  const complete = validateCustomerDecision(
    { kind: "clarify", permission: "rescheduleBooking", action: null, params: {}, answer: "I found: Haircut on 2026-10-20 at 14:30; Beard Trim on 2026-10-22 at 11:00. Which should I change?" },
    { requestedPermission: "rescheduleBooking", verified },
  );
  assert.deepEqual(complete, []);

  const bundled = validateCustomerDecision(
    { kind: "clarify", permission: "rescheduleBooking", action: null, params: {}, answer: "I found Haircut on 2026-10-20 at 14:30 and Beard Trim on 2026-10-22 at 11:00. Which one should I change? What new date and time do you want, and why?" },
    { requestedPermission: "rescheduleBooking", verified, intentText: "I want to reschedule my booking" },
  );
  assert.ok(bundled.some((item) => item.includes("Ask only which existing appointment")));
  assert.ok(bundled.some((item) => item.includes("exactly one reschedule question")));
});

test("verified booking requests list configured services without re-requesting identity", () => {
  const services = [{ name: "Classic Haircut" }, { name: "Signature Facial" }];
  const bad = validateCustomerDecision(
    { kind: "information", permission: "answerQuestions", action: null, params: {}, answer: "Please provide your full name and phone number." },
    { requestedPermission: "createBooking", verified: { bookings: [] }, services, intentText: "yes i want to book a service" },
  );
  assert.ok(bad.some((item) => item.includes("permission=createBooking")));
  assert.ok(bad.some((item) => item.includes("already verified")));
  assert.ok(bad.some((item) => item.includes("every configured service")));

  const prematureAction = validateCustomerDecision(
    { kind: "action", permission: "createBooking", action: "submit_customer_request", params: { category: "booking", message: "Book a service" }, answer: "" },
    { requestedPermission: "createBooking", verified: { bookings: [] }, services, intentText: "yes i want to book a service" },
  );
  assert.ok(prematureAction.some((item) => item.includes("no booking action may run")));

  const good = validateCustomerDecision(
    { kind: "clarify", permission: "createBooking", action: null, params: {}, answer: "Available services: Classic Haircut and Signature Facial. Which would you like?" },
    { requestedPermission: "createBooking", verified: { bookings: [] }, services, intentText: "yes i want to book a service" },
  );
  assert.deepEqual(good, []);
});

test("booking actions require a configured service and exact date and time", () => {
  const services = [{ name: "Classic Haircut" }];
  const incomplete = validateCustomerDecision(
    { kind: "action", permission: "createBooking", action: "submit_customer_request", params: { category: "booking", message: "Book Classic Haircut tomorrow afternoon" }, answer: "" },
    { requestedPermission: "createBooking", verified: { bookings: [] }, services, intentText: "Book Classic Haircut tomorrow afternoon" },
  );
  assert.ok(incomplete.some((item) => item.includes("exact YYYY-MM-DD")));

  const complete = validateCustomerDecision(
    { kind: "action", permission: "createBooking", action: "create_booking", params: { serviceId: "service-1", date: "2026-10-20", time: "14:30" }, answer: "" },
    { requestedPermission: "createBooking", verified: { bookings: [] }, services: [{ id: "service-1", name: "Classic Haircut" }], intentText: "Book Classic Haircut on 2026-10-20 at 14:30" },
  );
  assert.deepEqual(complete, []);
});

test("customer-agent clarifications are not replaced with scripted dialogue", () => {
  const decision = {
    kind: "clarify",
    permission: "rescheduleBooking",
    action: null,
    params: {},
    answer: "What name and email address should I use for verification?",
  };
  assert.equal(normalizeCustomerDecision(decision, { verified: null, message: "Reschedule my haircut" }), decision);
});

test("a pending chat verification accepts the six-digit code", () => {
  const result = normalizeCustomerDecision(
    { kind: "information", permission: "answerQuestions", action: null, params: {}, answer: "" },
    { verified: null, verificationPending: true, message: "123456" },
  );

  assert.equal(result.kind, "action");
  assert.equal(result.action, "confirm_email_verification");
  assert.deepEqual(result.params, { code: "123456" });
});

test("customer-agent action selection passes through without keyword rewriting", () => {
  const decision = {
    kind: "action",
    permission: "rescheduleBooking",
    action: "request_email_verification",
    params: { name: "Darshan Kumar", email: "darshan@example.com" },
    answer: "",
  };
  assert.equal(normalizeCustomerDecision(decision, { verified: null, message: "I am Darshan, darshan@example.com" }), decision);
});

test("valid action decisions pass through unchanged", () => {
  const decision = {
    kind: "action",
    permission: "rescheduleBooking",
    action: "prepare_booking_reschedule",
    params: { bookingId: "booking-1", date: "2026-10-14", time: "15:00", reason: "Customer request" },
    answer: "",
  };

  assert.equal(
    normalizeCustomerDecision(decision, { verified: { customer: {}, bookings: [] }, message: "Reschedule it" }),
    decision,
  );
});
