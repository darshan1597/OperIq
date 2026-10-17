import axios from "axios";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { snapshot, mutate, listWorkspaceMembers } from "./store.service.js";
import { analyzeScheduleConflicts, schemas, roles } from "./tool.service.js";
import {
    isLive,
    createAuthority,
    governedCall,
    probe,
} from "./governance.service.js";
import { reportProgress } from "./request-progress.service.js";

const stepSchema = z.object({
    agent: z.enum(["coordinator", "customer", "operations", "resolution", "access"]),
    action: z.string(),
    params: z.record(z.unknown()),
    explanation: z.string().max(500),
});

const planSchema = z.object({
    summary: z.string().max(1000),
    steps: z.array(stepSchema).min(1).max(10),
});

const running = new Set();

export function inferWorkflow(goal, steps = []) {
    if (steps.some((step) => ["analyze_schedule_conflicts", "prepare_schedule_resolution"].includes(step.action)) || /\b(schedule conflicts?|overlap(?:ping|ped|s)?|double.book(?:ing|ed)?|conflict scan|find conflicts|unavailable assigned staff)\b/i.test(goal))
        return "conflict";
    if (steps.some((step) => step.agent === "access" || ["read_team_access", "prepare_member_invites"].includes(step.action)))
        return "access";
    if (steps.some((step) => step.action === "request_refund") || /\b(complaint|refund|compensation|service recovery)\b/i.test(goal))
        return "complaint";
    if (/\b(absent|absence|unavailable|staff disruption|coverage|replacement)\b/i.test(goal))
        return "absence";
    return "enquiry";
}

function planningContext(state) {
    const profile = state.aiProfile || {};
    return {
        business: state.business,
        aiProfile: {
            industry: profile.industry,
            openingHours: profile.openingHours,
            cancellationPolicy: profile.cancellationPolicy,
            escalationRule: profile.escalationRule,
            services: (profile.services || []).map(({ id, name, price, duration, description }) => ({
                id, name, price, duration, description,
            })),
        },
        customers: (state.customers || []).map(({ id, name, email, service, visits, status }) => ({
            id, name, email, service, visits, status,
        })),
        staff: (state.staff || []).map(({ id, name, email, skills, status }) => ({
            id, name, email, skills, status,
        })),
        appointments: (state.appointments || []).map(({ id, customerId, staffId, date, time, service, duration, status }) => ({
            id, customerId, staffId, date, time, service, duration, status,
        })),
        tasks: (state.tasks || [])
            .filter((task) => task.status !== "Done")
            .map(({ id, title, assignedTo, status, priority }) => ({ id, title, assignedTo, status, priority })),
        complaints: (state.complaints || [])
            .filter((complaint) => complaint.status === "Open")
            .map(({ id, customerId, bookingId, subject, message, amount, status }) => ({
                id, customerId, bookingId, subject, message, amount, status,
            })),
        pendingApprovals: (state.approvals || [])
            .filter((approval) => approval.status === "Pending")
            .map(({ id, type, customerId, complaintId, bookingId, members, date, time, status }) => ({
                id, type, customerId, complaintId, bookingId, members, date, time, status,
            })),
    };
}

export function enforceConflictPlan(state, plan) {
    const analysisStep = plan.steps.find((step) => step.action === "analyze_schedule_conflicts") || {
        agent: "operations",
        action: "analyze_schedule_conflicts",
        params: {},
        explanation: "Inspect active bookings for overlaps and unavailable staff assignments.",
    };
    const conflicts = analyzeScheduleConflicts(state);
    const conflict = conflicts.find((item) => item.alternatives.length > 0);
    if (!conflict) {
        plan.steps = [analysisStep];
        plan.summary = conflicts.length
            ? "A schedule conflict was detected, but no validated alternative is currently available. Keep the booking unchanged and arrange qualified staff availability before preparing a resolution."
            : "The current schedule contains no overlapping appointments or unavailable staff assignments.";
        return plan;
    }
    const alternative = conflict.alternatives[0];
    plan.steps = [analysisStep, {
        agent: "operations",
        action: "prepare_schedule_resolution",
        params: {
            bookingId: conflict.bookingId,
            staffId: alternative.staffId,
            date: alternative.date,
            time: alternative.time,
            reason: conflict.reason,
        },
        explanation: "Prepare a validated alternative for owner review without changing the booking.",
    }];
    plan.summary = "A schedule conflict was detected and a validated alternative will be prepared for owner approval.";
    return plan;
}

