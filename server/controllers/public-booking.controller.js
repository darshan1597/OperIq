import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { findPublishedWorkspaceRecordBySlug, mutate, snapshot } from "../services/store.service.js";
import { createAuthority, governedCall } from "../services/governance.service.js";

const challenges = new Map();
const sessions = new Map();
const minutes = (value) => Number.parseInt(String(value), 10) || 60;

export async function requestCustomerCode(req, res) {
  const input = z.object({ email: z.string().trim().toLowerCase().email(), name: z.string().trim().min(2).max(80) }).parse(req.body);
  const record = await findPublishedWorkspaceRecordBySlug(req.params.slug);
  if (!record) throw Object.assign(Error("Business assistant not found"), { status: 404 });
  const code = String(randomInt(100000, 999999));
  const challengeId = randomUUID();
  challenges.set(challengeId, { ...input, code, workspaceId: record.workspaceId, expiresAt: Date.now() + 10 * 60_000 });
  return res.json({ challengeId, message: "Verification code created", ...(process.env.NODE_ENV === "production" ? {} : { developmentCode: code }) });
}

export async function verifyCustomerCode(req, res) {
  const input = z.object({ challengeId: z.string().uuid(), code: z.string().length(6) }).parse(req.body);
  const challenge = challenges.get(input.challengeId);
  if (!challenge || challenge.expiresAt < Date.now() || challenge.code !== input.code)
    throw Object.assign(Error("The verification code is invalid or expired"), { status: 401 });
  let customer;
  await mutate(challenge.workspaceId, (state) => {
    customer = state.customers.find((item) => item.email.toLowerCase() === challenge.email);
    if (!customer) {
      customer = { id: randomUUID(), name: challenge.name, email: challenge.email, service: "", visits: 0, status: "Active", initials: challenge.name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase(), color: "mint" };
      state.customers.push(customer);
    }
  });
  const token = randomUUID();
  sessions.set(token, { workspaceId: challenge.workspaceId, customerId: customer.id, email: customer.email, expiresAt: Date.now() + 30 * 60_000 });
  challenges.delete(input.challengeId);
  return res.json({ verificationToken: token, customer: { name: customer.name, email: customer.email } });
}

export async function getAvailability(req, res) {
  const input = z.object({ serviceId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
  const record = await findPublishedWorkspaceRecordBySlug(req.params.slug);
  if (!record) throw Object.assign(Error("Business assistant not found"), { status: 404 });
  const service = record.data.aiProfile.services.find((item) => item.id === input.serviceId);
  if (!service) throw Object.assign(Error("Service not found"), { status: 404 });
  const duration = minutes(service.duration);
  const qualified = record.data.staff.filter((item) => item.status === "Available" && item.skills.includes(service.name));
  const slots = [];
  for (const person of qualified) for (let hour=9; hour<=17; hour++) {
    const time = `${String(hour).padStart(2,"0")}:00`;
    const busy = record.data.appointments.some((item) => item.staffId===person.id && item.date===input.date && !["Cancelled","Declined"].includes(item.status) && item.time===time);
    if (!busy) slots.push({ time, staffId: person.id, staffName: person.name, duration });
  }
  return res.json({ service, date: input.date, slots });
}

export async function createPublicBooking(req, res) {
  const input = z.object({ verificationToken: z.string().uuid(), serviceId: z.string(), staffId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string() }).parse(req.body);
  const session = sessions.get(input.verificationToken);
  if (!session || session.expiresAt < Date.now()) throw Object.assign(Error("Verify your email to book"), { status: 401 });
  const state = await snapshot(session.workspaceId);
  const service = state.aiProfile.services.find((item) => item.id === input.serviceId);
  if (!service) throw Object.assign(Error("Service not found"), { status: 404 });
  const step = { agent: "operations", action: "create_booking", params: { customerId: session.customerId, staffId: input.staffId, date: input.date, time: input.time, service: service.name, duration: minutes(service.duration) }, explanation: "Customer verified and selected an available appointment." };
  const goal = `Book ${service.name} for verified customer ${session.customerId} on ${input.date} at ${input.time}`;
  const identity = { workspaceId: session.workspaceId, userEmail: session.email };
  const authority = await createAuthority(goal, [step], identity);
  const outcome = await governedCall(authority, step, identity);
  await mutate(session.workspaceId, (next) => next.events.unshift({ id: randomUUID(), runId: null, agent: "operations", action: step.action, explanation: step.explanation, ...outcome, createdAt: new Date().toISOString() }));
  if (outcome.status !== "Completed") throw Object.assign(Error(outcome.reason || `Booking ${outcome.status.toLowerCase()}`), { status: outcome.status === "Held" ? 202 : 403 });
  return res.status(201).json({ booking: outcome.data, status: outcome.status });
}
