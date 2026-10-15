import { createHash } from "node:crypto";
import { askAdminAgent } from "./admin-agent.service.js";
import { mutate, snapshot } from "./store.service.js";

const threshold = () => Math.max(2, Number(process.env.SECURITY_BLOCK_THRESHOLD) || 3);
const windowMs = () => Math.max(60_000, Number(process.env.SECURITY_BLOCK_WINDOW_MS) || 10 * 60_000);
const cooldownMs = () => Math.max(60_000, Number(process.env.SECURITY_RATE_LIMIT_MS) || 30 * 60_000);
const businessThreshold = () => Math.max(2, Number(process.env.SECURITY_BUSINESS_CUSTOMER_THRESHOLD) || 3);

export function securityActorKey(req, verifiedCustomerId = "", clientSessionId = "") {
  const raw = verifiedCustomerId
    ? `customer:${verifiedCustomerId}`
    : clientSessionId
      ? `browser:${clientSessionId}`
    : `network:${req.ip || req.socket?.remoteAddress || "unknown"}:${req.get?.("user-agent") || "unknown"}`;
  return createHash("sha256")
    .update(`${process.env.JWT_SECRET || "operiq"}:${raw}`)
    .digest("hex")
    .slice(0, 24);
}

export async function activeSecurityRateLimit(workspaceId, actorKey) {
  const state = await snapshot(workspaceId);
  const record = state.securityRateLimits?.[actorKey];
  const active = record && Date.parse(record.until) > Date.now();
  return active ? record : null;
}

export async function recordBlockedSecurityAttempt({ workspaceId, businessName, actorKey, action, requestId }) {
  const now = Date.now();
  const cutoff = now - windowMs();
  const decision = await mutate(workspaceId, (state) => {
    state.securityActivity ||= [];
    state.securityRateLimits ||= {};
    state.securityActivity = state.securityActivity
      .filter((item) => Date.parse(item.at) >= now - 24 * 60 * 60_000)
      .slice(-199);
    state.securityActivity.push({
      at: new Date(now).toISOString(),
      actorKey,
      action,
      requestId,
      outcome: "Blocked",
    });

    const recentCount = state.securityActivity.filter(
      (item) => item.actorKey === actorKey && item.outcome === "Blocked" && Date.parse(item.at) >= cutoff,
    ).length;
    const existing = state.securityRateLimits[actorKey];
    const alreadyActive = existing && Date.parse(existing.until) > now;
    if (recentCount < threshold() || alreadyActive)
      return { triggered: false, businessEscalated: false, rateLimited: Boolean(alreadyActive), recentCount, until: existing?.until || null };

    const until = new Date(now + cooldownMs()).toISOString();
    state.securityRateLimits[actorKey] = {
      since: new Date(now).toISOString(),
      until,
      recentCount,
      reason: `${recentCount} ArmorIQ-blocked customer actions within ${Math.round(windowMs() / 60_000)} minutes`,
    };
    const independentlyRestricted = Object.values(state.securityRateLimits).filter(
      (item) => Date.parse(item.since) >= cutoff,
    ).length;
    const automationAlreadyActive = state.securityAutomation
      && /independent customers/i.test(state.securityAutomation.reason || "")
      && Date.parse(state.securityAutomation.until) > now;
    if (independentlyRestricted < businessThreshold() || automationAlreadyActive)
      return { triggered: false, businessEscalated: Boolean(automationAlreadyActive), rateLimited: true, recentCount, independentlyRestricted, until };
    state.securityAutomation = {
      triggeredAt: new Date(now).toISOString(),
      until,
      status: "Starting",
      reason: `${independentlyRestricted} independent customers were rate limited within ${Math.round(windowMs() / 60_000)} minutes`,
    };
    return { triggered: true, businessEscalated: true, rateLimited: true, recentCount, independentlyRestricted, until };
  });

  if (!decision.triggered) return decision;

  const reason = `${decision.independentlyRestricted} independent customers were rate limited after repeated ArmorIQ-blocked actions within ${Math.round(windowMs() / 60_000)} minutes. Temporarily pause the Business AI after human approval.`;
  try {
    const governed = await askAdminAgent({
      question: `Pause ${businessName}'s AI because suspicious activity was detected. ${reason}`,
      workspaceId,
      userEmail: process.env.SECURITY_AUTOMATION_USER_EMAIL || "security-automation@operiq.local",
    });
    await mutate(workspaceId, (state) => {
      const record = state.securityRateLimits?.[actorKey];
      if (record) Object.assign(record, {
        automationStatus: governed.status,
        delegationId: governed.delegationId || null,
        automationRequestId: governed.requestId || null,
      });
      if (state.securityAutomation) Object.assign(state.securityAutomation, {
        status: governed.status,
        delegationId: governed.delegationId || null,
        requestId: governed.requestId || null,
      });
    });
    return { ...decision, automation: governed };
  } catch (error) {
    await mutate(workspaceId, (state) => {
      const record = state.securityRateLimits?.[actorKey];
      if (record) Object.assign(record, { automationStatus: "Failed", automationError: String(error?.message || error) });
      if (state.securityAutomation) Object.assign(state.securityAutomation, { status: "Failed", error: String(error?.message || error) });
    });
    return { ...decision, automationError: String(error?.message || error) };
  }
}

export async function ensureBusinessSecurityEscalation({ workspaceId, businessName }) {
  const now = Date.now();
  const cutoff = now - windowMs();
  const current = await snapshot(workspaceId);
  const independentCustomers = Object.values(current.securityRateLimits || {}).filter(
    (item) => Date.parse(item.since) >= cutoff,
  ).length;
  const activeAutomation = current.securityAutomation
    && /independent customers/i.test(current.securityAutomation.reason || "")
    && Date.parse(current.securityAutomation.until) > now;
  if (independentCustomers < businessThreshold() || activeAutomation)
    return { triggered: false, businessEscalated: Boolean(activeAutomation), independentCustomers };

  const until = new Date(now + cooldownMs()).toISOString();
  const reason = `${independentCustomers} independent customers were rate limited within ${Math.round(windowMs() / 60_000)} minutes`;
  const claimed = await mutate(workspaceId, (state) => {
    const alreadyClaimed = state.securityAutomation
      && /independent customers/i.test(state.securityAutomation.reason || "")
      && Date.parse(state.securityAutomation.until) > Date.now();
    if (alreadyClaimed) return false;
    state.securityAutomation = {
      triggeredAt: new Date(now).toISOString(),
      until,
      status: "Starting",
      reason,
    };
    return true;
  });
  if (!claimed) return { triggered: false, businessEscalated: true, independentCustomers };

  try {
    const governed = await askAdminAgent({
      question: `Pause ${businessName}'s AI because suspicious activity was detected. ${reason}. Temporarily pause the Business AI after human approval.`,
      workspaceId,
      userEmail: process.env.SECURITY_AUTOMATION_USER_EMAIL || "security-automation@operiq.local",
    });
    await mutate(workspaceId, (state) => {
      if (state.securityAutomation) Object.assign(state.securityAutomation, {
        status: governed.status,
        delegationId: governed.delegationId || null,
        requestId: governed.requestId || null,
      });
    });
    return { triggered: true, businessEscalated: true, independentCustomers, automation: governed };
  } catch (error) {
    await mutate(workspaceId, (state) => {
      if (state.securityAutomation) Object.assign(state.securityAutomation, { status: "Failed", error: String(error?.message || error) });
    });
    return { triggered: true, businessEscalated: true, independentCustomers, automationError: String(error?.message || error) };
  }
}
