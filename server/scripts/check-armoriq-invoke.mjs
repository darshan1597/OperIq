import mongoose from "mongoose";
import { ArmorIQClient } from "@armoriq/sdk";
import connectDb from "../config/db.js";
import { findPublishedWorkspaceRecordBySlug } from "../services/store.service.js";

const required = ["ARMORIQ_API_KEY", "ARMORIQ_MCP_NAME"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(", ")}`);
  process.exit(2);
}

let client;
try {
  await connectDb();
  const workspace = await findPublishedWorkspaceRecordBySlug(process.argv[2] || "evergreen-studio");
  if (!workspace) throw new Error("Published diagnostic workspace was not found");

  const mcp = process.env.ARMORIQ_MCP_NAME;
  const action = "read_workspace";
  const params = { workspaceId: workspace.workspaceId };
  client = new ArmorIQClient({
    apiKey: process.env.ARMORIQ_API_KEY,
    userId: workspace.workspaceId,
    agentId: process.env.ARMORIQ_AGENT_ID || "operiq-coordinator",
  });

  console.log(`[ArmorIQ diagnostic] Capturing plan for ${mcp}.${action}`);
  const plan = await client.capturePlan(
    process.env.GROQ_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini",
    "Read the current workspace overview for a harmless integration diagnostic.",
    { goal: "Read workspace overview", steps: [{ mcp, action, params }] },
  );
  console.log("[ArmorIQ diagnostic] capturePlan: OK");

  const token = await client.getIntentToken(plan, undefined, 300);
  console.log("[ArmorIQ diagnostic] getIntentToken: OK");

  const result = await client.invoke(mcp, action, token, params);
  console.log(`[ArmorIQ diagnostic] invoke: ${result?.status || "returned"}`);
  console.log(`[ArmorIQ diagnostic] verified: ${Boolean(result?.verified)}`);
  console.log(`[ArmorIQ diagnostic] result present: ${result?.result != null}`);
} catch (error) {
  console.error("[ArmorIQ diagnostic] FAILED");
  console.error(`name: ${error?.name || "Error"}`);
  console.error(`message: ${String(error?.message || error)}`);
  console.error(`httpStatus: ${error?.statusCode || error?.response?.status || "unknown"}`);
  if (error?.response?.data) {
    console.error(`response: ${JSON.stringify(error.response.data)}`);
  }
  process.exitCode = 1;
} finally {
  client?.close?.();
  await mongoose.disconnect().catch(() => {});
}
