import { z } from "zod";
import { randomUUID } from "node:crypto";
import { snapshot, mutate, listWorkspaceMembers, listPlatformWorkspaces } from "./store.service.js";
import { assertEmailDeliveryConfigured, sendWorkspaceInvitation } from "./email.service.js";

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
    prepare_booking_cancellation: z.object({
        bookingId: id,
        reason: text.optional(),
    }),
    execute_approved_booking_cancellation: z.object({ approvalId: id }).strict(),
    prepare_booking_reschedule: z.object({
        bookingId: id,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^(0\d|1\d|2[0-3]):[0-5]\d$/),
        reason: text.optional(),
    }),
    execute_approved_booking_reschedule: z.object({ approvalId: id }).strict(),
    analyze_schedule_conflicts: z.object({}).strict(),
    prepare_schedule_resolution: z.object({
        bookingId: id,
        staffId: id,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        time: z.string().regex(/^(0\d|1\d|2[0-3]):[0-5]\d$/),
        reason: text,
    }).strict(),
    execute_approved_schedule_resolution: z.object({ approvalId: id }).strict(),
    export_customers: z.object({}),
    submit_customer_request: z.object({
        category: z.enum(["refund", "cancellation", "reschedule", "booking"]),
        message: text,
    }),
    read_team_access: z.object({}),
    prepare_member_invites: z.object({
        members: z.array(z.object({
            email: z.string().trim().toLowerCase().email(),
            role: z.enum(["manager", "receptionist", "staff"]),
        })).min(1).max(10),
    }),
    execute_approved_member_invites: z.object({ approvalId: id }).strict(),
    admin_read_platform_health: z.object({}).strict(),
    admin_list_workspace_health: z.object({}).strict(),
    admin_read_governance_audit: z.object({}).strict(),
    admin_pause_business_ai: z.object({ targetWorkspaceId: id, reason: text }).strict(),
    admin_resume_business_ai: z.object({ targetWorkspaceId: id, reason: text }).strict(),
    admin_export_platform_registry: z.object({}).strict(),
};

export const mcpSchemas = Object.fromEntries(
    Object.entries(schemas).map(([name, schema]) => [
        name,
        schema.extend({ workspaceId: id }),
    ]),
);

export const roles = {
    coordinator: ["read_workspace"],
    customer: ["read_workspace", "draft_message", "submit_customer_request"],
    operations: ["read_workspace", "create_task", "propose_booking", "create_booking", "prepare_booking_cancellation", "execute_approved_booking_cancellation", "prepare_booking_reschedule", "execute_approved_booking_reschedule", "analyze_schedule_conflicts", "prepare_schedule_resolution", "execute_approved_schedule_resolution"],
    resolution: ["read_workspace", "request_refund", "create_task"],
    access: ["read_team_access", "prepare_member_invites", "execute_approved_member_invites"],
    security: ["export_customers"],
    admin: ["admin_read_platform_health", "admin_list_workspace_health", "admin_read_governance_audit", "admin_pause_business_ai", "admin_resume_business_ai", "admin_export_platform_registry"],
};

export function canRun(role, action) {
    return Boolean(roles[role]?.includes(action));
}

const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

