import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import connectDb from "./config/db.js";
import { createMcpServer } from "./services/mcp.service.js";
import { initStore } from "./services/store.service.js";

await connectDb();
await initStore();
await createMcpServer().connect(new StdioServerTransport());
