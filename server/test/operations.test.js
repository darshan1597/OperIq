import test from "node:test";
import assert from "node:assert/strict";
import { workspaceFixture } from "./fixtures/workspace.fixture.js";
import { validateBooking, analyzeScheduleConflicts, canRun, findBookingAlternatives, schemas } from "../services/tool.service.js";
import { enforceConflictPlan, inferWorkflow } from "../services/agent.service.js";

test("role separation permits only proposal and approved-execution booking tools", () => {
    assert.equal(canRun("customer", "cancel_booking"), false);
    assert.equal(canRun("customer", "request_refund"), false);
    assert.equal(canRun("coordinator", "propose_booking"), false);
    assert.equal(canRun("operations", "propose_booking"), true);
    assert.equal(canRun("resolution", "request_refund"), true);
    assert.equal(canRun("resolution", "export_customers"), false);
    assert.equal(canRun("access", "read_team_access"), true);
    assert.equal(canRun("access", "prepare_member_invites"), true);
    assert.equal(canRun("access", "execute_approved_member_invites"), true);
    assert.equal(canRun("access", "create_and_send_member_invites"), false);
    assert.equal(canRun("access", "request_refund"), false);
    assert.equal(canRun("operations", "create_and_send_member_invites"), false);
    assert.equal(canRun("operations", "prepare_booking_cancellation"), true);
    assert.equal(canRun("operations", "execute_approved_booking_cancellation"), true);
    assert.equal(canRun("operations", "prepare_booking_reschedule"), true);
    assert.equal(canRun("operations", "execute_approved_booking_reschedule"), true);
    assert.equal(canRun("operations", "analyze_schedule_conflicts"), true);
    assert.equal(canRun("operations", "prepare_schedule_resolution"), true);
    assert.equal(canRun("operations", "execute_approved_schedule_resolution"), true);
    assert.equal(schemas.cancel_booking, undefined);
    assert.equal(schemas.reschedule_booking, undefined);
    assert.equal(schemas.create_and_send_member_invites, undefined);
});

test("booking execution tools accept only an immutable approval reference", () => {
    assert.doesNotThrow(() => schemas.prepare_booking_cancellation.parse({ bookingId: "booking-1", reason: "Customer requested" }));
    assert.doesNotThrow(() => schemas.prepare_booking_reschedule.parse({ bookingId: "booking-1", date: "2026-10-13", time: "14:30" }));
    assert.doesNotThrow(() => schemas.execute_approved_booking_cancellation.parse({ approvalId: "approval-1" }));
    assert.throws(() => schemas.execute_approved_booking_reschedule.parse({ approvalId: "approval-1", time: "09:00" }));
    assert.doesNotThrow(() => schemas.execute_approved_schedule_resolution.parse({ approvalId: "approval-1" }));
    assert.throws(() => schemas.execute_approved_schedule_resolution.parse({ approvalId: "approval-1", time: "09:00" }));
});

test("schedule analysis detects unavailable staff and proposes valid alternatives", () => {
    const s = workspaceFixture();
    s.staff.find((person) => person.id === "s1").status = "Unavailable";
    const conflicts = analyzeScheduleConflicts(s);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].type, "staff_unavailable");
    assert.equal(conflicts[0].bookingId, "b1");
    assert.ok(conflicts[0].alternatives.length > 0);
    assert.ok(conflicts[0].alternatives.every((candidate) => ["s2", "s3"].includes(candidate.staffId)));
});

test("schedule analysis detects overlapping staff appointments", () => {
    const s = workspaceFixture();
    s.appointments.push({ ...s.appointments[0], id: "b2", customerId: "c2", time: "09:30" });
    const conflicts = analyzeScheduleConflicts(s);
    assert.ok(conflicts.some((conflict) => conflict.type === "overlap" && conflict.bookingId === "b2"));
});

test("reschedule recovery returns only validated replacement times", () => {
    const s = workspaceFixture();
    const booking = s.appointments[0];
    const alternatives = findBookingAlternatives(s, booking);
    assert.ok(alternatives.length > 0);
    assert.ok(alternatives.every((item) => item.date !== booking.date || item.time !== booking.time));
    for (const alternative of alternatives)
        assert.doesNotThrow(() => validateBooking(
            { ...s, appointments: s.appointments.filter((item) => item.id !== booking.id) },
            { ...booking, ...alternative },
        ));
});

