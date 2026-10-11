import test from "node:test";
import assert from "node:assert/strict";
import { workspaceFixture } from "./fixtures/workspace.fixture.js";
import { validateBooking, canRun } from "../services/tool.service.js";

test("role separation prevents customer and coordinator agents from changing bookings or money", () => {
    assert.equal(canRun("customer", "cancel_booking"), false);
    assert.equal(canRun("customer", "request_refund"), false);
    assert.equal(canRun("coordinator", "propose_booking"), false);
    assert.equal(canRun("operations", "propose_booking"), true);
    assert.equal(canRun("resolution", "request_refund"), true);
    assert.equal(canRun("resolution", "export_customers"), false);
});

test("booking constraints reject overlaps and unqualified staff while allowing an adjacent slot", () => {
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
    assert.throws(() => validateBooking(s, { ...p, staffId: "s3" }), /qualified/);
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
    assert.throws(() => validateBooking(s, p), /qualified/);
    s.staff[1].status = "Available";
    assert.throws(
        () => validateBooking(s, { ...p, customerId: "unknown" }),
        /Customer/,
    );
    assert.throws(() => validateBooking(s, { ...p, time: "18:00" }), /09:00/);
});
