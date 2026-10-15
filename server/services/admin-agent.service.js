import { randomUUID } from "node:crypto";
import { createAuthority, governedCall, governanceErrorMessage } from "./governance.service.js";
import { settleDurableHold } from "./durable-hold.service.js";
import { listPlatformWorkspaces, mutate, snapshot } from "./store.service.js";
import { reportProgress } from "./request-progress.service.js";

const readable = (value) => String(value || "").trim();

async function planAdminQuestion(question) {
  const workspaces = await listPlatformWorkspaces();
  const lowered = question.toLowerCase();
  const target = workspaces.find(({ data }) =>
    lowered.includes(String(data.business?.name || "").toLowerCase()),
  );
  if (/export|download|customer data|conversation|database/.test(lowered))
    return { agent: "admin", action: "admin_export_platform_registry", params: {}, explanation: "Attempt a protected platform export through ArmorIQ." };
  if (/\b(pause|disable|suspend|quarantine)\b/.test(lowered)) {
    if (!target) throw Object.assign(Error("Name the business workspace you want to pause."), { status: 422 });
    return { agent: "admin", action: "admin_pause_business_ai", params: { targetWorkspaceId: target.workspaceId, reason: readable(question).slice(0, 2000) }, explanation: `Pause ${target.data.business.name}'s public Business AI after platform approval.` };
  }
  if (/\b(resume|enable|restore|unpause)\b/.test(lowered)) {
    if (!target) throw Object.assign(Error("Name the business workspace you want to resume."), { status: 422 });
    return { agent: "admin", action: "admin_resume_business_ai", params: { targetWorkspaceId: target.workspaceId, reason: readable(question).slice(0, 2000) }, explanation: `Resume ${target.data.business.name}'s public Business AI after platform approval.` };
  }
  if (/hold|delegation|needs review|waiting/.test(lowered))
    return { agent: "admin", action: "admin_read_governance_audit", params: {}, explanation: "Read platform governance metadata and held delegations." };
  if (/workspace|business|tenant|assistant/.test(lowered))
    return { agent: "admin", action: "admin_list_workspace_health", params: {}, explanation: "Read privacy-safe workspace health metadata." };
  if (/audit|failure|failed|policy|governance/.test(lowered))
    return { agent: "admin", action: "admin_read_governance_audit", params: {}, explanation: "Read the platform governance audit." };
  return { agent: "admin", action: "admin_read_platform_health", params: {}, explanation: "Read aggregate OperIQ platform health." };
}

function resultData(outcome) {
  const content = outcome?.data?.content;
  const text = Array.isArray(content) ? content.find((item) => item.type === "text")?.text : null;
  if (!text) return outcome?.data || null;
  try { return JSON.parse(text); } catch { return text; }
}

function answerFor(action, outcome) {
  if (outcome.status === "Held") return "ArmorIQ held this platform action for administrator review. No platform change has been made.";
  if (outcome.status === "Blocked") return "ArmorIQ blocked this platform request. No protected platform data was returned.";
  if (outcome.status !== "Completed") return outcome.reason || "The governed platform action failed.";
  const data = resultData(outcome);
  if (action === "admin_read_platform_health")
    return `OperIQ is ${data.status}. ${data.workspaces} workspaces are registered, ${data.publishedAssistants} Business AI assistants are published, ${data.pausedAssistants} are paused, and ${data.heldDelegations} ArmorIQ delegations need review.`;
  if (action === "admin_list_workspace_health")
    return data.length ? data.map((item) => `${item.businessName}: Business AI ${item.aiStatus}/${item.platformStatus}, ${item.workflowCount} workflows, ${item.heldDelegations} held delegations`).join("\n") : "No business workspaces are registered.";
  if (action === "admin_read_governance_audit")
    return data.length ? data.slice(0, 10).map((item) => `${item.businessName}: ${item.action} — ${item.status}`).join("\n") : "No ArmorIQ governance activity has been recorded.";
  if (["admin_pause_business_ai", "admin_resume_business_ai"].includes(action))
    return `${data.businessName} Business AI is now ${data.platformStatus}.`;
  return "The governed platform action completed.";
}

async function waitForAdminState(step, attempts = 12, intervalMs = 500, changedAfter = 0) {
  const expectedPlatformStatus = step.action === "admin_pause_business_ai"
    ? "paused"
    : step.action === "admin_resume_business_ai"
      ? "active"
      : null;
  if (!expectedPlatformStatus || !step.params?.targetWorkspaceId)
    return { confirmed: false, expectedPlatformStatus };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const targetState = await snapshot(step.params.targetWorkspaceId).catch(() => null);
    const changedAt = Date.parse(targetState?.aiProfile?.platformStatusChangedAt || 0);
    if (targetState?.aiProfile?.platformStatus === expectedPlatformStatus && changedAt >= changedAfter)
      return { confirmed: true, expectedPlatformStatus };
    if (attempt < attempts - 1)
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { confirmed: false, expectedPlatformStatus };
}

