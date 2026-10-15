import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { mcpSchemas, executeTool } from "./tool.service.js";
export function createMcpServer() {
    const server = new McpServer({ name: "operiq-mcp", version: "1.0.0" });
    for (const [name, schema] of Object.entries(mcpSchemas))
        server.tool(
            name,
            `OperIQ operation: ${name}`,
            schema.shape,
            async (params) => {
                const startedAt = Date.now();
                console.info("[MCP tool]", JSON.stringify({ name, stage: "started" }));
                try {
                    const result = await executeTool(name, params);
                    console.info("[MCP tool]", JSON.stringify({
                        name,
                        stage: "completed",
                        durationMs: Date.now() - startedAt,
                    }));
                    return {
                        content: [
                        {
                            type: "text",
                            text: JSON.stringify(result),
                        },
                        ],
                    };
                } catch (e) {
                    console.error("[MCP tool]", JSON.stringify({
                        name,
                        stage: "failed",
                        durationMs: Date.now() - startedAt,
                        error: String(e?.message || e),
                    }));
                    return {
                        isError: true,
                        content: [{ type: "text", text: e.message }],
                    };
                }
            },
        );
    return server;
}
