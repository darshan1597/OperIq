import { z } from "zod";
import { createAuthority, governedCall, integrationStatus } from "../services/governance.service.js";
import { runWorkflow } from "../services/agent.service.js";
import { findUserById, listWorkspaceMembers, mutate, snapshot, storageMode, updateUserProfile } from "../services/store.service.js";
import { findBookingAlternatives, validateBooking } from "../services/tool.service.js";
import { publicUser } from "../utils/public-user.js";
import { randomUUID } from "node:crypto";
import { answerWorkspaceQuestion } from "../services/workspace-question.service.js";
import { reportProgress } from "../services/request-progress.service.js";

export async function getWorkspace(req, res) {
  reportProgress("Loading workspace, team, appointments, and governance records");
  let [data, user, members] = await Promise.all([snapshot(req.user.id), findUserById(req.user.accountId), listWorkspaceMembers(req.user.id)]);
  const obsoleteCustomerProposals = (data.approvals || []).filter((item) => {
    if (item.status !== "Awaiting customer") return false;
    const booking = data.appointments.find((row) => row.id === item.bookingId);
    return booking?.status === "Confirmed" && booking.date === item.date && booking.time === item.time;
  });
  if (obsoleteCustomerProposals.length) {
    await mutate(req.user.id, (state) => {
      for (const obsolete of obsoleteCustomerProposals) {
        const item = state.approvals.find((row) => row.id === obsolete.id);
        if (item) {
          item.status = "Superseded";
          item.executionStatus = "Superseded";
          item.result = "A completed reschedule already applied this appointment time.";
        }
      }
    });
    data = await snapshot(req.user.id);
  }
  const staleConflicts = (data.approvals || []).filter((item) =>
    item.type === "Booking reschedule" && item.status === "Approved" && item.executionStatus === "Failed" && /conflict|available staff|unavailable/i.test(item.result || ""),
  );
  if (staleConflicts.length) {
    await mutate(req.user.id, (state) => {
      for (const approval of staleConflicts) {
        const item = state.approvals.find((row) => row.id === approval.id);
        const booking = state.appointments.find((row) => row.id === approval.bookingId);
        const alternatives = booking ? findBookingAlternatives(state, booking) : [];
        if (!item || !alternatives.length) continue;
        item.failedDate = item.date;
        item.failedTime = item.time;
        Object.assign(item, alternatives[0]);
        item.alternativeOptions = alternatives;
        item.status = "Awaiting customer";
        item.executionStatus = "Awaiting customer";
        item.result = `The approved time became unavailable. OperIQ found ${item.date} at ${item.time} and is waiting for customer confirmation.`;
        const run = item.runId && state.runs.find((row) => row.id === item.runId);
        if (run) run.status = "Waiting for customer confirmation";
      }
    });
    data = await snapshot(req.user.id);
  }
  const roleByEmail = new Map(members.map((member) => [member.email?.toLowerCase(), member.role || "owner"]));
  const enriched = {
    ...data,
    staff: (data.staff || []).map((person) => ({
      ...person,
      role: roleByEmail.get(person.email?.toLowerCase()) || "staff",
    })),
    approvals: (data.approvals || []).map((approval) => ({
      ...approval,
      armorDecision: approval.executionStatus === "Completed" ? "Completed" : approval.armorDecision,
    })),
  };
  let visible = req.user.role === "owner" ? enriched : { ...enriched, invitations: [] };
  if (req.user.role === "receptionist") visible = {
    ...visible,
    approvals: [], runs: [], events: [],
    aiProfile: { status: data.aiProfile?.status || "draft" },
  };
  if (req.user.role === "staff") {
    const member = enriched.staff.find((item) => item.email?.toLowerCase() === req.user.email.toLowerCase());
    const appointments = member ? enriched.appointments.filter((item) => item.staffId === member.id) : [];
    const customerIds = new Set(appointments.map((item) => item.customerId));
    visible = {
      ...visible,
      customers: enriched.customers.filter((item) => customerIds.has(item.id)),
      staff: member ? [member] : [],
      appointments,
      tasks: member ? enriched.tasks.filter((item) => item.assignedTo === member.id) : [],
      complaints: [], approvals: [], runs: [], events: [], messages: [],
      aiProfile: { status: data.aiProfile?.status || "draft" },
    };
  }
  return res.json({ ...visible, user: publicUser(user), integration: { ...integrationStatus(), storage: storageMode() } });
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
  const input = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().toLowerCase().email() }).parse(req.body);
  return res.status(201).json(await mutate(req.user.id, (state) => {
    const row = { id: randomUUID(), ...input, skills: [], status: "Available", initials: input.name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase(), color: "lavender" };
    state.staff.push(row); return row;
  }));
}

