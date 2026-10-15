import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import GovernanceJobModel from "../models/governance-job.model.js";
import { listPlatformWorkspaces, mutate } from "./store.service.js";

export const holdRuntimeId = randomUUID();
const usesMongo = () => Boolean(process.env.MONGODB_URI);
const terminal = new Set(["Completed", "Rejected", "Expired", "Failed"]);
const leaseMs = 45_000;
const intervalReleaseDelay = () => Math.max(5_000, Number(process.env.HOLD_RECOVERY_INTERVAL_MS) || 15_000);

function encryptionKey() {
  const secret = process.env.GOVERNANCE_JOB_SECRET || process.env.JWT_SECRET;
  if (!secret) throw Error("JWT_SECRET or GOVERNANCE_JOB_SECRET is required for durable Hold recovery");
  return createHash("sha256").update(secret).digest();
}

export function encryptIntentToken(token) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(token), "utf8"), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptIntentToken(envelope) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return JSON.parse(Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8"));
}

export async function persistDurableHold({ authority, step, delegationId }) {
  const job = {
    delegationId,
    workspaceId: String(authority.workspaceId),
    requestId: authority.requestId,
    status: "Pending",
    action: step.action,
    agent: step.agent,
    mcp: authority.mcp,
    agentId: authority.agentId,
    userEmail: authority.userEmail,
    params: structuredClone(step.params || {}),
    tokenEnvelope: encryptIntentToken(authority.token),
    tokenExpiresAt: new Date(authority.token.expiresAt * 1000),
    runtimeId: holdRuntimeId,
    leaseUntil: new Date(Date.now() + leaseMs),
    attempts: 0,
  };
  if (usesMongo()) {
    await GovernanceJobModel.updateOne(
      { delegationId },
      { $setOnInsert: job },
      { upsert: true },
    );
  } else {
    await mutate(job.workspaceId, (state) => {
      state.governanceJobs ||= [];
      if (!state.governanceJobs.some((item) => item.delegationId === delegationId)) {
        const now = new Date().toISOString();
        state.governanceJobs.push({ ...job, createdAt: now, updatedAt: now });
      }
    });
  }
  return job;
}

export async function heartbeatDurableHold(delegationId) {
  const leaseUntil = new Date(Date.now() + leaseMs);
  if (usesMongo()) {
    await GovernanceJobModel.updateOne(
      { delegationId, status: "Pending", runtimeId: holdRuntimeId },
      { $set: { leaseUntil, updatedAt: new Date() } },
    );
    return;
  }
  const workspaces = await listPlatformWorkspaces();
  const owner = workspaces.find(({ data }) => data.governanceJobs?.some((item) => item.delegationId === delegationId));
  if (!owner) return;
  await mutate(owner.workspaceId, (state) => {
    const job = state.governanceJobs?.find((item) => item.delegationId === delegationId);
    if (job?.status === "Pending" && job.runtimeId === holdRuntimeId)
      Object.assign(job, { leaseUntil: leaseUntil.toISOString(), updatedAt: new Date().toISOString() });
  });
}

export async function settleDurableHold(delegationId, status, lastError = "") {
  if (!delegationId || !terminal.has(status)) return;
  const changes = { status, lastError, completedAt: new Date(), updatedAt: new Date() };
  if (usesMongo()) {
    await GovernanceJobModel.updateOne(
      { delegationId, status: { $nin: ["Completed"] } },
      { $set: changes },
    );
    return;
  }
  const workspaces = await listPlatformWorkspaces();
  const owner = workspaces.find(({ data }) => data.governanceJobs?.some((item) => item.delegationId === delegationId));
  if (!owner) return;
  await mutate(owner.workspaceId, (state) => {
    const job = state.governanceJobs?.find((item) => item.delegationId === delegationId);
    if (job && job.status !== "Completed") Object.assign(job, changes, { completedAt: changes.completedAt.toISOString(), updatedAt: changes.updatedAt.toISOString() });
  });
}

export async function claimRecoverableHolds() {
  if (usesMongo()) {
    const candidates = await GovernanceJobModel.find({
      status: { $in: ["Pending", "Recovering"] },
      runtimeId: { $ne: holdRuntimeId },
      $or: [{ leaseUntil: { $lte: new Date() } }, { leaseUntil: { $exists: false } }],
    }).sort({ createdAt: 1 }).limit(25).lean();
    const claimed = [];
    for (const candidate of candidates) {
      const job = await GovernanceJobModel.findOneAndUpdate(
        {
          _id: candidate._id,
          status: { $in: ["Pending", "Recovering"] },
          runtimeId: { $ne: holdRuntimeId },
          $or: [{ leaseUntil: { $lte: new Date() } }, { leaseUntil: { $exists: false } }],
        },
        { $set: { status: "Recovering", runtimeId: holdRuntimeId, leaseUntil: new Date(Date.now() + leaseMs), updatedAt: new Date() }, $inc: { attempts: 1 } },
        { new: true },
      ).lean();
      if (job) claimed.push(job);
    }
    return claimed;
  }
  const claimed = [];
  for (const { workspaceId, data } of await listPlatformWorkspaces()) {
    for (const candidate of data.governanceJobs || []) {
      if (!["Pending", "Recovering"].includes(candidate.status) || candidate.runtimeId === holdRuntimeId || Date.parse(candidate.leaseUntil || 0) > Date.now()) continue;
      await mutate(workspaceId, (state) => {
        const job = state.governanceJobs.find((item) => item.delegationId === candidate.delegationId);
        if (["Pending", "Recovering"].includes(job?.status) && job.runtimeId !== holdRuntimeId) Object.assign(job, { status: "Recovering", runtimeId: holdRuntimeId, leaseUntil: new Date(Date.now() + leaseMs).toISOString(), attempts: (job.attempts || 0) + 1, updatedAt: new Date().toISOString() });
      });
      claimed.push({ ...candidate, workspaceId, status: "Recovering", runtimeId: holdRuntimeId });
    }
  }
  return claimed;
}

export async function releaseDurableHold(job, error = "") {
  const changes = { status: "Pending", runtimeId: "", leaseUntil: new Date(Date.now() + intervalReleaseDelay()), lastError: error, updatedAt: new Date() };
  if (usesMongo()) {
    await GovernanceJobModel.updateOne({ delegationId: job.delegationId, status: "Recovering" }, { $set: changes });
    return;
  }
  await mutate(job.workspaceId, (state) => {
    const stored = state.governanceJobs?.find((item) => item.delegationId === job.delegationId);
    if (stored?.status === "Recovering") Object.assign(stored, changes, { updatedAt: changes.updatedAt.toISOString() });
  });
}
