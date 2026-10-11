import { z } from "zod";
import { integrationStatus } from "../services/governance.service.js";
import { runWorkflow } from "../services/agent.service.js";
import { findUserById, mutate, snapshot, storageMode, updateUserProfile } from "../services/store.service.js";
import { validateBooking } from "../services/tool.service.js";
import { publicUser } from "../utils/public-user.js";
import { randomUUID } from "node:crypto";

export async function getWorkspace(req, res) {
  const [data, user] = await Promise.all([snapshot(req.user.id), findUserById(req.user.id)]);
  return res.json({ ...data, user: publicUser(user), integration: { ...integrationStatus(), storage: storageMode() } });
}

export async function updateProfile(req, res) {
  const input = z.object({
    name: z.string().trim().min(2).max(80),
    businessName: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email().max(200),
  }).parse(req.body);
  const user = await updateUserProfile(req.user.id, input);
  await mutate(req.user.id, (state) => {
    state.business.name = input.businessName;
    state.business.owner = input.name;
  });
  return res.json({ user: publicUser(user) });
}

export async function createCustomer(req, res) {
  const input = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), service: z.string().trim().max(100).default("") }).parse(req.body);
  return res.status(201).json(await mutate(req.user.id, (state) => {
    if (state.customers.some((item) => item.email.toLowerCase() === input.email)) throw Object.assign(Error("A customer with this email already exists"), { status: 409 });
    const row = { id: randomUUID(), ...input, visits: 0, status: "Active", initials: input.name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase(), color: "mint" };
    state.customers.push(row); return row;
  }));
}

export async function createStaff(req, res) {
  const input = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email(), skills: z.array(z.string().trim().min(2)).min(1).max(30) }).parse(req.body);
  return res.status(201).json(await mutate(req.user.id, (state) => {
    const row = { id: randomUUID(), ...input, status: "Available", initials: input.name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase(), color: "lavender" };
    state.staff.push(row); return row;
  }));
}

export async function createRun(req, res) {
  const input = z.object({
    goal: z.string().min(5).max(2000),
    workflow: z.enum(["enquiry", "absence", "complaint"]).default("enquiry"),
    securityProbe: z.boolean().default(false),
  }).parse(req.body);
  return res.json(await runWorkflow({ ...input, workspaceId: req.user.id, userEmail: req.user.email }));
}

export async function updateTask(req, res) {
  const status = z.enum(["To do", "In progress", "Done"]).parse(req.body.status);
  return res.json(await mutate(req.user.id, (state) => {
    const item = state.tasks.find((row) => row.id === req.params.id);
    if (!item) throw Error("Task not found");
    item.status = status;
    return item;
  }));
}

export async function updateStaff(req, res) {
  const status = z.enum(["Available", "Unavailable"]).parse(req.body.status);
  return res.json(await mutate(req.user.id, (state) => {
    const item = state.staff.find((row) => row.id === req.params.id);
    if (!item) throw Error("Staff member not found");
    item.status = status;
    return item;
  }));
}

export async function decideApproval(req, res) {
  const decision = z.enum(["Approved", "Rejected"]).parse(req.body.decision);
  return res.json(await mutate(req.user.id, (state) => {
    const item = state.approvals.find((row) => row.id === req.params.id);
    if (!item || item.status !== "Pending") throw Error("Approval is not pending");
    item.status = decision;
    item.decidedAt = new Date().toISOString();
    item.result = decision === "Approved" ? "Sandbox compensation approved; no payment executed" : "Compensation declined";
    return item;
  }));
}

export async function respondToAppointment(req, res) {
  const accept = z.boolean().parse(req.body.accept);
  return res.json(await mutate(req.user.id, (state) => {
    const booking = state.appointments.find((row) => row.id === req.params.id);
    if (!booking || booking.status !== "Awaiting customer") throw Error("Booking is not awaiting acceptance");
    if (accept) validateBooking({ ...state, appointments: state.appointments.filter((row) => row.id !== booking.id) }, booking);
    booking.status = accept ? "Confirmed" : "Declined";
    return booking;
  }));
}

export async function reviewMessage(req, res) {
  return res.json(await mutate(req.user.id, (state) => {
    const item = state.messages.find((row) => row.id === req.params.id);
    if (!item) throw Error("Message not found");
    item.status = "Reviewed";
    return item;
  }));
}

export async function exportRecords(req, res) {
  const data = await snapshot(req.user.id);
  return res.attachment("opsdesk-execution-records.json").json({
    exportedAt: new Date().toISOString(),
    integration: integrationStatus(),
    runs: data.runs,
    events: data.events,
  });
}