test("conflict planning never proposes an unvalidated model alternative", () => {
    const s = workspaceFixture();
    s.staff.find((person) => person.id === "s1").status = "Unavailable";
    s.staff.find((person) => person.id === "s2").status = "Unavailable";
    s.staff.find((person) => person.id === "s3").status = "Unavailable";
    const plan = enforceConflictPlan(s, {
        summary: "Move it tomorrow",
        steps: [
            { agent: "operations", action: "analyze_schedule_conflicts", params: {}, explanation: "Scan" },
            { agent: "operations", action: "prepare_schedule_resolution", params: { bookingId: "b1", staffId: "s1", date: "2099-01-01", time: "09:00", reason: "Assumed available tomorrow" }, explanation: "Unsafe model guess" },
        ],
    });
    assert.deepEqual(plan.steps.map((step) => step.action), ["analyze_schedule_conflicts"]);
    assert.match(plan.summary, /no validated alternative/i);
});

test("conflict planning replaces model parameters with an analyzed alternative", () => {
    const s = workspaceFixture();
    s.staff.find((person) => person.id === "s1").status = "Unavailable";
    const plan = enforceConflictPlan(s, {
        summary: "Model guess",
        steps: [{ agent: "operations", action: "analyze_schedule_conflicts", params: {}, explanation: "Scan" }],
    });
    assert.equal(plan.steps[1].action, "prepare_schedule_resolution");
    assert.equal(plan.steps[1].params.staffId, "s2");
    assert.doesNotThrow(() => schemas.prepare_schedule_resolution.parse(plan.steps[1].params));
});

test("overlapping and unavailable-assignment prompts select conflict workflow", () => {
    assert.equal(inferWorkflow("Inspect the schedule for overlapping appointments or unavailable assigned staff."), "conflict");
    assert.equal(inferWorkflow("Find an overlap in tomorrow's schedule."), "conflict");
});

test("team invitation proposals accept operational roles and reject owner escalation", () => {
    assert.doesNotThrow(() => schemas.prepare_member_invites.parse({
        members: [
            { email: "manager@example.com", role: "manager" },
            { email: "staff@example.com", role: "staff" },
        ],
    }));
    assert.throws(() => schemas.prepare_member_invites.parse({
        members: [{ email: "attacker@example.com", role: "owner" }],
    }));
    assert.doesNotThrow(() => schemas.execute_approved_member_invites.parse({ approvalId: "approval-123" }));
    assert.throws(() => schemas.execute_approved_member_invites.parse({
        approvalId: "approval-123",
        members: [{ email: "changed@example.com", role: "owner" }],
    }));
});

test("booking constraints reject overlaps while allowing any available staff member", () => {
    const s = workspaceFixture();
    const p = {
        customerId: "c2",
        staffId: "s1",
        date: s.appointments[0].date,
        time: "09:30",
        duration: 60,
        service: "Hair styling",
    };
    assert.throws(() => validateBooking(s, p), /conflicts/);
    assert.doesNotThrow(() => validateBooking(s, { ...p, time: "10:00" }));
    assert.doesNotThrow(() => validateBooking(s, { ...p, staffId: "s3", time: "10:00" }));
});

test("unavailable staff, invalid customers, and out-of-hours bookings are rejected", () => {
    const s = workspaceFixture();
    const p = {
        customerId: "c2",
        staffId: "s2",
        date: s.appointments[0].date,
        time: "16:00",
        duration: 60,
        service: "Hair styling",
    };
    s.staff[1].status = "Unavailable";
    assert.throws(() => validateBooking(s, p), /available/);
    s.staff[1].status = "Available";
    assert.throws(
        () => validateBooking(s, { ...p, customerId: "unknown" }),
        /Customer/,
    );
    assert.throws(() => validateBooking(s, { ...p, time: "18:00" }), /09:00/);
});
