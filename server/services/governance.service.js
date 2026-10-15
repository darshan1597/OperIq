import {
    ArmorIQClient,
    PolicyBlockedException,
    IntentMismatchException,
    PolicyHoldException,
    MCPInvocationException,
} from "@armoriq/sdk";
import { randomUUID } from "node:crypto";
import { canRun, executeTool } from "./tool.service.js";
import { reportProgress } from "./request-progress.service.js";
import { snapshot } from "./store.service.js";
import {
    decryptIntentToken,
    heartbeatDurableHold,
    persistDurableHold,
    settleDurableHold,
} from "./durable-hold.service.js";

const auditEntry = (audit, requestId, stage, details = {}) => {
    const entry = { at: new Date().toISOString(), requestId, stage, ...details };
    audit?.push(entry);
    console.info("[ArmorIQ audit]", JSON.stringify(entry));
    return entry;
};

export function governanceErrorMessage(error) {
    const candidates = [
        error?.response?.data?.message,
        error?.response?.data?.error,
        error?.metadata?.message,
        error?.metadata?.error,
        error?.details?.message,
        error?.message,
    ];
    for (const value of candidates) {
        if (typeof value === "string" && value.trim() && !value.includes("[object Object]"))
            return value.trim();
        if (value && typeof value === "object") {
            try {
                const serialized = JSON.stringify(value);
                if (serialized && serialized !== "{}") return serialized;
            } catch {
                // Continue to the stable fallback below.
            }
        }
    }
    return "ArmorIQ approved the request, but its MCP proxy could not execute the tool.";
}

export const isLive = () => process.env.EXECUTION_MODE === "live";
export function integrationStatus() {
    return {
        mode: isLive() ? "live" : "sandbox",
        model: !!process.env.OPENAI_API_KEY,
        armor: !!process.env.ARMORIQ_API_KEY,
        mcp: !!process.env.MCP_SHARED_SECRET,
    };
}

export async function createAuthority(goal, steps, { workspaceId, userEmail, audit = [], requestId = randomUUID(), agentId }) {
    if (!isLive()) return null;

    if (
        !process.env.ARMORIQ_API_KEY ||
        !process.env.OPENAI_API_KEY ||
        !process.env.MCP_SHARED_SECRET
    )
        throw Error("Live mode requires model, ArmorIQ, and MCP credentials. No sandbox fallback is performed.",);

    reportProgress("Preparing the governed action for ArmorIQ");
    const client = new ArmorIQClient({
        apiKey: process.env.ARMORIQ_API_KEY,
        userId: workspaceId,
        agentId: agentId || process.env.ARMORIQ_AGENT_ID || "operiq-coordinator",
    });

    const mcp = process.env.ARMORIQ_MCP_NAME || "operiq-mcp";

    const stepsWithScope = steps
        .filter((step) => canRun(step.agent, step.action))
        .map((step) => ({
            action: step.action,
            mcp,
            params: { ...step.params, workspaceId },
        }));

    auditEntry(audit, requestId, "authority.prepare", {
        mode: "live",
        mcp,
        actionsRequested: steps.map((step) => step.action),
        actionsAuthorizedByApp: stepsWithScope.map((step) => step.action),
        userIdentityPresent: Boolean(userEmail),
    });

    const model = process.env.GROQ_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini";
    reportProgress("ArmorIQ is capturing and signing the intent plan");
    const plan = await client.capturePlan(
        model,
        goal,
        { goal, steps: stepsWithScope },
    );
    auditEntry(audit, requestId, "authority.plan_captured", {
        model,
        stepCount: stepsWithScope.length,
    });

    reportProgress("ArmorIQ is issuing the intent token and policy proof");
    const token = await client.getIntentToken(plan, undefined, 1800);
    auditEntry(audit, requestId, "authority.intent_token_issued", {
        expiresInSeconds: 1800,
        proofCount: token?.stepProofs?.length || 0,
    });

    return {
        client,
        token,
        mcp,
        workspaceId,
        userEmail,
        audit,
        requestId,
        agentId: agentId || process.env.ARMORIQ_AGENT_ID || "operiq-coordinator",
    };
}

