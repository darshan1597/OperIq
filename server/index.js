import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import connectDb from "./config/db.js";
import authRouter from "./routes/auth.routes.js";
import mcpRouter from "./routes/mcp.routes.js";
import workspaceRouter from "./routes/workspace.routes.js";
import publicRouter from "./routes/public.routes.js";
import adminRouter from "./routes/admin.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { integrationStatus } from "./services/governance.service.js";
import { initStore, storageMode } from "./services/store.service.js";
import { progressMiddleware } from "./services/request-progress.service.js";
import { readProgress } from "./controllers/progress.controller.js";

const app = express();
const port = process.env.PORT || 4000;

await connectDb();
await initStore();

app.use(express.json({ limit: "3mb" }));
app.use(progressMiddleware);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/progress/:id", readProgress);
app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);
app.use("/api/admin", adminRouter);
app.use("/api", workspaceRouter);
app.use("/mcp", mcpRouter);

const adminDist = resolve(process.cwd(), "../admin/dist");
if (existsSync(adminDist)) {
  app.use("/admin", express.static(adminDist));
  app.get("/admin/*", (_req, res) => res.sendFile(resolve(adminDist, "index.html")));
}

const clientDist = resolve(process.cwd(), "../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(resolve(clientDist, "index.html")));
}

app.use(errorHandler);

app.listen(port, "127.0.0.1", () => {
  console.log(`OperIQ API: http://127.0.0.1:${port} (${integrationStatus().mode}; ${storageMode()})`);
});
