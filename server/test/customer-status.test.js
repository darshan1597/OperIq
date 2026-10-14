import test from "node:test";
import assert from "node:assert/strict";

import { customerRequestUpdates, formatCustomerStatus } from "../controllers/public-booking.controller.js";

test("customer updates include only the verified customer's records", () => {
  const state = {
    approvals: [
      { id: "a1", type: "Booking reschedule", customerId: "customer-1", status: "Approved", executionStatus: "Completed", date: "2026-10-20", time: "11:00", createdAt: "2026-10-14T10:00:00Z" },
      { id: "a2", type: "Booking cancellation", customerId: "customer-2", status: "Pending", executionStatus: "Not started", createdAt: "2026-10-14T11:00:00Z" },
    ],
    customerRequests: [
      { id: "r1", customerId: "customer-1", category: "refund", status: "Pending review", createdAt: "2026-10-14T12:00:00Z" },
      { id: "r2", customerId: "customer-2", category: "refund", status: "Resolved", createdAt: "2026-10-14T13:00:00Z" },
    ],
  };
  const updates = customerRequestUpdates(state, "customer-1");
  assert.deepEqual(updates.map((item) => item.id), ["r1", "a1"]);
  assert.equal(updates[1].status, "Completed");
});

test("customer status explains appointments and owner-reviewed requests", () => {
  const answer = formatCustomerStatus({
    bookings: [{ service: "Classic Haircut", date: "2026-10-20", time: "11:00", status: "Confirmed" }],
    requests: [{ type: "Booking reschedule", date: "2026-10-20", time: "11:00", status: "Completed" }],
  });
  assert.match(answer, /Classic Haircut/);
  assert.match(answer, /Booking reschedule/);
  assert.match(answer, /Completed/);
});

test("completed reschedules hide obsolete awaiting proposals for the same applied time", () => {
  const state = {
    appointments: [{ id: "b1", customerId: "customer-1", date: "2026-10-14", time: "16:30", status: "Confirmed" }],
    approvals: [
      { id: "done", type: "Booking reschedule", bookingId: "b1", customerId: "customer-1", date: "2026-10-14", time: "16:30", status: "Approved", executionStatus: "Completed", createdAt: "2026-10-14T12:00:00Z" },
      { id: "stale", type: "Booking reschedule", bookingId: "b1", customerId: "customer-1", date: "2026-10-14", time: "16:30", status: "Awaiting customer", executionStatus: "Awaiting customer", createdAt: "2026-10-14T11:00:00Z" },
    ],
    customerRequests: [],
  };
  const updates = customerRequestUpdates(state, "customer-1");
  assert.deepEqual(updates.map((item) => item.id), ["done"]);
});

test("customer status hides internal superseded workflow records", () => {
  const updates = customerRequestUpdates({
    appointments: [],
    approvals: [{ id: "old", type: "Booking reschedule", customerId: "customer-1", status: "Superseded", executionStatus: "Superseded", createdAt: "2026-10-14T10:00:00Z" }],
    customerRequests: [],
  }, "customer-1");
  assert.deepEqual(updates, []);
});
