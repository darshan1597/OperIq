import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { findPublishedWorkspaceRecordBySlug, mutate, snapshot } from "../services/store.service.js";
import { createAuthority, governedCall } from "../services/governance.service.js";
import { findBookingAlternatives, validateBooking } from "../services/tool.service.js";

const challenges = new Map();
const sessions = new Map();
const minutes = (value) => Number.parseInt(String(value), 10) || 60;

function verifiedSession(token) {
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now())
    throw Object.assign(Error("Verify your email to manage appointments"), { status: 401 });
  return session;
}

export async function getVerifiedCustomerContext(token, workspaceId) {
  if (!token) return null;
  const session = verifiedSession(token);
  if (String(session.workspaceId) !== String(workspaceId))
    throw Object.assign(Error("This verification belongs to another business"), { status: 403 });
  let state = await snapshot(session.workspaceId);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const stale = (state.approvals || []).filter((item) => item.customerId === session.customerId && item.status === "Awaiting customer" && (item.date < today || (item.date === today && item.time <= currentTime)));
  if (stale.length) {
    await mutate(session.workspaceId, (next) => {
      for (const old of stale) {
        const approval = next.approvals.find((item) => item.id === old.id);
        const booking = next.appointments.find((item) => item.id === old.bookingId);
        const alternatives = booking ? findBookingAlternatives(next, booking) : [];
        if (!approval || !alternatives.length) continue;
        Object.assign(approval, alternatives[0]);
        approval.alternativeOptions = alternatives;
        approval.result = `OperIQ replaced an expired proposal with ${approval.date} at ${approval.time}; waiting for customer confirmation.`;
      }
    });
    state = await snapshot(session.workspaceId);
  }
  const customer = state.customers.find((item) => item.id === session.customerId);
  if (!customer) throw Object.assign(Error("Verified customer not found"), { status: 404 });
  return {
    session,
    customer: { id: customer.id, name: customer.name, email: customer.email },
    bookings: state.appointments
      .filter((item) => item.customerId === customer.id)
      .map(({ id, staffId, date, time, service, duration, status }) => ({ id, staffId, date, time, service, duration, status })),
    requests: customerRequestUpdates(state, customer.id),
  };
}

export function customerRequestUpdates(state, customerId) {
  const customerApprovals = (state.approvals || [])
    .filter((item) => item.customerId === customerId && ["Booking reschedule", "Booking cancellation", "Schedule conflict resolution"].includes(item.type))
    .filter((item) => item.status !== "Superseded" && item.executionStatus !== "Superseded")
    .filter((item, _index, all) => {
      if (item.status !== "Awaiting customer") return true;
      const booking = (state.appointments || []).find((row) => row.id === item.bookingId);
      const alreadyApplied = booking && booking.date === item.date && booking.time === item.time && booking.status === "Confirmed";
      const completedEquivalent = all.some((other) =>
        other.id !== item.id && other.bookingId === item.bookingId && other.date === item.date && other.time === item.time && other.executionStatus === "Completed",
      );
      return !alreadyApplied && !completedEquivalent;
    });
  const approvals = customerApprovals
    .map((item) => ({
      id: item.id,
      type: item.type,
      status: item.executionStatus === "Completed" ? "Completed" : item.status,
      decision: item.status,
      executionStatus: item.executionStatus,
      bookingId: item.bookingId,
      date: item.date,
      time: item.time,
      alternativeOptions: item.alternativeOptions,
      createdAt: item.decidedAt || item.executedAt || item.createdAt,
    }));
  const requests = (state.customerRequests || [])
    .filter((item) => item.customerId === customerId)
    .map((item) => ({ id: item.id, type: item.category || "Customer request", status: item.status, createdAt: item.createdAt }));
  return [...approvals, ...requests].sort((a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0));
}

export function formatCustomerStatus({ bookings = [], requests = [] }) {
  const bookingLines = bookings.length
    ? bookings.map((item) => `- **${item.service}** on **${item.date} at ${item.time}** — ${item.status}`).join("\n")
    : "- No appointments are currently associated with this verified account.";
  const requestLines = requests.length
    ? requests.slice(0, 5).map((item) => {
        const schedule = item.date && item.time ? ` for ${item.date} at ${item.time}` : "";
        const prompt = item.status === "Awaiting customer" ? " — reply **accept** to confirm this proposal, or ask for another time" : "";
        return `- **${item.type}**${schedule} — ${item.status}${prompt}`;
      }).join("\n")
    : "- No recent requests are waiting for a decision.";
  return `Here is the latest status for your verified account:\n\n**Appointments**\n${bookingLines}\n\n**Requests and updates**\n${requestLines}`;
}

