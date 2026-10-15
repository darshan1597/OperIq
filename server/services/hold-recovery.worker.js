import { randomUUID } from "node:crypto";
import {
  claimRecoverableHolds,
  releaseDurableHold,
  settleDurableHold,
} from "./durable-hold.service.js";
import { createAuthority, governedCall, isLive, resumeDurableHold } from "./governance.service.js";
import { mutate, snapshot } from "./store.service.js";

const intervalMs = Math.max(5_000, Number(process.env.HOLD_RECOVERY_INTERVAL_MS) || 15_000);
let recoveryRunning = false;

async function updateRecoveredEvent(job, outcome) {
  let runId = null;
  let completedStep = null;
  await mutate(job.workspaceId, (state) => {
    state.events ||= [];
    let event = state.events.find((item) => item.delegationId === job.delegationId || item.requestId === job.requestId);
    if (!event) {
      event = {
        id: randomUUID(),
        runId: null,
        agent: job.agent,
        action: job.action,
        params: job.params,
        explanation: "Recovered after a server restart",
        delegationId: job.delegationId,
        requestId: job.requestId,
        createdAt: new Date().toISOString(),
      };
      state.events.unshift(event);
    }
    Object.assign(event, outcome, { resumedAt: new Date().toISOString() });
    runId = event.runId || null;
    completedStep = event.step || null;
    const run = runId && state.runs?.find((item) => item.id === runId);
    if (run) run.status = outcome.status === "Completed" ? "Running" : "Needs attention";
  });
  return { runId, completedStep };
}

async function finalizeRun(workspaceId, runId) {
  if (!runId) return;
  await mutate(workspaceId, (state) => {
    const run = state.runs?.find((item) => item.id === runId);
    if (!run) return;
    const events = state.events.filter((item) => item.runId === runId);
    const waitingForOwner = state.approvals?.some((item) => item.runId === runId && item.status === "Pending");
    run.status = events.some((item) => ["Failed", "Blocked"].includes(item.status))
      ? "Needs attention"
      : events.some((item) => item.status === "Held")
        ? "Held"
        : waitingForOwner
          ? "Waiting for owner approval"
          : "Completed";
  });
}

async function continueRecoveredWorkflow(job, runId, completedStep) {
  if (!runId || !completedStep) return;
  const state = await snapshot(job.workspaceId);
  const run = state.runs?.find((item) => item.id === runId);
  const remaining = run?.steps?.slice(completedStep) || [];
  if (!remaining.length) return finalizeRun(job.workspaceId, runId);

  const identity = { workspaceId: job.workspaceId, userEmail: job.userEmail };
  const authority = await createAuthority(
    `${run.goal || "Recover workflow"} (restart recovery)`,
    remaining,
    identity,
  );
  for (let offset = 0; offset < remaining.length; offset += 1) {
    const step = remaining[offset];
    const stepNumber = completedStep + offset + 1;
    let outcome;
    try {
      outcome = await governedCall(authority, step, identity);
    } catch (error) {
      outcome = { status: "Failed", source: "Durable Hold recovery", reason: error.message, executed: false };
    }
    const { continuation, data: _privateData, ...stored } = outcome;
    const eventId = randomUUID();
    await mutate(job.workspaceId, (next) => {
      next.events.unshift({
        id: eventId,
        runId,
        step: stepNumber,
        totalSteps: run.steps.length,
        agent: step.agent,
        action: step.action,
        params: step.params,
        explanation: step.explanation,
        ...stored,
        createdAt: new Date().toISOString(),
      });
    });
    if (outcome.status === "Held" && continuation) {
      continuation.then(async (resumed) => {
        await mutate(job.workspaceId, (next) => {
          const event = next.events.find((item) => item.id === eventId);
          if (event) Object.assign(event, resumed, { resumedAt: new Date().toISOString() });
        });
        if (resumed.status === "Completed") await continueRecoveredWorkflow(job, runId, stepNumber);
        else await finalizeRun(job.workspaceId, runId);
      }).catch(async (error) => {
        await mutate(job.workspaceId, (next) => {
          const event = next.events.find((item) => item.id === eventId);
          if (event) Object.assign(event, { status: "Failed", reason: error.message, executed: false, resumedAt: new Date().toISOString() });
        });
        await finalizeRun(job.workspaceId, runId);
      });
      return;
    }
    if (outcome.status !== "Completed") return finalizeRun(job.workspaceId, runId);
  }
  await finalizeRun(job.workspaceId, runId);
}

async function recoverJob(job) {
  try {
    const outcome = await resumeDurableHold(job);
    if (outcome.status === "Pending") {
      await releaseDurableHold(job);
      return;
    }
    const terminalStatus = outcome.status === "Completed" ? "Completed" : outcome.status;
    await settleDurableHold(job.delegationId, terminalStatus, outcome.reason || "");
    const context = await updateRecoveredEvent(job, outcome);
    if (outcome.status === "Completed") await continueRecoveredWorkflow(job, context.runId, context.completedStep);
    else await finalizeRun(job.workspaceId, context.runId);
    console.info("[ArmorIQ recovery]", JSON.stringify({ delegationId: job.delegationId, action: job.action, status: outcome.status }));
  } catch (error) {
    const expired = /expired/i.test(String(error?.message || error));
    if (expired) {
      await settleDurableHold(job.delegationId, "Expired", error.message);
      await updateRecoveredEvent(job, { status: "Expired", source: "ArmorIQ durable approval recovery", reason: error.message, executed: false });
    } else {
      await releaseDurableHold(job, String(error?.message || error));
    }
    console.error("[ArmorIQ recovery]", JSON.stringify({ delegationId: job.delegationId, action: job.action, error: String(error?.message || error) }));
  }
}

export async function recoverHeldInvocations() {
  if (!isLive() || recoveryRunning) return;
  recoveryRunning = true;
  try {
    for (const job of await claimRecoverableHolds()) await recoverJob(job);
  } finally {
    recoveryRunning = false;
  }
}

export function startHoldRecoveryWorker() {
  if (!isLive()) return () => {};
  void recoverHeldInvocations();
  const timer = setInterval(() => void recoverHeldInvocations(), intervalMs);
  timer.unref?.();
  console.info(`[ArmorIQ recovery] Durable Hold worker started (${intervalMs}ms interval)`);
  return () => clearInterval(timer);
}
