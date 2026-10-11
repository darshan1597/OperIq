import {
    ArmorIQClient,
    PolicyBlockedException,
    IntentMismatchException,
    PolicyHoldException,
} from "@armoriq/sdk";
import { canRun, executeTool } from "./tool.service.js";

export const isLive = () => process.env.EXECUTION_MODE === "live";
export function integrationStatus() {
    return {
        mode: isLive() ? "live" : "sandbox",
        model: !!process.env.OPENAI_API_KEY,
        armor: !!process.env.ARMORIQ_API_KEY,
        mcp: !!process.env.MCP_SHARED_SECRET,
    };
}

export async function createAuthority(goal, steps, { workspaceId, userEmail }) {
    if (!isLive()) return null;

    if (
        !process.env.ARMORIQ_API_KEY ||
        !process.env.OPENAI_API_KEY ||
        !process.env.MCP_SHARED_SECRET
    )
        throw Error("Live mode requires model, ArmorIQ, and MCP credentials. No sandbox fallback is performed.",);

    const client = new ArmorIQClient({
        apiKey: process.env.ARMORIQ_API_KEY,
        userId: workspaceId,
        agentId: process.env.ARMORIQ_AGENT_ID || "opsdesk-coordinator",
    });

    const mcp = process.env.ARMORIQ_MCP_NAME || "opsdesk-mcp";

    const stepsWithScope = steps
        .filter((step) => canRun(step.agent, step.action))
        .map((step) => ({
            action: step.action,
            mcp,
            params: { ...step.params, workspaceId },
        }));

    const plan = await client.capturePlan(
        process.env.OPENAI_MODEL || "gpt-4o-mini",
        goal,
        { goal, steps: stepsWithScope },
    );

    const token = await client.getIntentToken(plan, { validitySeconds: 300 });

    return { client, token, mcp, workspaceId, userEmail };
}

export async function governedCall(
    authority,
    step,
    { workspaceId, userEmail },
) {
    if (!canRun(step.agent, step.action))
        return {
            status: "Blocked",
            source: "Application role boundary",
            reason: `${step.agent} has no authority for ${step.action}.`,
            executed: false,
        };
    if (!isLive()) {
        const data = await executeTool(step.action, step.params, workspaceId);
        return {
            status: "Completed",
            source: "Sandbox application rules — not ArmorIQ",
            data,
            executed: true,
        };
    }
    if (!authority) throw Error("Missing live authority");
    try {
        const result = await authority.client.invoke(
            authority.mcp,
            step.action,
            authority.token,
            { ...step.params, workspaceId },
            undefined,
            userEmail,
        );
        if (result.status !== "success" || result.result?.isError)
        throw Error("MCP execution failed");
        return {
            status: "Completed",
            source: "ArmorIQ proxy",
            data: result.result,
            verified: result.verified,
            executed: true,
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
        if (
            error instanceof PolicyHoldException ||
            error.name === "PolicyHoldException"
        )
        return {
            status: "Held",
            source: "ArmorIQ",
            reason: error.message,
            delegationId:
            error.delegationContext?.delegation_id ||
            error.delegationContext?.delegationId ||
            error.response?.data?.delegation_id,
            executed: false,
        };
        throw error;
    }
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
