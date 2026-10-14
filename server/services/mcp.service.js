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
                try {
                    return {
                        content: [
                        {
                            type: "text",
                            text: JSON.stringify(await executeTool(name, params)),
                        },
                        ],
                    };
                } catch (e) {
                    return {
                        isError: true,
                        content: [{ type: "text", text: e.message }],
                    };
                }
            },
        );
    return server;
}
