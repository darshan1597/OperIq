import { randomUUID } from "node:crypto";
import { createAuthority, governedCall } from "./governance.service.js";
import { listPlatformWorkspaces, mutate } from "./store.service.js";
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
  await mutate(workspaceId, (state) => {
    state.events ||= [];
    state.events.unshift({ id: eventId, agent: "admin", action: step.action, explanation: step.explanation, ...storedOutcome, createdAt: new Date().toISOString() });
  });
  if (continuation) continuation.then(async (resumed) => {
    await mutate(workspaceId, (state) => {
      const event = state.events.find((item) => item.id === eventId);
      if (event) Object.assign(event, resumed, { resumedAt: new Date().toISOString() });
    });
  }).catch(async (error) => {
    await mutate(workspaceId, (state) => {
      const event = state.events.find((item) => item.id === eventId);
      if (event) Object.assign(event, { status: "Failed", reason: error.message, resumedAt: new Date().toISOString() });
    });
  });
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