export async function createRun(req, res) {
  const input = z.object({
    goal: z.string().min(5).max(2000),
    workflow: z.enum(["auto", "enquiry", "absence", "complaint", "access", "conflict"]).default("auto"),
    securityProbe: z.boolean().default(false),
  }).parse(req.body);
  if (input.workflow === "access" && req.user.role !== "owner")
    throw Object.assign(Error("Only the workspace owner can onboard team members"), { status: 403 });
  return res.json(await runWorkflow({ ...input, workspaceId: req.user.id, userEmail: req.user.email }));
}

export async function askWorkspace(req, res) {
  const { question } = z.object({ question: z.string().trim().min(3).max(2000) }).parse(req.body);
  reportProgress("Coordinator agent is reviewing the workspace question");
  return res.json(await answerWorkspaceQuestion(question, req.user.id));
}

export async function updateTask(req, res) {
  const status = z.enum(["To do", "In progress", "Done"]).parse(req.body.status);
  return res.json(await mutate(req.user.id, (state) => {
    const item = state.tasks.find((row) => row.id === req.params.id);
    if (!item) throw Error("Task not found");
    if (req.user.role === "staff") {
      const member = state.staff.find((row) => row.email?.toLowerCase() === req.user.email.toLowerCase());
      if (!member || item.assignedTo !== member.id)
        throw Object.assign(Error("You can update only tasks assigned to you"), { status: 403 });
    }
    item.status = status;
    return item;
  }));
}

export async function updateStaff(req, res) {
  const input = z.object({
    status: z.enum(["Available", "Unavailable"]).optional(),
  }).refine((value) => value.status, "Provide a status update").parse(req.body);
  return res.json(await mutate(req.user.id, (state) => {
    const item = state.staff.find((row) => row.id === req.params.id);
    if (!item) throw Error("Staff member not found");
    if (req.user.role === "staff") {
      if (item.email?.toLowerCase() !== req.user.email.toLowerCase())
        throw Object.assign(Error("You can update only your own availability"), { status: 403 });
    }
    if (input.status) item.status = input.status;
    return item;
  }));
}

