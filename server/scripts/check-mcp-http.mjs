import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import mongoose from "mongoose";
import connectDb from "../config/db.js";
import { findPublishedWorkspaceRecordBySlug } from "../services/store.service.js";

const endpoint = process.argv[2];
if (!endpoint) {
  console.error("Usage: node --env-file-if-exists=.env scripts/check-mcp-http.mjs <https://host/mcp>");
  process.exit(2);
}

if (!process.env.MCP_SHARED_SECRET) {
  console.error("MCP_SHARED_SECRET is required in the environment.");
  process.exit(2);
}

const client = new Client({ name: "operiq-mcp-diagnostic", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(new URL(endpoint), {
  requestInit: {
    headers: { Authorization: `Bearer ${process.env.MCP_SHARED_SECRET}` },
  },
});

try {
  await connectDb();
  const workspace = await findPublishedWorkspaceRecordBySlug(process.argv[3] || "evergreen-studio");
  if (!workspace) throw new Error("Published diagnostic workspace was not found");

  console.log(`[MCP diagnostic] Connecting to ${endpoint}`);
  await client.connect(transport);
  console.log("[MCP diagnostic] initialize: OK");

  const listed = await client.listTools();
  const toolNames = listed.tools.map(({ name }) => name);
  console.log(`[MCP diagnostic] tools/list: OK (${toolNames.length} tools)`);

  if (!toolNames.includes("read_workspace")) {
    throw new Error("read_workspace was not returned by tools/list");
  }

  const result = await client.callTool({
    name: "read_workspace",
    arguments: { workspaceId: workspace.workspaceId },
  });
  console.log(`[MCP diagnostic] tools/call read_workspace: ${result.isError ? "TOOL ERROR" : "OK"}`);
  console.log(`[MCP diagnostic] response content blocks: ${result.content?.length || 0}`);
} catch (error) {
  console.error("[MCP diagnostic] FAILED");
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
  await mongoose.disconnect().catch(() => {});
}
