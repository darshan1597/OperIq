import { randomUUID, timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "../services/mcp.service.js";

const matches = (actual, expected) => {
  const first = Buffer.from(actual || "");
  const second = Buffer.from(expected || "");
  return first.length === second.length && timingSafeEqual(first, second);
};

const normalizeArmorIqMessage = (message) => {
  if (!message || typeof message !== "object" || Array.isArray(message) || !("_iam_context" in message))
    return message;
  const { _iam_context: _ignored, ...standardMessage } = message;
  return standardMessage;
};

export async function handleMcp(req, res) {
  const traceId = randomUUID();
  const startedAt = Date.now();
  const body = req.body;
  const rpcMessages = Array.isArray(body) ? body : [body];
  const methods = rpcMessages.filter(Boolean).map((message) => message.method || "response");
  const toolNames = rpcMessages
    .filter((message) => message?.method === "tools/call")
    .map((message) => message.params?.name)
    .filter(Boolean);
  const messageShapes = rpcMessages.filter(Boolean).map((message) => ({
    jsonrpc: message.jsonrpc ?? null,
    idType: message.id === null ? "null" : typeof message.id,
    hasId: Object.hasOwn(message, "id"),
    method: message.method || null,
    topLevelKeys: Object.keys(message).sort(),
    paramKeys: message.params && typeof message.params === "object"
      ? Object.keys(message.params).sort()
      : [],
    argumentType: Array.isArray(message.params?.arguments)
      ? "array"
      : typeof message.params?.arguments,
  }));
  const ingress = {
    traceId,
    httpMethod: req.method,
    path: req.originalUrl,
    contentType: req.headers["content-type"] || null,
    accept: req.headers.accept || null,
    protocolVersion: req.headers["mcp-protocol-version"] || null,
    userAgent: req.headers["user-agent"] || null,
    bodyKind: Array.isArray(body) ? "batch" : typeof body,
    methods,
    toolNames,
    messageShapes,
  };
  console.info("[MCP ingress]", JSON.stringify(ingress));

  const normalizedBody = Array.isArray(body)
    ? body.map(normalizeArmorIqMessage)
    : normalizeArmorIqMessage(body);
  if (normalizedBody !== body)
    console.info("[MCP compatibility]", JSON.stringify({
      traceId,
      removedTopLevelFields: ["_iam_context"],
    }));

  res.on("finish", () => {
    console.info("[MCP egress]", JSON.stringify({
      traceId,
      status: res.statusCode,
      contentType: res.getHeader("content-type") || null,
      durationMs: Date.now() - startedAt,
    }));
  });

  if (!process.env.MCP_SHARED_SECRET || !matches(req.headers.authorization, `Bearer ${process.env.MCP_SHARED_SECRET}`))
    return res.status(401).json({ error: "MCP authentication required" });

  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);

  try {
    return await transport.handleRequest(req, res, normalizedBody);
  } catch (error) {
    console.error("[MCP transport error]", JSON.stringify({
      traceId,
      name: error?.name || "Error",
      message: String(error?.message || error),
    }));
    if (!res.headersSent)
      return res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "MCP transport failed" }, id: body?.id ?? null });
    return undefined;
  }
}