export function validateBooking(s, p) {
    const staff = s.staff.find((x) => x.id === p.staffId);
    if (!s.customers.some((x) => x.id === p.customerId))
        throw Error("Customer not found");

    if (!staff || staff.status !== "Available")
        throw Error("No available staff member");

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

export function analyzeScheduleConflicts(state) {
    const active = (state.appointments || []).filter((booking) => !["Cancelled", "Declined"].includes(booking.status));
    const conflicts = [];
    active.forEach((booking, index) => {
        const assigned = state.staff.find((person) => person.id === booking.staffId);
        if (!assigned || assigned.status !== "Available")
            conflicts.push({ type: "staff_unavailable", bookingId: booking.id, date: booking.date, time: booking.time, staffId: booking.staffId, reason: "Assigned staff member is unavailable" });
        active.slice(index + 1).forEach((other) => {
            if (booking.date !== other.date || (booking.staffId !== other.staffId && booking.customerId !== other.customerId)) return;
            if (minutes(booking.time) < minutes(other.time) + other.duration && minutes(other.time) < minutes(booking.time) + booking.duration)
                conflicts.push({ type: "overlap", bookingId: other.id, conflictingBookingId: booking.id, date: booking.date, time: other.time, staffId: other.staffId, reason: booking.staffId === other.staffId ? "Staff member has overlapping appointments" : "Customer has overlapping appointments" });
        });
    });
    return conflicts.map((conflict) => {
        const booking = active.find((item) => item.id === conflict.bookingId);
        const alternatives = [];
        for (const person of state.staff || []) for (let start = 540; start + booking.duration <= 1080; start += 30) {
            if (alternatives.length >= 5) break;
            const candidate = { ...booking, staffId: person.id, time: `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}` };
            try { validateBooking({ ...state, appointments: active.filter((item) => item.id !== booking.id) }, candidate); alternatives.push({ staffId: person.id, staffName: person.name, date: booking.date, time: candidate.time }); } catch { /* Candidate is not valid. */ }
        }
        return { ...conflict, service: booking.service, alternatives };
    });
}

export function findBookingAlternatives(state, booking, limit = 6) {
    const alternatives = [];
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const baseText = booking.date < today ? today : booking.date;
    const [baseYear, baseMonth, baseDay] = baseText.split("-").map(Number);
    const base = new Date(Date.UTC(baseYear, baseMonth - 1, baseDay));
    const withoutBooking = { ...state, appointments: (state.appointments || []).filter((item) => item.id !== booking.id) };
    for (let day = 0; day < 7 && alternatives.length < limit; day += 1) {
        const date = new Date(base);
        date.setUTCDate(base.getUTCDate() + day);
        const dateText = date.toISOString().slice(0, 10);
        for (let start = 540; start + booking.duration <= 1080 && alternatives.length < limit; start += 30) {
            const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
            if (dateText === booking.date && time === booking.time) continue;
            if (dateText === today && start <= now.getHours() * 60 + now.getMinutes()) continue;
            for (const person of state.staff || []) {
                const candidate = { ...booking, staffId: person.id, date: dateText, time };
                try {
                    validateBooking(withoutBooking, candidate);
                    alternatives.push({ staffId: person.id, date: dateText, time });
                    break;
                } catch { /* Only validated alternatives are returned. */ }
            }
        }
    }
    return alternatives;
}

export async function executeTool(action, raw, explicitWorkspaceId) {
    const schema = schemas[action];

    if (!schema) throw Error("Unknown tool");

    const workspaceId = explicitWorkspaceId || raw?.workspaceId;

    if (!workspaceId) throw Error("Workspace identity is required");

    const { workspaceId: _ignored, ...businessParams } = raw || {};

    const p = schema.parse(businessParams);

    if (action.startsWith("admin_")) {
        const workspaces = await listPlatformWorkspaces();
        if (action === "admin_read_platform_health") return {
            status: "Operational",
            workspaces: workspaces.length,
            publishedAssistants: workspaces.filter(({ data }) => data.aiProfile?.status === "published" && data.aiProfile?.platformStatus !== "paused").length,
            pausedAssistants: workspaces.filter(({ data }) => data.aiProfile?.platformStatus === "paused").length,
            heldDelegations: workspaces.flatMap(({ data }) => data.events || []).filter((event) => event.status === "Held" && event.delegationId).length,
        };
        if (action === "admin_list_workspace_health") return workspaces.map(({ workspaceId: targetWorkspaceId, data }) => ({
            workspaceId: targetWorkspaceId,
            businessName: data.business?.name || "Unnamed workspace",
            aiStatus: data.aiProfile?.status || "draft",
            platformStatus: data.aiProfile?.platformStatus || "active",
            workflowCount: (data.runs || []).length,
            heldDelegations: (data.events || []).filter((event) => event.status === "Held" && event.delegationId).length,
        }));
        if (action === "admin_read_governance_audit") return workspaces.flatMap(({ workspaceId: targetWorkspaceId, data }) =>
            (data.events || []).filter((event) => event.delegationId || /ArmorIQ/i.test(event.source || "")).slice(0, 25).map((event) => ({
                workspaceId: targetWorkspaceId,
                businessName: data.business?.name || "Unnamed workspace",
                action: event.action,
                status: event.status,
                source: event.source,
                delegationId: event.delegationId || null,
                createdAt: event.createdAt,
            })),
        ).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 50);
        if (action === "admin_export_platform_registry")
            throw Error("Platform registry export is blocked by the OperIQ application boundary");
        if (["admin_pause_business_ai", "admin_resume_business_ai"].includes(action)) {
            const exists = workspaces.some((item) => item.workspaceId === p.targetWorkspaceId);
            if (!exists) throw Error("Target workspace not found");
            return mutate(p.targetWorkspaceId, (state) => {
                state.aiProfile ||= {};
                state.aiProfile.platformStatus = action === "admin_pause_business_ai" ? "paused" : "active";
                state.aiProfile.platformStatusReason = p.reason;
                state.aiProfile.platformStatusChangedAt = new Date().toISOString();
                return {
                    workspaceId: p.targetWorkspaceId,
                    businessName: state.business?.name,
                    platformStatus: state.aiProfile.platformStatus,
                    reason: p.reason,
                };
            });
        }
    }

    if (action === "read_workspace") return snapshot(workspaceId);
    if (action === "analyze_schedule_conflicts") {
        const state = await snapshot(workspaceId);
        return { conflicts: analyzeScheduleConflicts(state), checkedAt: new Date().toISOString() };
    }
    if (action === "read_team_access") {
        const members = await listWorkspaceMembers(workspaceId);
        return {
            members: members.map((member) => ({ email: member.email, role: member.role || "owner" })),
            counts: members.reduce((counts, member) => {
                const role = member.role || "owner";
                counts[role] = (counts[role] || 0) + 1;
                return counts;
            }, { owner: 0, manager: 0, receptionist: 0, staff: 0 }),
        };
    }

    if (action === "prepare_member_invites") {
        const existing = await listWorkspaceMembers(workspaceId);
        const existingEmails = new Set(existing.map((member) => member.email.toLowerCase()));
        const uniqueEmails = new Set();
        for (const member of p.members) {
            if (existingEmails.has(member.email)) throw Error(`${member.email} already has workspace access`);
            if (uniqueEmails.has(member.email)) throw Error(`${member.email} is repeated in this invitation batch`);
            uniqueEmails.add(member.email);
        }
        return mutate(workspaceId, (s) => {
            s.approvals ||= [];
            s.invitations ||= [];
            const pendingEmails = new Set([
                ...s.invitations.filter((item) => item.status === "Pending").map((item) => item.email),
                ...s.approvals
                    .filter((item) => item.type === "Team invitation" && item.status === "Pending")
                    .flatMap((item) => item.members.map((member) => member.email)),
            ]);
            for (const member of p.members)
                if (pendingEmails.has(member.email)) throw Error(`${member.email} already has a pending invitation or proposal`);
            const now = new Date();
            const row = {
                id: randomUUID(),
                type: "Team invitation",
                members: p.members,
                status: "Pending",
                executionStatus: "Not started",
                requestedBy: "OperIQ AI",
                createdAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            };
            s.approvals.unshift(row);
            return row;
        });
    }

    if (action === "execute_approved_member_invites") {
        assertEmailDeliveryConfigured();
        const workspaceBeforeExecution = await snapshot(workspaceId);
        const proposedApproval = workspaceBeforeExecution.approvals?.find((item) => item.id === p.approvalId);
        if (!proposedApproval || proposedApproval.type !== "Team invitation") throw Error("Invitation approval not found");
        if (proposedApproval.status !== "Approved" || proposedApproval.approvedByRole !== "owner")
            throw Error("A workspace owner has not approved this invitation proposal");
        if (Date.parse(proposedApproval.expiresAt) <= Date.now()) throw Error("This invitation approval has expired");

        const existing = await listWorkspaceMembers(workspaceId);
        const existingEmails = new Set(existing.map((member) => member.email.toLowerCase()));
        const uniqueEmails = new Set();
        for (const member of proposedApproval.members) {
            if (existingEmails.has(member.email)) throw Error(`${member.email} already has workspace access`);
            if (uniqueEmails.has(member.email)) throw Error(`${member.email} is repeated in this invitation batch`);
            uniqueEmails.add(member.email);
        }

        const approval = await mutate(workspaceId, (s) => {
            const row = s.approvals?.find((item) => item.id === p.approvalId);
            if (!row || row.type !== "Team invitation") throw Error("Invitation approval not found");
            if (row.status !== "Approved" || row.approvedByRole !== "owner")
                throw Error("A workspace owner has not approved this invitation proposal");
            if (Date.parse(row.expiresAt) <= Date.now()) throw Error("This invitation approval has expired");
            if (["Executing", "Completed"].includes(row.executionStatus))
                throw Error("This invitation approval has already been used");
            row.executionStatus = "Executing";
            row.executionStartedAt = new Date().toISOString();
            return structuredClone(row);
        });
        const invitations = await mutate(workspaceId, (s) => {
            s.invitations ||= [];
            const pendingEmails = new Set(s.invitations.filter((item) => item.status === "Pending").map((item) => item.email));
            for (const member of approval.members)
                if (pendingEmails.has(member.email)) throw Error(`${member.email} already has a pending invitation`);
            const now = new Date().toISOString();
            const rows = approval.members.map((member) => ({
                id: randomUUID(),
                token: randomUUID(),
                approvalId: approval.id,
                ...member,
                status: "Pending",
                deliveryStatus: "Queued",
                createdAt: now,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }));
            s.invitations.push(...rows);
            return rows;
        });
        const workspace = await snapshot(workspaceId);
        const deliveries = await Promise.allSettled(invitations.map((invitation) =>
            sendWorkspaceInvitation({
                ...invitation,
                businessName: workspace.business.name,
            }),
        ));
        await mutate(workspaceId, (s) => {
            deliveries.forEach((delivery, index) => {
                const row = s.invitations.find((item) => item.id === invitations[index].id);
                if (!row) return;
                if (delivery.status === "fulfilled") {
                    row.deliveryStatus = "Sent";
                    row.sentAt = new Date().toISOString();
                    row.messageId = delivery.value.messageId;
                } else {
                    row.deliveryStatus = "Failed";
                    row.deliveryError = String(delivery.reason?.message || "Email delivery failed").slice(0, 300);
                }
            });
            const approved = s.approvals.find((item) => item.id === approval.id);
            if (approved) {
                approved.executionStatus = deliveries.some((delivery) => delivery.status === "rejected")
                    ? "Failed"
                    : "Completed";
                approved.executedAt = new Date().toISOString();
                approved.result = deliveries.some((delivery) => delivery.status === "rejected")
                    ? "Some invitation emails could not be delivered"
                    : `${invitations.length} invitation email${invitations.length === 1 ? "" : "s"} sent`;
            }
        });
        const failed = deliveries.filter((delivery) => delivery.status === "rejected").length;
        if (failed) throw Error(`${failed} of ${deliveries.length} invitation emails could not be sent`);
        return invitations.map(({ token: _token, ...invitation }) => ({
            ...invitation,
            deliveryStatus: "Sent",
        }));
    }

    if (action === "submit_customer_request") {
        return mutate(workspaceId, (s) => {
            s.customerRequests ||= [];
            const row = {
                id: randomUUID(),
                ...p,
                status: "Pending review",
                createdAt: new Date().toISOString(),
            };
            s.customerRequests.unshift(row);
            return row;
        });
    }

    return mutate(workspaceId, (s) => {
        if (action === "prepare_booking_cancellation") {
            const booking = s.appointments.find((item) => item.id === p.bookingId);
            if (!booking) throw Error("Booking not found");
            if (["Cancelled", "Declined"].includes(booking.status)) throw Error("Booking is already inactive");
            if (s.approvals.some((item) => item.type === "Booking cancellation" && item.bookingId === p.bookingId && item.status === "Pending"))
                throw Error("A cancellation proposal is already pending for this booking");
            const now = new Date();
            const row = {
                id: randomUUID(),
                type: "Booking cancellation",
                bookingId: p.bookingId,
                customerId: booking.customerId,
                reason: p.reason || "AI-proposed booking cancellation",
                status: "Pending",
                executionStatus: "Not started",
                requestedBy: "OperIQ AI",
                createdAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            };
            s.approvals.unshift(row);
            return row;
        }

        if (action === "prepare_booking_reschedule") {
            const booking = s.appointments.find((item) => item.id === p.bookingId);
            if (!booking) throw Error("Booking not found");
            if (["Cancelled", "Declined"].includes(booking.status)) throw Error("Booking is inactive");
            validateBooking(
                { ...s, appointments: s.appointments.filter((item) => item.id !== booking.id) },
                { ...booking, date: p.date, time: p.time },
            );
            if (s.approvals.some((item) => item.type === "Booking reschedule" && item.bookingId === p.bookingId && item.status === "Pending"))
                throw Error("A reschedule proposal is already pending for this booking");
            const now = new Date();
            const row = {
                id: randomUUID(),
                type: "Booking reschedule",
                bookingId: p.bookingId,
                customerId: booking.customerId,
                fromDate: booking.date,
                fromTime: booking.time,
                date: p.date,
                time: p.time,
                reason: p.reason || "AI-proposed booking reschedule",
                status: "Pending",
                executionStatus: "Not started",
                requestedBy: "OperIQ AI",
                createdAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            };
            s.approvals.unshift(row);
            return row;
        }

        if (action === "prepare_schedule_resolution") {
            const booking = s.appointments.find((item) => item.id === p.bookingId);
            if (!booking) throw Error("Booking not found");
            validateBooking(
                { ...s, appointments: s.appointments.filter((item) => item.id !== booking.id) },
                { ...booking, staffId: p.staffId, date: p.date, time: p.time },
            );
            if (s.approvals.some((item) => item.type === "Schedule conflict resolution" && item.bookingId === booking.id && item.status === "Pending"))
                throw Error("A conflict resolution proposal is already pending for this booking");
            const now = new Date();
            const row = { id: randomUUID(), type: "Schedule conflict resolution", bookingId: booking.id, customerId: booking.customerId, fromStaffId: booking.staffId, staffId: p.staffId, fromDate: booking.date, fromTime: booking.time, date: p.date, time: p.time, reason: p.reason, status: "Pending", executionStatus: "Not started", requestedBy: "Operations agent", createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() };
            s.approvals.unshift(row);
            return row;
        }

        if (["execute_approved_booking_cancellation", "execute_approved_booking_reschedule", "execute_approved_schedule_resolution"].includes(action)) {
            const approval = s.approvals.find((item) => item.id === p.approvalId);
            const expectedType = action === "execute_approved_booking_cancellation" ? "Booking cancellation" : action === "execute_approved_booking_reschedule" ? "Booking reschedule" : "Schedule conflict resolution";
            if (!approval || approval.type !== expectedType) throw Error("Booking approval not found");
            if (approval.status !== "Approved" || approval.approvedByRole !== "owner")
                throw Error("A workspace owner has not approved this booking change");
            if (Date.parse(approval.expiresAt) <= Date.now()) throw Error("This booking approval has expired");
            if (["Executing", "Completed"].includes(approval.executionStatus))
                throw Error("This booking approval has already been used");
            const booking = s.appointments.find((item) => item.id === approval.bookingId);
            if (!booking) throw Error("Booking not found");
            approval.executionStatus = "Executing";
            approval.executionStartedAt = new Date().toISOString();
            if (action === "execute_approved_booking_cancellation") {
                if (["Cancelled", "Declined"].includes(booking.status)) throw Error("Booking is already inactive");
                booking.status = "Cancelled";
            } else {
                validateBooking(
                    { ...s, appointments: s.appointments.filter((item) => item.id !== booking.id) },
                    { ...booking, staffId: approval.staffId || booking.staffId, date: approval.date, time: approval.time },
                );
                if (approval.staffId) booking.staffId = approval.staffId;
                booking.date = approval.date;
                booking.time = approval.time;
                booking.status = "Confirmed";
            }
            approval.executionStatus = "Completed";
            approval.executedAt = new Date().toISOString();
            approval.result = action === "execute_approved_booking_cancellation"
                ? "Booking cancelled after owner approval"
                : action === "execute_approved_schedule_resolution"
                ? `Schedule conflict resolved for ${approval.date} at ${approval.time} after owner approval`
                : `Booking rescheduled to ${approval.date} at ${approval.time} after owner approval`;
            return booking;
        }

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

        if (action === "export_customers") return s.customers;
    });
}