export function verifyAccessRecipients(goal, plan) {
    const accessSteps = plan.steps.filter((step) => step.action === "prepare_member_invites");
    const requestedEmails = [...new Set(
        (goal.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
            .map((email) => email.toLowerCase()),
    )];
    const invitationRequested = accessSteps.length > 0 || (
        requestedEmails.length > 0 &&
        /\b(invite|invitation|onboard|add|grant\s+access)\b/i.test(goal)
    );
    if (!invitationRequested) return;
    if (!accessSteps.length)
        throw Object.assign(Error("Team onboarding must prepare an owner approval proposal"), { status: 422 });
    if (accessSteps.length !== 1)
        throw Object.assign(Error("Team onboarding must use one invitation batch"), { status: 422 });

    const plannedMembers = accessSteps[0].params.members || [];
    const plannedEmails = [...new Set(plannedMembers.map((member) => member.email.toLowerCase()))];
    if (!requestedEmails.length || requestedEmails.length !== plannedEmails.length ||
        requestedEmails.some((email) => !plannedEmails.includes(email)))
        throw Object.assign(Error("The AI changed or omitted an invitation email. Review the request and run it again."), { status: 422 });

    for (const line of goal.split(/\r?\n/)) {
        const email = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase();
        const explicitRole = line.match(/\bas\s+(manager|receptionist|staff)\b/i)?.[1]?.toLowerCase();
        if (!email || !explicitRole) continue;
        const member = plannedMembers.find((item) => item.email.toLowerCase() === email);
        if (!member || member.role !== explicitRole)
            throw Object.assign(Error(`The AI changed the requested role for ${email}.`), { status: 422 });
    }
}

async function rehearsal(workflow, s, workspaceId) {
    const unavailable = (message) => {
        throw Object.assign(Error(message), { status: 422 });
    };

    if (workflow === "access") {
        const members = await listWorkspaceMembers(workspaceId);
        const counts = members.reduce((result, member) => {
            const role = member.role || "owner";
            result[role] = (result[role] || 0) + 1;
            return result;
        }, { manager: 0, receptionist: 0, staff: 0 });
        return unavailable(`Live AI planning is required to extract invitation emails. Current counts: ${counts.manager} managers, ${counts.receptionist} receptionists, ${counts.staff} staff.`);
    }

    if (workflow === "complaint") {
        const complaint = s.complaints.find((item) => item.status === "Open") || s.complaints[0];
        const customer = complaint && s.customers.find((item) => item.id === complaint.customerId);
        const booking = complaint && s.appointments.find((item) => item.id === complaint.bookingId);
        const staff = (booking && s.staff.find((item) => item.id === booking.staffId)) || s.staff[0];
        if (!complaint || !customer || !staff)
            return unavailable("Add a customer, staff member, and complaint before running a complaint workflow.");
        return {
            summary: "Review the complaint, prepare a response, and request compensation approval.",
            steps: [
                { agent: "customer", action: "draft_message", params: { customerId: customer.id, body: `Hi ${customer.name}, thank you for sharing your feedback. We are reviewing the issue and will follow up with you shortly.` }, explanation: "Prepare a response for owner review." },
                { agent: "resolution", action: "create_task", params: { title: `Review ${customer.name}'s complaint and arrange a follow-up`, assignedTo: staff.id }, explanation: "Assign a staff member to investigate." },
                { agent: "resolution", action: "request_refund", params: { complaintId: complaint.id, amount: Math.min(complaint.amount, Math.max(1, Math.round(complaint.amount / 2))), reason: "Proposed goodwill compensation" }, explanation: "Request owner approval; no payment is made." },
            ],
        };
    }

    if (workflow === "absence") {
        const absent = s.staff.find((item) => item.status === "Unavailable") || s.staff[0];
        const booking = absent && s.appointments.find((item) => item.staffId === absent.id && item.status !== "Cancelled");
        const customer = booking && s.customers.find((item) => item.id === booking.customerId);
        const replacement = booking && s.staff.find((item) => item.id !== absent.id && item.status === "Available");
        if (!absent || !booking || !customer || !replacement)
            return unavailable("Add an affected appointment and a qualified replacement staff member before running an absence workflow.");
        return {
            summary: "Coordinate coverage and prepare a customer alternative without changing the confirmed booking.",
            steps: [
                { agent: "operations", action: "create_task", params: { title: `Coordinate coverage for ${absent.name}'s appointment`, assignedTo: replacement.id }, explanation: "Ask a qualified colleague to coordinate coverage." },
                { agent: "customer", action: "draft_message", params: { customerId: customer.id, body: `Hi ${customer.name}, ${absent.name} is unavailable for your appointment. Would you be comfortable seeing ${replacement.name}?` }, explanation: "Seek customer consent before moving the appointment." },
            ],
        };
    }

    if (workflow === "conflict") {
        const conflicts = analyzeScheduleConflicts(s);
        const conflict = conflicts.find((item) => item.alternatives.length);
        if (!conflict) return unavailable(conflicts.length ? "Schedule conflicts were found, but no safe alternative is currently available." : "No schedule conflicts were found.");
        const alternative = conflict.alternatives[0];
        return {
            summary: "Detect the schedule conflict and prepare a safe alternative for owner approval.",
            steps: [
                { agent: "operations", action: "analyze_schedule_conflicts", params: {}, explanation: "Inspect active bookings for overlaps and unavailable staff assignments." },
                { agent: "operations", action: "prepare_schedule_resolution", params: { bookingId: conflict.bookingId, staffId: alternative.staffId, date: alternative.date, time: alternative.time, reason: conflict.reason }, explanation: "Prepare the safest available correction for owner review." },
            ],
        };
    }

    const customer = s.customers.find((item) => item.status === "Waitlisted") || s.customers[0];
    const staff = s.staff.find((item) => item.status === "Available");
    if (!customer || !staff)
        return unavailable("Add at least one customer and one available staff member before running an enquiry workflow.");
    const service = customer.service || s.aiProfile?.services?.[0]?.name;
    if (!service) return unavailable("Configure at least one service before running an enquiry workflow.");
    const date = new Date().toISOString().slice(0, 10);
    return {
        summary: "Prepare a customer invitation and a suitable booking proposal.",
        steps: [
            { agent: "customer", action: "draft_message", params: { customerId: customer.id, body: `Hi ${customer.name}, we have availability for ${service}. Would you like us to propose a time with ${staff.name}?` }, explanation: "Prepare a customer invitation." },
            { agent: "operations", action: "propose_booking", params: { customerId: customer.id, staffId: staff.id, date, time: "16:00", service, duration: 60 }, explanation: "Create a proposal awaiting customer acceptance." },
            { agent: "operations", action: "create_task", params: { title: `Review ${customer.name}'s proposed appointment`, assignedTo: staff.id }, explanation: "Track the customer response." },
        ],
    };
}

async function modelPlan(goal, workspaceId) {
    const context = planningContext(await snapshot(workspaceId));
    const accessMembers = await listWorkspaceMembers(workspaceId);
    const teamAccess = accessMembers.map((member) => ({
        email: member.email,
        role: member.role || "owner",
    }));
    const { data } = await axios.post(
        `${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
        {
            model: process.env.GROQ_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are the OperIQ coordinator. Create JSON {summary,steps:[{agent,action,params,explanation}]}. Roles: ${JSON.stringify(roles)}. Tools: ${JSON.stringify(Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, Object.keys(schema.shape)])))}. Use only existing IDs. For team-access requests, use the access agent. Never assign owner. Respect every explicitly requested role. For emails without a requested role, balance only manager, receptionist, and staff counts as evenly as possible using these current members: ${JSON.stringify(teamAccess)}. Finish team onboarding with one prepare_member_invites step containing the complete batch; it creates only an owner proposal. For schedule conflict or overlap checks, first use analyze_schedule_conflicts. If the supplied context reveals a conflict and a valid alternative, follow it with prepare_schedule_resolution; this creates an owner proposal and must never silently change a booking. Confirmed booking cancellations must use prepare_booking_cancellation, and confirmed booking changes must use prepare_booking_reschedule. Never use an execute_approved tool while planning a user request; those tools are called by the server only after owner approval. Messages are drafts, bookings await customer acceptance, and refunds are approval requests. Use 1-6 steps. Context: ${JSON.stringify(context)}`,
                },
                { role: "user", content: goal },
            ],
        },
        {
            headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
            timeout: 60000,
        },
    );
    return JSON.parse(data.choices?.[0]?.message?.content || "{}");
}