export async function getCustomerStatus(req, res) {
  const token = z.string().uuid().parse(req.query.verificationToken);
  const context = await getVerifiedCustomerContext(token, (await findPublishedWorkspaceRecordBySlug(req.params.slug))?.workspaceId);
  return res.json({ bookings: context.bookings, requests: context.requests, answer: formatCustomerStatus(context) });
}

export async function createCustomerChallenge({ slug, name, email, phone }) {
  const input = z.object({
    email: z.string().trim().toLowerCase().email(),
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(7).max(30),
  }).parse({ name, email, phone });
  const record = await findPublishedWorkspaceRecordBySlug(slug);
  if (!record) throw Object.assign(Error("Business assistant not found"), { status: 404 });
  const code = String(randomInt(100000, 999999));
  const challengeId = randomUUID();
  challenges.set(challengeId, { ...input, code, workspaceId: record.workspaceId, expiresAt: Date.now() + 10 * 60_000 });
  return { challengeId, message: "Verification code created", ...(process.env.NODE_ENV === "production" ? {} : { developmentCode: code }) };
}

export async function confirmCustomerChallenge({ challengeId, code }) {
  const input = z.object({ challengeId: z.string().uuid(), code: z.string().length(6) }).parse({ challengeId, code });
  const challenge = challenges.get(input.challengeId);
  if (!challenge || challenge.expiresAt < Date.now() || challenge.code !== input.code)
    throw Object.assign(Error("The verification code is invalid or expired"), { status: 401 });
  let customer;
  await mutate(challenge.workspaceId, (state) => {
    customer = state.customers.find((item) => item.email.toLowerCase() === challenge.email);
    if (!customer) {
      customer = { id: randomUUID(), name: challenge.name, email: challenge.email, phone: challenge.phone, service: "", visits: 0, status: "Active", initials: challenge.name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase(), color: "mint" };
      state.customers.push(customer);
    } else customer.phone = challenge.phone;
  });
  const token = randomUUID();
  sessions.set(token, { workspaceId: challenge.workspaceId, customerId: customer.id, email: customer.email, expiresAt: Date.now() + 30 * 60_000 });
  challenges.delete(input.challengeId);
  return { verificationToken: token, customer: { name: customer.name, email: customer.email } };
}

export async function requestCustomerCode(req, res) {
  return res.json(await createCustomerChallenge({ slug: req.params.slug, ...req.body }));
}

export async function verifyCustomerCode(req, res) {
  return res.json(await confirmCustomerChallenge(req.body));
}