export async function governedCall(
    authority,
    step,
    { workspaceId, userEmail },
) {
    reportProgress(`${step.agent} agent is checking authority for ${step.action}`);
    if (!canRun(step.agent, step.action))
        return {
            status: "Blocked",
            source: "Application role boundary",
            reason: `${step.agent} has no authority for ${step.action}.`,
            executed: false,
        };
    if (!isLive()) {
        reportProgress(`Executing ${step.action} with application policy`);
        const data = await executeTool(step.action, step.params, workspaceId);
        return {
            status: "Completed",
            source: "Sandbox application rules — not ArmorIQ",
            data,
            executed: true,
        };
    }
    if (!authority) throw Error("Missing live authority");
    const audit = authority.audit || [];
    const requestId = authority.requestId || randomUUID();
    auditEntry(audit, requestId, "invoke.started", {
        mcp: authority.mcp,
        action: step.action,
        agent: step.agent,
        parameterNames: Object.keys(step.params || {}),
    });
    reportProgress(`ArmorIQ is evaluating policy for ${step.action}`);

    const normalizeResult = (result) => {
        const toolError = result?.result?.isError
            ? (result.result.content || [])
                .filter((item) => item?.type === "text")
                .map((item) => item.text)
                .filter(Boolean)
                .join(" ") || result.result.error?.message || result.result.message || "MCP execution failed"
            : "";
        auditEntry(audit, requestId, "invoke.response", {
            sdkStatus: result?.status,
            verified: Boolean(result?.verified),
            toolReportedError: Boolean(result?.result?.isError),
            ...(toolError ? { toolError } : {}),
        });
        if (result.status !== "success" || result.result?.isError)
            throw Error(toolError || `MCP execution failed${result?.status ? ` with status ${result.status}` : ""}`);
        return {
            status: "Completed",
            source: "ArmorIQ intent-governed MCP proxy",
            data: result.result,
            verified: result.verified,
            delegatedAgent: step.agent,
            allowedActions: [step.action],
            executed: true,
            requestId,
            audit,
        };
    };

    const normalizeError = (error) => {
        const delegationId =
            error?.delegationContext?.delegation_id ||
            error?.delegationContext?.delegationId ||
            error?.response?.data?.delegation_id;
        const delegationError = error?.metadata?.delegationError;
        auditEntry(audit, requestId, "invoke.failed", {
            errorName: error?.name || "Error",
            errorMessage: governanceErrorMessage(error),
            httpStatus: error?.statusCode || error?.response?.status || null,
            mcp: error?.mcp || authority.mcp,
            action: error?.action || step.action,
            ...(error?.matchedPolicy ? { matchedPolicy: error.matchedPolicy } : {}),
            ...(delegationId ? { delegationId } : {}),
            ...(delegationError ? { delegationError } : {}),
        });
        if (
            error instanceof PolicyBlockedException ||
            error.name === "PolicyBlockedException"
        )
        return {
            status: "Blocked",
            source: "ArmorIQ policy",
            reason: error.message,
            delegatedAgent: step.agent,
            allowedActions: [step.action],
            executed: false,
            requestId,
            audit,
        };
        if (error instanceof IntentMismatchException)
        return {
            status: "Blocked",
            source: "ArmorIQ SDK plan verification",
            reason: error.message,
            delegatedAgent: step.agent,
            allowedActions: [step.action],
            executed: false,
            requestId,
            audit,
        };
        if (
            error instanceof PolicyHoldException ||
            error.name === "PolicyHoldException"
        )
        if (!delegationId)
        return {
            status: "Failed",
            source: "ArmorIQ delegation",
            reason: delegationError
                ? `ArmorIQ held the action, but could not create the approval request: ${delegationError}`
                : "ArmorIQ held the action, but did not return an approval delegation ID.",
            delegatedAgent: step.agent,
            allowedActions: [step.action],
            executed: false,
            requestId,
            audit,
        };
        else
        return {
            status: "Held",
            source: "ArmorIQ",
            reason: error.message,
            delegationId,
            executed: false,
            requestId,
            audit,
        };
        return {
            status: "Failed",
            source: "ArmorIQ integration",
            reason: error instanceof MCPInvocationException || error.name === "MCPInvocationException"
                ? `ArmorIQ could not invoke ${step.action} on ${authority.mcp}. Register or re-sync the MCP server and confirm that this action is available.${error.statusCode ? ` HTTP ${error.statusCode}.` : ""}`
                : error.message,
            delegatedAgent: step.agent,
            allowedActions: [step.action],
            executed: false,
            requestId,
            audit,
        };
    };

    let signalHold;
    const holdSignal = new Promise((resolve) => { signalHold = resolve; });
    const invocationParams = { ...step.params, workspaceId };
    const resumeHeldInvocation = async (error) => {
        const isNonFinancialAmountMismatch =
            (error instanceof PolicyHoldException || error?.name === "PolicyHoldException") &&
            /amount must be at least 0\.01/i.test(error?.metadata?.delegationError || "");
        if (!isNonFinancialAmountMismatch) return normalizeError(error);

        const delegationContext = error.delegationContext || {};
        let requesterRole = "agent_user";
        let requesterLimit = 0;
        try {
            const resolved = await authority.client.resolveUserRole(userEmail);
            requesterRole = resolved.role;
            requesterLimit = resolved.limit;
        } catch {
            // The SDK uses these same least-privileged defaults.
        }
        const delegation = await authority.client.createDelegationRequest({
            tool: step.action,
            action: "execute",
            arguments: invocationParams,
            // ArmorIQ SDK 0.6.10 sends zero for non-financial tools, while the
            // current delegation API validates every amount as >= 0.01.
            amount: 0.01,
            requesterEmail: userEmail,
            requesterRole,
            requesterLimit,
            domain: delegationContext.domain || authority.mcp,
            targetUrl: delegationContext.targetUrl,
            planId: delegationContext.planId || authority.token.planId,
            intentReference: delegationContext.intentReference || authority.token.tokenId,
            merkleRoot: delegationContext.merkleRoot || authority.token.planHash,
            reason: error.message,
        });
        const delegationId = delegation.delegationId;
        auditEntry(audit, requestId, "invoke.held", {
            mcp: authority.mcp,
            action: step.action,
            delegationId,
            compatibilityAmount: 0.01,
        });
        signalHold({
            kind: "held",
            info: {
                delegationId,
                reason: error.message,
                tool: step.action,
                mcp: authority.mcp,
            },
        });

        const deadline = Date.now() + 30 * 60 * 1000;
        let pollInterval = 3000;
        while (Date.now() < deadline) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));
            pollInterval = Math.min(pollInterval * 1.5, 15000);
            const status = await authority.client.getDelegationStatus(delegationId);
            if (status === "approved") {
                const result = await authority.client.invoke(
                    authority.mcp,
                    step.action,
                    authority.token,
                    {
                        ...invocationParams,
                        _policy_context: { is_financial: false },
                        _delegation_id: delegationId,
                        _approvals: 999,
                    },
                    undefined,
                    userEmail,
                );
                const outcome = normalizeResult(result);
                try {
                    await authority.client.markDelegationExecuted(userEmail, delegationId, authority.token.planId);
                } catch (error) {
                    auditEntry(audit, requestId, "delegation.execution_ack_failed", {
                        delegationId,
                        errorMessage: governanceErrorMessage(error),
                    });
                    console.warn("[ArmorIQ delegation acknowledgment]", JSON.stringify({
                        requestId,
                        delegationId,
                        action: step.action,
                        error: governanceErrorMessage(error),
                    }));
                }
                return outcome;
            }
            if (["rejected", "expired"].includes(status))
                throw Error(`ArmorIQ delegation ${status}`);
        }
        throw Error("ArmorIQ delegation approval timed out after 1800 seconds");
    };

    reportProgress(`Calling the governed MCP tool ${step.action}`);
    const invocation = authority.client
        .invokeWithPolicy(
            authority.mcp,
            step.action,
            authority.token,
            invocationParams,
            {
                waitForApproval: true,
                delegationTimeoutMs: 30 * 60 * 1000,
                userEmail,
                onHold: (info) => {
                    if (info.delegationId)
                        signalHold({
                            kind: "held",
                            info,
                        });
                },
            },
        )
        .then(normalizeResult)
        .catch(resumeHeldInvocation);

    const first = await Promise.race([
        invocation.then((outcome) => ({ kind: "finished", outcome })),
        holdSignal,
    ]);
    if (first.kind === "finished") return first.outcome;
    await persistDurableHold({
        authority,
        step,
        delegationId: first.info.delegationId,
    });
    const heartbeat = setInterval(
        () => void heartbeatDurableHold(first.info.delegationId).catch((error) =>
            console.error("[ArmorIQ recovery] Hold heartbeat failed", error.message),
        ),
        15_000,
    );
    heartbeat.unref?.();
    const trackedContinuation = invocation
        .then(async (outcome) => {
            clearInterval(heartbeat);
            await settleDurableHold(
                first.info.delegationId,
                outcome.status === "Completed" ? "Completed" : "Failed",
                outcome.status === "Completed" ? "" : outcome.reason || "Held action did not complete",
            );
            return outcome;
        })
        .catch(async (error) => {
            clearInterval(heartbeat);
            const message = String(error?.message || error);
            const status = /rejected/i.test(message)
                ? "Rejected"
                : /expired|timed out/i.test(message)
                  ? "Expired"
                  : "Failed";
            await settleDurableHold(first.info.delegationId, status, message);
            throw error;
        });
    return {
        status: "Held",
        source: "ArmorIQ approval workflow",
        reason: first.info.reason || "This action requires approval in ArmorIQ.",
        delegationId: first.info.delegationId,
        approvalExpiresAt: new Date(Number(authority.token.expiresAt) * 1000).toISOString(),
        delegatedAgent: step.agent,
        allowedActions: [step.action],
        executed: false,
        continuation: trackedContinuation,
        requestId,
        audit,
    };
}

