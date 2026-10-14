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

const auditEntry = (audit, requestId, stage, details = {}) => {
    const entry = { at: new Date().toISOString(), requestId, stage, ...details };
    audit?.push(entry);
    console.info("[ArmorIQ audit]", JSON.stringify(entry));
    return entry;
};

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

    return { client, token, mcp, workspaceId, userEmail, audit, requestId };
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
            errorMessage: String(error?.message || error),
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
                await authority.client.markDelegationExecuted(userEmail, delegationId, authority.token.planId);
                return normalizeResult(result);
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
    return {
        status: "Held",
        source: "ArmorIQ approval workflow",
        reason: first.info.reason || "This action requires approval in ArmorIQ.",
        delegationId: first.info.delegationId,
        delegatedAgent: step.agent,
        allowedActions: [step.action],
        executed: false,
        continuation: invocation,
        requestId,
        audit,
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
