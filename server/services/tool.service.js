import { z } from "zod";
import { randomUUID } from "node:crypto";
import { snapshot, mutate } from "./store.service.js";

const id = z.string().min(1).max(100),
    text = z.string().min(1).max(2000);

export const schemas = {
    read_workspace: z.object({}),
    create_task: z.object({ title: text, assignedTo: id }),
    draft_message: z.object({ customerId: id, body: text }),
    propose_booking: z.object({
        customerId: id,
        staffId: id,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^(0\d|1\d|2[0-3]):[0-5]\d$/),
        service: text,
        duration: z.number().int().min(15).max(240),
    }),
    create_booking: z.object({
        customerId: id, staffId: id,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^(0\d|1\d|2[0-3]):[0-5]\d$/),
        service: text, duration: z.number().int().min(15).max(240),
    }),
    request_refund: z.object({
        complaintId: id,
        amount: z.number().positive().max(10000),
        reason: text,
    }),
    cancel_booking: z.object({ bookingId: id }),
    export_customers: z.object({}),
};

export const mcpSchemas = Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [
        name,
        schema.extend({ workspaceId: id }),
    ]),
);

export const roles = {
    coordinator: ["read_workspace"],
    customer: ["read_workspace", "draft_message"],
    operations: ["read_workspace", "create_task", "propose_booking", "create_booking"],
    resolution: ["read_workspace", "request_refund", "create_task"],
};

export function canRun(role, action) {
    return Boolean(roles[role]?.includes(action));
}

const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

export function validateBooking(s, p) {
    const staff = s.staff.find((x) => x.id === p.staffId);
    if (!s.customers.some((x) => x.id === p.customerId))
        throw Error("Customer not found");

    if (
        !staff ||
        staff.status !== "Available" ||
        !staff.skills.includes(p.service)
    )
        throw Error("No qualified available staff member");

    if (minutes(p.time) < 540 || minutes(p.time) + p.duration > 1080)
        throw Error("Appointments must be within 09:00–18:00");

    if (
        s.appointments.some(
        (b) =>
            b.status !== "Cancelled" &&
            b.status !== "Declined" &&
            b.date === p.date &&
            (b.staffId === p.staffId || b.customerId === p.customerId) &&
            minutes(b.time) < minutes(p.time) + p.duration &&
            minutes(p.time) < minutes(b.time) + b.duration,
        )
    )
        throw Error("This appointment conflicts with an existing booking");
}

export async function executeTool(action, raw, explicitWorkspaceId) {
    const schema = schemas[action];

    if (!schema) throw Error("Unknown tool");

    const workspaceId = explicitWorkspaceId || raw?.workspaceId;

    if (!workspaceId) throw Error("Workspace identity is required");

    const { workspaceId: _ignored, ...businessParams } = raw || {};

    const p = schema.parse(businessParams);

    if (action === "read_workspace") return snapshot(workspaceId);

    return mutate(workspaceId, (s) => {
        if (action === "create_task") {
            if (!s.staff.some((x) => x.id === p.assignedTo))
                throw Error("Staff member not found");
            const row = {
                id: randomUUID(),
                ...p,
                status: "To do",
                priority: "Normal",
            };
            s.tasks.push(row);
            return row;
        }

        if (action === "draft_message") {
            if (!s.customers.some((x) => x.id === p.customerId))
                throw Error("Customer not found");
            const row = {
                id: randomUUID(),
                ...p,
                status: "Draft",
                createdAt: new Date().toISOString(),
            };
            s.messages.push(row);
            return row;
        }

        if (action === "propose_booking" || action === "create_booking") {
            validateBooking(s, p);
            const row = { id: randomUUID(), ...p, status: action === "create_booking" ? "Confirmed" : "Awaiting customer" };
            s.appointments.push(row);
            return row;
        }

        if (action === "request_refund") {
            const complaint = s.complaints.find((x) => x.id === p.complaintId);

            if (!complaint) throw Error("Complaint not found");

            if (p.amount > complaint.amount)
                throw Error("Refund exceeds original charge");

            if (
                s.approvals.some(
                (x) => x.complaintId === p.complaintId && x.status !== "Rejected",
                )
            )
                throw Error("A refund request already exists");

            const row = {
                id: randomUUID(),
                ...p,
                customerId: complaint.customerId,
                status: "Pending",
                type: "Sandbox refund",
                createdAt: new Date().toISOString(),
            };

            s.approvals.push(row);
            return row;
        }

        if (action === "cancel_booking") {
            const b = s.appointments.find((x) => x.id === p.bookingId);
            if (!b) throw Error("Booking not found");
            b.status = "Cancelled";
            return b;
        }
        
        if (action === "export_customers") return s.customers;
    });
}