export async function resumeDurableHold(job) {
    if (!isLive()) throw Error("Durable Hold recovery requires EXECUTION_MODE=live");
    const token = decryptIntentToken(job.tokenEnvelope);
    if (Number(token.expiresAt) * 1000 <= Date.now())
        return { status: "Expired", reason: "The saved ArmorIQ intent token expired before recovery.", executed: false };

    const client = new ArmorIQClient({
        apiKey: process.env.ARMORIQ_API_KEY,
        userId: job.workspaceId,
        agentId: job.agentId || process.env.ARMORIQ_AGENT_ID || "operiq-coordinator",
    });
    const delegationStatus = await client.getDelegationStatus(job.delegationId);
    if (delegationStatus === "pending") return { status: "Pending", executed: false };
    if (["rejected", "expired", "none"].includes(delegationStatus))
        return {
            status: delegationStatus === "rejected" ? "Rejected" : "Expired",
            reason: `ArmorIQ delegation ${delegationStatus}`,
            executed: false,
        };
    if (delegationStatus !== "approved")
        throw Error(`Unexpected ArmorIQ delegation status: ${delegationStatus}`);

    if (!canRun(job.agent, job.action))
        return { status: "Failed", reason: `${job.agent} no longer has authority for ${job.action}.`, executed: false };

    if (["admin_pause_business_ai", "admin_resume_business_ai"].includes(job.action)) {
        const expectedStatus = job.action === "admin_pause_business_ai" ? "paused" : "active";
        const targetState = await snapshot(job.params?.targetWorkspaceId).catch(() => null);
        const changedAt = Date.parse(targetState?.aiProfile?.platformStatusChangedAt || 0);
        if (targetState?.aiProfile?.platformStatus === expectedStatus && changedAt >= Date.parse(job.createdAt || 0) - 1_000)
            return {
                status: "Completed",
                source: "OperIQ post-execution state verification",
                reason: `ArmorIQ approved the request and OperIQ verified that the Business AI is ${expectedStatus}.`,
                executed: true,
                requestId: job.requestId,
            };
    }

    const result = await client.invoke(
        job.mcp,
        job.action,
        token,
        {
            ...job.params,
            workspaceId: job.workspaceId,
            _policy_context: { is_financial: false },
            _delegation_id: job.delegationId,
            _approvals: 999,
        },
        undefined,
        job.userEmail,
    );
    const toolError = result?.result?.isError
        ? (result.result.content || []).filter((item) => item?.type === "text").map((item) => item.text).filter(Boolean).join(" ") || "MCP execution failed"
        : "";
    if (result.status !== "success" || result.result?.isError) throw Error(toolError || "MCP execution failed during Hold recovery");
    try {
        await client.markDelegationExecuted(job.userEmail, job.delegationId, token.planId);
    } catch (error) {
        console.warn("[ArmorIQ delegation acknowledgment]", JSON.stringify({
            requestId: job.requestId,
            delegationId: job.delegationId,
            action: job.action,
            error: governanceErrorMessage(error),
        }));
    }
    return {
        status: "Completed",
        source: "ArmorIQ durable approval recovery",
        verified: Boolean(result.verified),
        executed: true,
        requestId: job.requestId,
    };
}

export async function probe(authority, { workspaceId, userEmail }) {
    if (!isLive())
        return {
            status: "Unavailable",
            source: "Sandbox",
            reason: "Real ArmorIQ enforcement requires live configuration.",
            executed: false,
        };
    try {
        await authority.client.invoke(
            authority.mcp,
            "export_customers",
            authority.token,
            { workspaceId },
            undefined,
            userEmail,
        );
        return {
            status: "Unexpectedly allowed",
            source: "ArmorIQ",
            executed: true,
            reason: "The export was allowed. Review your registered policies before presenting this demo.",
        };
    } catch (error) {
        if (
            error instanceof PolicyBlockedException ||
            error.name === "PolicyBlockedException"
        )
        return {
            status: "Blocked",
            source: "ArmorIQ policy",
            reason: error.message,
            executed: false,
        };
        if (error instanceof IntentMismatchException)
        return {
            status: "Blocked",
            source: "ArmorIQ SDK plan verification",
            reason: error.message,
            executed: false,
        };
        throw error;
    }
}