export async function getAvailability(req, res) {
  const input = z.object({ serviceId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.query);
  const record = await findPublishedWorkspaceRecordBySlug(req.params.slug);
  if (!record) throw Object.assign(Error("Business assistant not found"), { status: 404 });
  const service = record.data.aiProfile.services.find((item) => item.id === input.serviceId);
  if (!service) throw Object.assign(Error("Service not found"), { status: 404 });
  const duration = minutes(service.duration);
  const qualified = record.data.staff.filter((item) => item.status === "Available");
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
  const permission = state.aiProfile.permissions?.createBooking || "disabled";
  if (permission === "disabled")
    throw Object.assign(Error("Online booking is disabled for this business"), { status: 403 });
  if (permission === "approval")
    throw Object.assign(Error("New bookings require owner approval and cannot be confirmed from the customer portal yet"), { status: 403 });
  const step = { agent: "operations", action: "create_booking", params: { customerId: session.customerId, staffId: input.staffId, date: input.date, time: input.time, service: service.name, duration: minutes(service.duration) }, explanation: "Customer verified and selected an available appointment." };
  const goal = `Book ${service.name} for verified customer ${session.customerId} on ${input.date} at ${input.time}`;
  const identity = { workspaceId: session.workspaceId, userEmail: session.email };
  const authority = await createAuthority(goal, [step], identity);
  const outcome = await governedCall(authority, step, identity);
  const { continuation, data: _toolResult, ...storedOutcome } = outcome;
  const eventId = randomUUID();
  await mutate(session.workspaceId, (next) => next.events.unshift({ id: eventId, runId: null, agent: "operations", action: step.action, params: step.params, explanation: step.explanation, ...storedOutcome, createdAt: new Date().toISOString() }));
  if (continuation) continuation.then((resumedOutcome) => mutate(session.workspaceId, (next) => {
    const event = next.events.find((item) => item.id === eventId);
    if (event) Object.assign(event, resumedOutcome, { resumedAt: new Date().toISOString() });
  })).catch((error) => mutate(session.workspaceId, (next) => {
    const event = next.events.find((item) => item.id === eventId);
    if (event) Object.assign(event, { status: "Failed", reason: error.message, executed: false });
  }));
  if (outcome.status === "Held") return res.status(202).json({ status: "Held", message: outcome.reason, delegationId: outcome.delegationId });
  if (outcome.status !== "Completed") throw Object.assign(Error(outcome.reason || `Booking ${outcome.status.toLowerCase()}`), { status: 403 });
  return res.status(201).json({ booking: outcome.data, status: outcome.status });
}

export async function getCustomerBookings(req, res) {
  const token = z.string().uuid().parse(req.query.verificationToken);
  const session = verifiedSession(token);
  const state = await snapshot(session.workspaceId);
  return res.json({
    bookings: state.appointments
      .filter((item) => item.customerId === session.customerId)
      .map(({ id, date, time, service, duration, status, staffId }) => ({ id, date, time, service, duration, status, staffId })),
  });
}

export async function getRescheduleAvailability(req, res) {
  const input = z.object({
    verificationToken: z.string().uuid(),
    bookingId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).parse(req.query);
  const session = verifiedSession(input.verificationToken);
  const state = await snapshot(session.workspaceId);
  const booking = state.appointments.find((item) => item.id === input.bookingId && item.customerId === session.customerId);
  if (!booking) throw Object.assign(Error("Appointment not found"), { status: 404 });
  if (["Cancelled", "Declined"].includes(booking.status))
    throw Object.assign(Error("This appointment cannot be rescheduled"), { status: 422 });
  const slots = [];
  for (let hour = 9; hour <= 17; hour += 1) {
    const time = `${String(hour).padStart(2, "0")}:00`;
    try {
      validateBooking(
        { ...state, appointments: state.appointments.filter((item) => item.id !== booking.id) },
        { ...booking, date: input.date, time },
      );
      slots.push({ date: input.date, time });
    } catch { /* Invalid alternatives are intentionally omitted. */ }
  }
  return res.json({ booking: { id: booking.id, service: booking.service, date: booking.date, time: booking.time }, slots });
}

export async function requestPublicReschedule(req, res) {
  const input = z.object({
    verificationToken: z.string().uuid(),
    bookingId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^(0\d|1\d|2[0-3]):[0-5]\d$/),
  }).parse(req.body);
  const session = verifiedSession(input.verificationToken);
  const state = await snapshot(session.workspaceId);
  const booking = state.appointments.find((item) => item.id === input.bookingId && item.customerId === session.customerId);
  if (!booking) throw Object.assign(Error("Appointment not found"), { status: 404 });
  const runId = randomUUID();
  const now = new Date().toISOString();
  const permission = state.aiProfile.permissions?.rescheduleBooking || "disabled";
  await mutate(session.workspaceId, (next) => {
    next.runs.unshift({ id: runId, goal: "Verified customer requested an appointment reschedule", workflow: "reschedule", status: "Running", createdAt: now });
    next.events.unshift(
      { id: randomUUID(), runId, step: 1, totalSteps: 4, agent: "customer", action: "verify_customer_identity", status: "Completed", source: "OperIQ customer verification", reason: "The verified customer owns this appointment.", executed: true, createdAt: now },
    );
  });
  if (permission === "disabled") {
    await mutate(session.workspaceId, (next) => {
      next.events.unshift({ id: randomUUID(), runId, step: 2, totalSteps: 4, agent: "resolution", action: "check_reschedule_policy", status: "Blocked", source: "Business policy", reason: "Online rescheduling is disabled.", executed: false, createdAt: new Date().toISOString() });
      next.runs.find((item) => item.id === runId).status = "Blocked";
    });
    throw Object.assign(Error("Online rescheduling is disabled for this business"), { status: 403 });
  }
  await mutate(session.workspaceId, (next) => next.events.unshift({ id: randomUUID(), runId, step: 2, totalSteps: 4, agent: "resolution", action: "check_reschedule_policy", status: "Completed", source: "Business policy", reason: "Verified customers may submit a reschedule proposal for owner approval.", executed: true, createdAt: new Date().toISOString() }));
  try {
    validateBooking(
      { ...state, appointments: state.appointments.filter((item) => item.id !== booking.id) },
      { ...booking, date: input.date, time: input.time },
    );
  } catch (error) {
    await mutate(session.workspaceId, (next) => {
      next.events.unshift({ id: randomUUID(), runId, step: 3, totalSteps: 4, agent: "operations", action: "check_reschedule_availability", status: "Failed", source: "OperIQ scheduling rules", reason: error.message, executed: false, createdAt: new Date().toISOString() });
      next.runs.find((item) => item.id === runId).status = "Needs attention";
    });
    throw Object.assign(Error(error.message), { status: 422 });
  }
  await mutate(session.workspaceId, (next) => next.events.unshift({ id: randomUUID(), runId, step: 3, totalSteps: 4, agent: "operations", action: "check_reschedule_availability", status: "Completed", source: "OperIQ scheduling rules", reason: `${input.date} at ${input.time} is available for the assigned staff member.`, executed: true, createdAt: new Date().toISOString() }));

  const step = { agent: "operations", action: "prepare_booking_reschedule", params: { bookingId: booking.id, date: input.date, time: input.time, reason: "Verified customer requested this change" }, explanation: "Prepare a validated reschedule proposal for the workspace owner." };
  const identity = { workspaceId: session.workspaceId, userEmail: session.email };
  let outcome;
  try {
    const authority = await createAuthority(`Reschedule appointment ${booking.id} to ${input.date} at ${input.time}`, [step], identity);
    outcome = await governedCall(authority, step, identity);
  } catch (error) {
    outcome = { status: "Failed", source: "ArmorIQ integration", reason: error.message, executed: false };
  }
  const { continuation, data: _toolResult, ...storedOutcome } = outcome;
  const eventId = randomUUID();
  await mutate(session.workspaceId, (next) => {
    next.events.unshift({ id: eventId, runId, step: 4, totalSteps: 4, agent: "operations", action: step.action, params: step.params, explanation: step.explanation, ...storedOutcome, createdAt: new Date().toISOString() });
    next.runs.find((item) => item.id === runId).status = outcome.status === "Completed" ? "Waiting for owner approval" : outcome.status;
    if (outcome.status === "Completed") {
      const proposal = next.approvals.find((item) => item.type === "Booking reschedule" && item.bookingId === booking.id && item.status === "Pending" && !item.runId);
      if (proposal) proposal.runId = runId;
    }
  });
  if (continuation) continuation.then((resumed) => mutate(session.workspaceId, (next) => {
    const event = next.events.find((item) => item.id === eventId);
    if (event) Object.assign(event, resumed, { resumedAt: new Date().toISOString() });
    const run = next.runs.find((item) => item.id === runId);
    if (run) run.status = resumed.status === "Completed" ? "Waiting for owner approval" : resumed.status;
  })).catch((error) => mutate(session.workspaceId, (next) => {
    const event = next.events.find((item) => item.id === eventId);
    if (event) Object.assign(event, { status: "Failed", reason: error.message, executed: false });
    const run = next.runs.find((item) => item.id === runId);
    if (run) run.status = "Needs attention";
  }));
  if (outcome.status !== "Completed" && outcome.status !== "Held")
    throw Object.assign(Error(outcome.reason || "The reschedule proposal could not be prepared"), { status: 403 });
  return res.status(outcome.status === "Held" ? 202 : 201).json({
    status: outcome.status,
    runId,
    message: outcome.status === "Held" ? "ArmorIQ is reviewing the proposal." : "Your reschedule request was sent to the business owner for approval.",
  });
}