export async function runWorkflow({
    goal,
    workflow = "auto",
    securityProbe = false,
    workspaceId,
    userEmail,
}) {
    if (running.has(workspaceId))
        throw Error("Another workflow is running in this workspace. Please wait.");
    running.add(workspaceId);
    const id = randomUUID();
    let waitingForArmorIQ = false;
    try {
        reportProgress("Coordinator agent is opening the workflow");
        await mutate(workspaceId, (s) =>
            s.runs.unshift({
                id,
                goal,
                status: "Planning",
                createdAt: new Date().toISOString(),
                mode: isLive() ? "live" : "sandbox",
            }),
        );

        reportProgress("Coordinator agent is reading the current workspace");
        const current = await snapshot(workspaceId);

        const planningWorkflow = workflow === "auto" ? inferWorkflow(goal) : workflow;
        reportProgress("Coordinator agent is planning the required steps");
        const plan = planSchema.parse(
            isLive()
                ? await modelPlan(goal, workspaceId)
                : await rehearsal(planningWorkflow, current, workspaceId),
        );

        for (const step of plan.steps) {
            if (!schemas[step.action]) throw Error("Model requested an unknown tool");
            step.params = schemas[step.action].parse(step.params);
        }
        if (planningWorkflow === "conflict") {
            enforceConflictPlan(current, plan);
            planSchema.parse(plan);
        }
        const resolvedWorkflow = inferWorkflow(goal, plan.steps);
        verifyAccessRecipients(goal, plan);

        const identity = { workspaceId, userEmail };

        const authority = await createAuthority(goal, plan.steps, identity);

        await mutate(workspaceId, (s) =>
            Object.assign(
                s.runs.find((row) => row.id === id),
                { summary: plan.summary, status: "Running", workflow: resolvedWorkflow, steps: plan.steps },
            ),
        );

        const runProbe = async () => {
          if (!securityProbe) return;
            const outcome = await probe(authority, identity);
            await mutate(workspaceId, (s) =>
                s.events.unshift({
                    id: randomUUID(),
                    runId: id,
                    agent: "Security test",
                    action: "export_customers",
                    ...outcome,
                    createdAt: new Date().toISOString(),
                }),
            );
        };

        const finalizeRun = async () => mutate(workspaceId, (s) => {
            const events = s.events.filter((event) => event.runId === id);
            const awaitingOwner = s.approvals?.some((approval) => approval.runId === id && approval.status === "Pending");
            s.runs.find((row) => row.id === id).status = events.some(
                (event) => event.status === "Failed",
            )
                ? "Needs attention"
                : events.some((event) => event.status === "Held")
                ? "Held"
                : awaitingOwner
                ? "Waiting for owner approval"
                : "Completed";
        });

        const executeFrom = async (startIndex = 0) => {
            for (let index = startIndex; index < plan.steps.length; index += 1) {
                const step = plan.steps[index];
                reportProgress(`${step.agent} agent started step ${index + 1}: ${step.action}`);
                let outcome;
                try {
                    outcome = await governedCall(authority, step, identity);
                } catch (error) {
                    outcome = {
                        status: "Failed",
                        source: isLive() ? "Live integration" : "Sandbox",
                        reason: error.message,
                        executed: false,
                    };
                }
                
                const { continuation, data: _toolResult, ...storedOutcome } = outcome;
                const eventId = randomUUID();
                await mutate(workspaceId, (s) => {
                    s.events.unshift({
                        id: eventId,
                        runId: id,
                        step: index + 1,
                        totalSteps: plan.steps.length,
                        agent: step.agent,
                        action: step.action,
                        params: step.params,
                        explanation: step.explanation,
                        ...storedOutcome,
                        createdAt: new Date().toISOString(),
                    });
                    const proposalTypeByAction = {
                        prepare_member_invites: "Team invitation",
                        prepare_booking_cancellation: "Booking cancellation",
                        prepare_booking_reschedule: "Booking reschedule",
                        prepare_schedule_resolution: "Schedule conflict resolution",
                    };
                    const proposalType = proposalTypeByAction[step.action];
                    if (proposalType && outcome.status === "Completed") {
                        const proposal = s.approvals?.find((item) =>
                            item.type === proposalType && item.status === "Pending" && !item.runId,
                        );
                        if (proposal) proposal.runId = id;
                    }
                });

                if (outcome.status === "Held" && continuation) {
                    waitingForArmorIQ = true;
                    await finalizeRun();
                    continuation.then(async (resumedOutcome) => {
                        await mutate(workspaceId, (s) => {
                            const event = s.events.find((row) => row.id === eventId);
                            if (event) Object.assign(event, resumedOutcome, {
                                resumedAt: new Date().toISOString(),
                            });
                            const run = s.runs.find((row) => row.id === id);
                            if (run) run.status = resumedOutcome.status === "Completed" ? "Running" : "Needs attention";
                        });
                        if (resumedOutcome.status === "Completed") {
                            const next = await executeFrom(index + 1);
                            if (!next.held) {
                                await runProbe();
                                await finalizeRun();
                                running.delete(workspaceId);
                            }
                        } else {
                            await finalizeRun();
                            running.delete(workspaceId);
                        }
                    }).catch(async (error) => {
                        await mutate(workspaceId, (s) => {
                            const event = s.events.find((row) => row.id === eventId);
                            if (event) Object.assign(event, {
                                status: "Failed",
                                reason: error.message,
                                executed: false,
                            });
                        });
                        await finalizeRun();
                        running.delete(workspaceId);
                    });
                    return { held: true };
                }
                if (["Failed", "Blocked"].includes(outcome.status))
                    return { held: false, stopped: true };
            }
            return { held: false };
        };

        const execution = await executeFrom();
        if (!execution.held) {
            await runProbe();
            await finalizeRun();
        }
        return (await snapshot(workspaceId)).runs.find((row) => row.id === id);
    } catch (error) {
        await mutate(workspaceId, (s) => {
            const run = s.runs.find((row) => row.id === id);
            if (run) Object.assign(run, { status: "Failed", error: error.message });
        });
        throw error;
    } finally {
        if (!waitingForArmorIQ) running.delete(workspaceId);
    }
}
