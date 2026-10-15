import { listPlatformWorkspaces } from "../services/store.service.js";
import { z } from "zod";
import { reportProgress } from "../services/request-progress.service.js";
import { askAdminAgent } from "../services/admin-agent.service.js";

// Include real governed executions while excluding ordinary business proposals
// that do not carry an ArmorIQ request or delegation trail.
const armorEvent = (event) => Boolean(
  event.delegationId
  || (event.requestId && (/ArmorIQ/i.test(event.source || "") || (event.audit || []).some((entry) => String(entry.stage || "").startsWith("authority.")))),
);

const redact = (value) => String(value || "")
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email hidden]")
  .replace(/(?:\+?\d[\d\s()-]{7,}\d)/g, "[phone hidden]");

export async function getAdminOverview(_req, res) {
  reportProgress("Reading platform health and governance summaries");
  const workspaces = await listPlatformWorkspaces();
  const businessNameByWorkspace = new Map(workspaces.map(({ workspaceId, data }) => [workspaceId, data.business?.name || "Unnamed workspace"]));
  const actions = workspaces.flatMap(({ workspaceId, data }) => {
    const runsById = new Map((data.runs || []).map((run) => [run.id, run]));
    return (data.events || [])
      .filter(armorEvent)
      .map((event) => {
        const run = event.runId ? runsById.get(event.runId) : null;
        return {
        id: event.id,
        workspaceId,
        businessName: data.business?.name || "Unnamed workspace",
        runId: event.runId || null,
        action: event.action,
        agent: event.agent,
        status: event.status,
        source: event.source,
        reason: event.reason || event.explanation || null,
        requestedReason: redact(event.params?.reason || ""),
        explanation: event.explanation || null,
        targetBusinessName: event.params?.targetWorkspaceId
          ? businessNameByWorkspace.get(event.params.targetWorkspaceId) || "Unknown workspace"
          : null,
        step: event.step || null,
        totalSteps: event.totalSteps || null,
        workflowStatus: run?.status || null,
        delegationId: event.delegationId || null,
        requestId: event.requestId || null,
        createdAt: event.createdAt,
        resumedAt: event.resumedAt || null,
        approvalExpiresAt: event.approvalExpiresAt || null,
        executed: Boolean(event.executed),
        };
      });
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  const workspaceSummaries = workspaces.map(({ workspaceId, data }) => {
    const events = data.events || [];
    const delegated = events.filter(armorEvent);
    const lastActivity = events.map((event) => event.createdAt).filter(Boolean).sort().at(-1) || null;
    return {
      workspaceId,
      businessName: data.business?.name || "Unnamed workspace",
      aiStatus: data.aiProfile?.status || "draft",
      teamSize: (data.staff || []).length,
      workflowCount: (data.runs || []).length,
      heldCount: delegated.filter((event) => event.status === "Held").length,
      failedCount: delegated.filter((event) => event.status === "Failed").length,
      lastActivity,
    };
  }).sort((a, b) => a.businessName.localeCompare(b.businessName));

  const workflows = workspaces.flatMap(({ workspaceId, data }) =>
    (data.runs || []).map((run) => ({
      id: run.id,
      workspaceId,
      businessName: data.business?.name || "Unnamed workspace",
      workflow: run.workflow || "agent",
      status: run.status,
      createdAt: run.createdAt,
      summary: redact(run.summary || run.error || ""),
      events: (data.events || [])
        .filter((event) => event.runId === run.id)
        .sort((left, right) => {
          if (left.step && right.step && left.step !== right.step) return left.step - right.step;
          return String(left.createdAt).localeCompare(String(right.createdAt));
        })
        .map((event) => ({
          id: event.id,
          step: event.step || null,
          totalSteps: event.totalSteps || null,
          agent: event.agent,
          action: event.action,
          status: event.status,
          source: event.source,
          reason: redact(event.reason || event.explanation || ""),
          explanation: redact(event.explanation || ""),
          targetBusinessName: event.params?.targetWorkspaceId
            ? businessNameByWorkspace.get(event.params.targetWorkspaceId) || "Unknown workspace"
            : null,
          requestId: event.requestId || null,
          delegationId: event.delegationId || null,
          createdAt: event.createdAt,
          resumedAt: event.resumedAt || null,
          approvalExpiresAt: event.approvalExpiresAt || null,
          executed: Boolean(event.executed),
        })),
    })),
  ).sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt))).slice(0, 100);

  const securityAlerts = workspaces.flatMap(({ workspaceId, data }) => {
    const automation = data.securityAutomation;
    if (!automation) return [];
    const governedEvent = (data.events || []).find(
      (event) => event.delegationId && event.delegationId === automation.delegationId,
    );
    const status = governedEvent?.status || automation.status || "Detected";
    // Keep the overview focused on pause requests that still need attention.
    // Resolved requests remain available in the governance audit.
    if (["Completed", "Rejected", "Blocked", "Expired"].includes(status)) return [];
    return [{
      workspaceId,
      businessName: data.business?.name || "Unnamed workspace",
      reason: redact(automation.reason || "Repeated ArmorIQ-blocked customer actions"),
      status,
      delegationId: automation.delegationId || null,
      triggeredAt: automation.triggeredAt || null,
      rateLimitedUntil: automation.until || null,
      pauseExecuted: governedEvent?.action === "admin_pause_business_ai" && Boolean(governedEvent.executed),
    }];
  }).sort((left, right) => String(right.triggeredAt).localeCompare(String(left.triggeredAt)));

  return res.json({
    metrics: {
      workspaces: workspaces.length,
      held: actions.filter((item) => item.status === "Held").length,
      allowed: actions.filter((item) => item.status === "Completed").length,
      blocked: actions.filter((item) => ["Blocked", "Unexpectedly allowed"].includes(item.status)).length,
      resumed: actions.filter((item) => item.resumedAt).length,
      failed: actions.filter((item) => item.status === "Failed").length,
    },
    actions,
    workflows,
    workspaces: workspaceSummaries,
    securityAlerts,
    armorDashboardUrl: process.env.ARMORIQ_DASHBOARD_URL || "",
    refreshedAt: new Date().toISOString(),
  });
}

export async function askAdmin(req, res) {
  const { question } = z.object({ question: z.string().trim().min(2).max(2000) }).parse(req.body);
  const result = await askAdminAgent({
    question,
    workspaceId: req.user.id,
    userEmail: req.user.email,
  });
  return res.status(result.status === "Held" ? 202 : 200).json(result);
}
