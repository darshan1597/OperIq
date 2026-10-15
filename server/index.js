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
import { startHoldRecoveryWorker } from "./services/hold-recovery.worker.js";

const app = express();
const port = process.env.PORT || 4000;
const host = process.env.HOST || "0.0.0.0";
const allowedOrigins = new Set(
  String(process.env.CORS_ORIGINS || process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean),
);

await connectDb();
await initStore();
startHoldRecoveryWorker();

app.use((req, res, next) => {
  const origin = String(req.headers.origin || "").replace(/\/$/, "");
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-OperIQ-Request-ID");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS")
    return allowedOrigins.has(origin) ? res.sendStatus(204) : res.sendStatus(403);
  next();
});
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

app.listen(port, host, () => {
  console.log(`OperIQ API listening on ${host}:${port} (${integrationStatus().mode}; ${storageMode()})`);
});