async function reconcileHeldAdminAction({ workspaceId, eventId, step, delegationId, createdAt, client }) {
  const expectedPlatformStatus = step.action === "admin_pause_business_ai" ? "paused" : "active";
  const changedAfter = Date.parse(createdAt) - 1_000;
  for (let attempt = 0; attempt < 360; attempt += 1) {
    const decision = await client.getDelegationStatus(delegationId).catch(() => null);
    if (["rejected", "expired", "none"].includes(decision)) {
      const status = decision === "rejected" ? "Rejected" : "Expired";
      await settleDurableHold(delegationId, status, `ArmorIQ delegation ${decision}`);
      await mutate(workspaceId, (state) => {
        const event = state.events.find((item) => item.id === eventId);
        if (event?.status === "Held") Object.assign(event, {
          status,
          source: "ArmorIQ approval workflow",
          reason: decision === "rejected"
            ? "The administrator rejected this action in ArmorIQ. No platform change was made."
            : "The ArmorIQ approval expired. Submit the action again to request fresh approval.",
          executed: false,
          resumedAt: new Date().toISOString(),
        });
      });
      return;
    }

    const targetState = await snapshot(step.params.targetWorkspaceId).catch(() => null);
    const changedAt = Date.parse(targetState?.aiProfile?.platformStatusChangedAt || 0);
    if (targetState?.aiProfile?.platformStatus === expectedPlatformStatus && changedAt >= changedAfter) {
      await settleDurableHold(delegationId, "Completed");
      await mutate(workspaceId, (state) => {
        const event = state.events.find((item) => item.id === eventId);
        if (event?.status === "Held") Object.assign(event, {
          status: "Completed",
          source: "OperIQ post-execution state verification",
          reason: `ArmorIQ approved the request and OperIQ verified that the Business AI is ${expectedPlatformStatus}.`,
          executed: true,
          resumedAt: new Date().toISOString(),
        });
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
}

export async function askAdminAgent({ question, workspaceId, userEmail }) {
  reportProgress("Admin agent is reviewing the platform request");
  const step = await planAdminQuestion(question);
  reportProgress(`Admin agent selected ${step.action}`);
  const audit = [];
  const requestId = randomUUID();
  const authority = await createAuthority(question, [step], {
    workspaceId,
    userEmail,
    audit,
    requestId,
    agentId: process.env.ARMORIQ_ADMIN_AGENT_ID || "operiq-admin",
  });
  const outcome = await governedCall(authority, step, { workspaceId, userEmail });
  const { continuation, ...storedOutcome } = outcome;
  const eventId = randomUUID();
  const createdAt = new Date().toISOString();
  await mutate(workspaceId, (state) => {
    state.events ||= [];
    state.events.unshift({ id: eventId, agent: "admin", action: step.action, explanation: step.explanation, ...storedOutcome, createdAt });
  });
  if (continuation) {
    void reconcileHeldAdminAction({ workspaceId, eventId, step, delegationId: outcome.delegationId, createdAt, client: authority.client });
    continuation.then(async (resumed) => {
    await mutate(workspaceId, (state) => {
      const event = state.events.find((item) => item.id === eventId);
      if (event?.status !== "Completed") Object.assign(event, resumed, { resumedAt: new Date().toISOString() });
    });
  }).catch(async (error) => {
    const reason = governanceErrorMessage(error);
    console.error("[Admin Hold continuation]", JSON.stringify({
      requestId,
      action: step.action,
      error: reason,
      statusCode: error?.statusCode || error?.response?.status || null,
      response: error?.response?.data || null,
    }));
    const { confirmed: executionConfirmed, expectedPlatformStatus } = await waitForAdminState(step, 12, 500, Date.parse(createdAt) - 1_000);

    if (executionConfirmed && outcome.delegationId) {
      await settleDurableHold(outcome.delegationId, "Completed");
    }

    await mutate(workspaceId, (state) => {
      const event = state.events.find((item) => item.id === eventId);
      if (event?.status !== "Completed") Object.assign(event, executionConfirmed
        ? {
            status: "Completed",
            source: "OperIQ post-execution state verification",
            reason: `ArmorIQ approved the request and OperIQ verified that the Business AI is ${expectedPlatformStatus}. The proxy did not return a usable success response.`,
            executed: true,
            resumedAt: new Date().toISOString(),
          }
        : { status: "Failed", reason, executed: false, resumedAt: new Date().toISOString() });
    });
  });
  }
  return {
    answer: answerFor(step.action, outcome),
    action: step.action,
    status: outcome.status,
    source: outcome.source,
    reason: outcome.reason || null,
    delegationId: outcome.delegationId || null,
    requestId,
  };
}
