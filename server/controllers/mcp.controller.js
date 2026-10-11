import { timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../services/mcp.service.js";

const matches = (actual, expected) => {
  const first = Buffer.from(actual || "");
  const second = Buffer.from(expected || "");
  return first.length === second.length && timingSafeEqual(first, second);
};

export async function handleMcp(req, res) {
  if (!process.env.MCP_SHARED_SECRET || !matches(req.headers.authorization, `Bearer ${process.env.MCP_SHARED_SECRET}`))
    return res.status(401).json({ error: "MCP authentication required" });

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  return transport.handleRequest(req, res, req.body);
}
