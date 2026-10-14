import { AsyncLocalStorage } from "node:async_hooks";

const context = new AsyncLocalStorage();
const requests = new Map();
const ttlMs = 5 * 60_000;

function clean() {
  const cutoff = Date.now() - ttlMs;
  for (const [id, record] of requests) if (record.updatedAt < cutoff) requests.delete(id);
}

export function progressMiddleware(req, res, next) {
  if (req.path.startsWith("/api/progress/")) return next();
  const id = String(req.get("X-OperIQ-Request-ID") || "").trim();
  if (!id) return next();
  clean();
  requests.set(id, { id, done: false, stages: [{ label: "Request received by OperIQ", at: new Date().toISOString() }], updatedAt: Date.now() });
  res.on("finish", () => {
    const record = requests.get(id);
    if (!record) return;
    if (!record.stages.some((stage) => stage.label === "Response returned to the application"))
      record.stages.push({ label: "Response returned to the application", at: new Date().toISOString() });
    record.done = true;
    record.ok = res.statusCode < 400;
    record.updatedAt = Date.now();
  });
  context.run({ id }, next);
}

export function reportProgress(label, detail) {
  const id = context.getStore()?.id;
  const record = id && requests.get(id);
  if (!record || record.stages.at(-1)?.label === label) return;
  record.stages.push({ label, ...(detail ? { detail } : {}), at: new Date().toISOString() });
  record.updatedAt = Date.now();
}

export function getProgress(id) {
  clean();
  return requests.get(id) || null;
}
