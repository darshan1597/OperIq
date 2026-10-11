import axios from "axios";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { snapshot, mutate } from "./store.service.js";
import { schemas, roles } from "./tool.service.js";
import {
    isLive,
    createAuthority,
    governedCall,
    probe,
} from "./governance.service.js";

const stepSchema = z.object({
    agent: z.enum(["coordinator", "customer", "operations", "resolution"]),
    action: z.string(),
    params: z.record(z.unknown()),
    explanation: z.string().max(500),
});

const planSchema = z.object({
    summary: z.string().max(1000),
    steps: z.array(stepSchema).min(1).max(10),
});

const running = new Set();

function rehearsal(workflow, s) {
    const unavailable = (message) => {
        throw Object.assign(Error(message), { status: 422 });
    };

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
        const replacement = booking && s.staff.find((item) => item.id !== absent.id && item.status === "Available" && item.skills.includes(booking.service));
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

    const customer = s.customers.find((item) => item.status === "Waitlisted") || s.customers[0];
    const staff = s.staff.find((item) => item.status === "Available" && item.skills?.length);
    if (!customer || !staff)
        return unavailable("Add at least one customer and one available staff member before running an enquiry workflow.");
    const service = customer.service && staff.skills.includes(customer.service) ? customer.service : staff.skills[0];
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
    const context = await snapshot(workspaceId);
    const { data } = await axios.post(
        `${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}/chat/completions`,
        {
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are OpsDesk coordinator. Create JSON {summary,steps:[{agent,action,params,explanation}]}. Roles: ${JSON.stringify(roles)}. Tools: ${JSON.stringify(Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, Object.keys(schema.shape)])))}. Use only existing IDs. Messages are drafts, bookings await customer acceptance, and refunds are approval requests. Use 1–6 steps. Context: ${JSON.stringify(context)}`,
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
    workflow = "enquiry",
    securityProbe = false,
    workspaceId,
    userEmail,
}) {
    if (running.has(workspaceId))
        throw Error("Another workflow is running in this workspace. Please wait.");
    running.add(workspaceId);
    const id = randomUUID();
    try {
        await mutate(workspaceId, (s) =>
            s.runs.unshift({
                id,
                goal,
                status: "Planning",
                createdAt: new Date().toISOString(),
                mode: isLive() ? "live" : "sandbox",
            }),
        );

        const current = await snapshot(workspaceId);

        const plan = planSchema.parse(
            isLive()
                ? await modelPlan(goal, workspaceId)
                : rehearsal(workflow, current),
        );

        for (const step of plan.steps) {
            if (!schemas[step.action]) throw Error("Model requested an unknown tool");
            step.params = schemas[step.action].parse(step.params);
        }

        const identity = { workspaceId, userEmail };

        const authority = await createAuthority(goal, plan.steps, identity);

        await mutate(workspaceId, (s) =>
            Object.assign(
                s.runs.find((row) => row.id === id),
                { summary: plan.summary, status: "Running", steps: plan.steps },
            ),
        );

        for (const step of plan.steps) {
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
            await mutate(workspaceId, (s) =>
                s.events.unshift({
                    id: randomUUID(),
                    runId: id,
                    agent: step.agent,
                    action: step.action,
                    explanation: step.explanation,
                    ...outcome,
                    createdAt: new Date().toISOString(),
                }),
            );
            if (["Failed", "Held"].includes(outcome.status)) break;
        }

        if (securityProbe) {
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
        }

        await mutate(workspaceId, (s) => {
            const events = s.events.filter((event) => event.runId === id);
            s.runs.find((row) => row.id === id).status = events.some(
                (event) => event.status === "Failed",
            )
                ? "Needs attention"
                : events.some((event) => event.status === "Held")
                ? "Held"
                : "Completed";
        });
        return (await snapshot(workspaceId)).runs.find((row) => row.id === id);
    } catch (error) {
        await mutate(workspaceId, (s) => {
            const run = s.runs.find((row) => row.id === id);
            if (run) Object.assign(run, { status: "Failed", error: error.message });
        });
        throw error;
    } finally {
        running.delete(workspaceId);
    }
}