export async function decideApproval(req, res) {
  const decision = z.enum(["Approved", "Rejected"]).parse(req.body.decision);
  const executionByType = {
    "Team invitation": {
      agent: "access",
      action: "execute_approved_member_invites",
      explanation: "Execute a workspace-owner-approved invitation proposal.",
      approvedResult: "Owner approved; awaiting ArmorIQ-governed execution",
      rejectedResult: "Invitation proposal rejected by owner",
    },
    "Booking cancellation": {
      agent: "operations",
      action: "execute_approved_booking_cancellation",
      explanation: "Execute a workspace-owner-approved booking cancellation.",
      approvedResult: "Owner approved; awaiting ArmorIQ-governed cancellation",
      rejectedResult: "Booking cancellation rejected by owner",
    },
    "Booking reschedule": {
      agent: "operations",
      action: "execute_approved_booking_reschedule",
      explanation: "Execute a workspace-owner-approved booking reschedule.",
      approvedResult: "Owner approved; awaiting ArmorIQ-governed rescheduling",
      rejectedResult: "Booking reschedule rejected by owner",
    },
    "Schedule conflict resolution": {
      agent: "operations",
      action: "execute_approved_schedule_resolution",
      explanation: "Execute an owner-approved schedule conflict resolution.",
      approvedResult: "Owner approved; awaiting ArmorIQ-governed schedule resolution",
      rejectedResult: "Schedule conflict resolution rejected by owner",
    },
  };
  const approval = await mutate(req.user.id, (state) => {
    const item = state.approvals.find((row) => row.id === req.params.id);
    const execution = executionByType[item?.type];
    const retryingExecution = execution &&
      decision === "Approved" && item.status === "Approved" && item.executionStatus !== "Completed";
    if (!item || (item.status !== "Pending" && !retryingExecution)) throw Error("Approval is not pending");
    if (execution && req.user.role !== "owner")
      throw Object.assign(Error("Only the workspace owner can decide business-changing proposals"), { status: 403 });
    item.status = decision;
    item.decidedAt ||= new Date().toISOString();
    item.decidedBy ||= req.user.accountId;
    item.decidedByRole ||= req.user.role;
    if (decision === "Approved") {
      item.approvedBy ||= req.user.accountId;
      item.approvedByRole ||= req.user.role;
      item.result = execution?.approvedResult || "Compensation approved; no payment executed";
    } else {
      item.result = execution?.rejectedResult || "Compensation declined";
      const run = item.runId && state.runs.find((row) => row.id === item.runId);
      if (run) run.status = "Rejected";
    }
    return structuredClone(item);
  });

  const execution = executionByType[approval.type];
  if (!execution || decision === "Rejected") return res.json(approval);

  const step = {
    agent: execution.agent,
    action: execution.action,
    params: { approvalId: approval.id },
    explanation: execution.explanation,
  };
  const identity = { workspaceId: req.user.id, userEmail: req.user.email };
  let outcome;
  try {
    const authority = await createAuthority(
      `Execute approved ${approval.type.toLowerCase()} proposal ${approval.id}`,
      [step],
      identity,
    );
    outcome = await governedCall(authority, step, identity);
  } catch (error) {
    outcome = {
      status: "Failed",
      source: "ArmorIQ execution",
      reason: error.message,
      executed: false,
    };
  }
  // Do not embed MCP response payloads in workspace event history. A
  // read_workspace result contains the workspace itself and would recursively
  // enlarge every later snapshot.
  const { continuation, data: _toolResult, ...storedOutcome } = outcome;
  let recoveredAlternative = null;
  if (approval.type === "Booking reschedule" && storedOutcome.status === "Failed" && /conflict|available staff|unavailable/i.test(storedOutcome.reason || "")) {
    const latest = await snapshot(req.user.id);
    const booking = latest.appointments.find((item) => item.id === approval.bookingId);
    const alternatives = booking ? findBookingAlternatives(latest, booking) : [];
    if (alternatives.length) recoveredAlternative = { selected: alternatives[0], options: alternatives };
  }
  const governanceEventId = randomUUID();
  await mutate(req.user.id, (state) => {
    const item = state.approvals.find((row) => row.id === approval.id);
    if (!item) return;
    if (recoveredAlternative) {
      item.failedDate = item.date;
      item.failedTime = item.time;
      item.date = recoveredAlternative.selected.date;
      item.time = recoveredAlternative.selected.time;
      item.staffId = recoveredAlternative.selected.staffId;
      item.alternativeOptions = recoveredAlternative.options;
      item.status = "Awaiting customer";
      item.executionStatus = "Awaiting customer";
      item.armorDecision = storedOutcome.status;
      item.armorSource = storedOutcome.source;
      item.result = `The approved time became unavailable. OperIQ found ${item.date} at ${item.time} and is waiting for customer confirmation.`;
      const run = item.runId && state.runs.find((row) => row.id === item.runId);
      if (run) run.status = "Waiting for customer confirmation";
      state.events.unshift({ id: governanceEventId, runId: item.runId || null, agent: execution.agent, action: step.action, params: step.params, explanation: step.explanation, ...storedOutcome, createdAt: new Date().toISOString() });
      return;
    }
    item.armorDecision = storedOutcome.status;
    item.armorSource = storedOutcome.source;
    if (storedOutcome.status !== "Completed") {
      item.executionStatus = storedOutcome.status;
      item.result = storedOutcome.reason || "ArmorIQ did not authorize execution";
    }
    const run = item.runId && state.runs.find((row) => row.id === item.runId);
    if (run) run.status = storedOutcome.status === "Completed" ? "Completed" : storedOutcome.status === "Held" ? "Waiting for ArmorIQ" : storedOutcome.status;
    state.events.unshift({
      id: governanceEventId,
      runId: item.runId || null,
      agent: execution.agent,
      action: step.action,
      params: step.params,
      explanation: step.explanation,
      ...storedOutcome,
      createdAt: new Date().toISOString(),
    });
  });
  if (recoveredAlternative)
    return res.json((await snapshot(req.user.id)).approvals.find((item) => item.id === approval.id));
  if (continuation) continuation.then(async (resumedOutcome) => {
    await mutate(req.user.id, (state) => {
      const item = state.approvals.find((row) => row.id === approval.id);
      const event = state.events.find((row) => row.id === governanceEventId);
      if (event) Object.assign(event, resumedOutcome, { resumedAt: new Date().toISOString() });
      if (!item) return;
      item.armorDecision = resumedOutcome.status;
      item.armorSource = resumedOutcome.source;
      item.executionStatus = resumedOutcome.status === "Completed" ? "Completed" : resumedOutcome.status;
      item.result = resumedOutcome.status === "Completed"
        ? `${approval.type} completed after ArmorIQ approval`
        : resumedOutcome.reason || "ArmorIQ did not authorize execution";
      const run = item.runId && state.runs.find((row) => row.id === item.runId);
      if (run) run.status = resumedOutcome.status;
    });
  }).catch(async (error) => {
    await mutate(req.user.id, (state) => {
      const item = state.approvals.find((row) => row.id === approval.id);
      const event = state.events.find((row) => row.id === governanceEventId);
      if (event) Object.assign(event, { status: "Failed", reason: error.message, executed: false, resumedAt: new Date().toISOString() });
      if (item) {
        item.armorDecision = "Failed";
        item.executionStatus = "Failed";
        item.result = error.message;
        const run = item.runId && state.runs.find((row) => row.id === item.runId);
        if (run) run.status = "Failed";
      }
    });
  });
  return res.json((await snapshot(req.user.id)).approvals.find((item) => item.id === approval.id));
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
  return res.attachment("operiq-execution-records.json").json({
    exportedAt: new Date().toISOString(),
    integration: integrationStatus(),
    runs: data.runs,
    events: data.events,
  });
}
