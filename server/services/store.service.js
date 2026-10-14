import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import UserModel from "../models/user.model.js";
import WorkspaceModel from "../models/workspace.model.js";
import { createWorkspace } from "../utils/create-workspace.js";

const file = resolve(process.cwd(), ".local/state.json");
let database = { version: 2, users: [], workspaces: {} };
const queues = new Map();
const usesMongo = () => Boolean(process.env.MONGODB_URI);

export async function initStore() {
  if (!usesMongo()) {
    try {
      const parsed = JSON.parse(await readFile(file, "utf8"));
      if (parsed?.version === 2) database = parsed;
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    await persistLocal();
  }
}

async function persistLocal() {
  await mkdir(resolve(process.cwd(), ".local"), { recursive: true });
  const temp = `${file}.tmp`;
  await writeFile(temp, JSON.stringify(database, null, 2));
  await rename(temp, file);
}

export const storageMode = () =>
  usesMongo() ? "MongoDB" : "Local sandbox file";

export async function findUserByEmail(email) {
  const value = email.trim().toLowerCase();
  return usesMongo()
    ? UserModel.findOne({ email: value }).lean()
    : database.users.find((user) => user.email === value) || null;
}

export async function findUserById(id) {
  return usesMongo()
    ? UserModel.findById(id).lean()
    : database.users.find((user) => user._id === id) || null;
}

export async function updateUserProfile(id, changes) {
  if (usesMongo()) {
    const user = await UserModel.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true }).lean();
    if (!user) throw Object.assign(Error("Account not found"), { status: 404 });
    return user;
  }
  const user = database.users.find((item) => item._id === id);
  if (!user) throw Object.assign(Error("Account not found"), { status: 404 });
  if (changes.email && database.users.some((item) => item._id !== id && item.email === changes.email))
    throw Object.assign(Error("An account with this email already exists"), { status: 409 });
  Object.assign(user, changes);
  await persistLocal();
  return structuredClone(user);
}

export async function createUser({
  name,
  email,
  passwordHash = "",
  businessName,
}) {
  const userData = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash,
    businessName: businessName.trim(),
    role: "owner",
    createdAt: new Date().toISOString(),
  };

  const workspace = createWorkspace({
    businessName: userData.businessName,
    ownerName: userData.name,
  });

  if (usesMongo()) {
    const user = await UserModel.create(userData);
    try {
      await WorkspaceModel.create({ userId: user._id, data: workspace });
    } catch (error) {
      await UserModel.deleteOne({ _id: user._id });
      throw error;
    }
    return user.toObject();
  }

  const user = { _id: randomUUID(), ...userData };
  if (await findUserByEmail(user.email))
    throw Object.assign(Error("An account with this email already exists"), {
      status: 409,
    });
  database.users.push(user);
  database.workspaces[user._id] = workspace;
  await persistLocal();
  return user;
}

export async function createWorkspaceMember({ workspaceId, name, email, passwordHash, role, businessName }) {
  const value = email.trim().toLowerCase();
  if (await findUserByEmail(value))
    throw Object.assign(Error("An account with this email already exists"), { status: 409 });
  const userData = {
    name: name.trim(),
    email: value,
    passwordHash,
    businessName: businessName.trim(),
    workspaceId,
    role,
    createdAt: new Date().toISOString(),
  };
  if (usesMongo()) return (await UserModel.create(userData)).toObject();
  const user = { _id: randomUUID(), ...userData };
  database.users.push(user);
  await persistLocal();
  return structuredClone(user);
}

export async function listWorkspaceMembers(workspaceId) {
  if (usesMongo())
    return UserModel.find({ $or: [{ _id: workspaceId }, { workspaceId }] })
      .sort({ createdAt: 1 })
      .lean();
  return database.users
    .filter((user) => user._id === workspaceId || user.workspaceId === workspaceId)
    .map((user) => structuredClone(user));
}

export async function updateWorkspaceMember(workspaceId, memberId, changes) {
  if (String(workspaceId) === String(memberId))
    throw Object.assign(Error("The workspace owner role cannot be changed"), { status: 422 });
  if (usesMongo()) {
    const member = await UserModel.findOneAndUpdate(
      { _id: memberId, workspaceId },
      { $set: changes },
      { new: true, runValidators: true },
    ).lean();
    if (!member) throw Object.assign(Error("Workspace member not found"), { status: 404 });
    return member;
  }
  const member = database.users.find((user) => user._id === memberId && user.workspaceId === workspaceId);
  if (!member) throw Object.assign(Error("Workspace member not found"), { status: 404 });
  Object.assign(member, changes);
  await persistLocal();
  return structuredClone(member);
}

export async function removeWorkspaceMember(workspaceId, memberId) {
  if (String(workspaceId) === String(memberId))
    throw Object.assign(Error("The workspace owner cannot be removed"), { status: 422 });
  if (usesMongo()) {
    const result = await UserModel.deleteOne({ _id: memberId, workspaceId });
    if (!result.deletedCount) throw Object.assign(Error("Workspace member not found"), { status: 404 });
    return;
  }
  const index = database.users.findIndex((user) => user._id === memberId && user.workspaceId === workspaceId);
  if (index < 0) throw Object.assign(Error("Workspace member not found"), { status: 404 });
  database.users.splice(index, 1);
  await persistLocal();
}

export async function snapshot(workspaceId) {
  if (!workspaceId) throw Error("Workspace identity is required");
  const data = usesMongo()
    ? (await WorkspaceModel.findOne({ userId: workspaceId }).lean())?.data
    : database.workspaces[workspaceId];
  if (!data) throw Object.assign(Error("Workspace not found"), { status: 404 });
  return structuredClone(data);
}

export async function findPublishedWorkspaceBySlug(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return null;
  if (usesMongo()) {
    const row = await WorkspaceModel.findOne({
      "data.aiProfile.slug": normalized,
      "data.aiProfile.status": "published",
      "data.aiProfile.platformStatus": { $ne: "paused" },
    }).lean();
    return row?.data ? structuredClone(row.data) : null;
  }
  const value = Object.values(database.workspaces).find(
    (workspace) =>
      workspace.aiProfile?.slug === normalized &&
      workspace.aiProfile?.status === "published" &&
      workspace.aiProfile?.platformStatus !== "paused",
  );
  return value ? structuredClone(value) : null;
}

export async function findWorkspaceBySlug(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return null;
  if (usesMongo()) {
    const row = await WorkspaceModel.findOne({
      "data.aiProfile.slug": normalized,
    }).lean();
    return row?.data ? structuredClone(row.data) : null;
  }
  const value = Object.values(database.workspaces).find(
    (workspace) => workspace.aiProfile?.slug === normalized,
  );
  return value ? structuredClone(value) : null;
}

export async function findPublishedWorkspaceRecordBySlug(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (usesMongo()) {
    const row = await WorkspaceModel.findOne({ "data.aiProfile.slug": normalized, "data.aiProfile.status": "published", "data.aiProfile.platformStatus": { $ne: "paused" } }).lean();
    return row ? { workspaceId: String(row.userId), data: structuredClone(row.data) } : null;
  }
  const row = Object.entries(database.workspaces).find(([, value]) => value.aiProfile?.slug === normalized && value.aiProfile?.status === "published" && value.aiProfile?.platformStatus !== "paused");
  return row ? { workspaceId: row[0], data: structuredClone(row[1]) } : null;
}

export async function listPlatformWorkspaces() {
  if (usesMongo()) {
    const rows = await WorkspaceModel.find({}).lean();
    return rows.map((row) => ({
      workspaceId: String(row.userId),
      data: structuredClone(row.data),
    }));
  }
  return Object.entries(database.workspaces).map(([workspaceId, data]) => ({
    workspaceId,
    data: structuredClone(data),
  }));
}

export async function findInvitationByToken(token) {
  if (usesMongo()) {
    const row = await WorkspaceModel.findOne({ "data.invitations.token": token }).lean();
    const invitation = row?.data?.invitations?.find((item) => item.token === token);
    return invitation ? { workspaceId: String(row.userId), businessName: row.data.business.name, invitation: structuredClone(invitation) } : null;
  }
  for (const [workspaceId, data] of Object.entries(database.workspaces)) {
    const invitation = data.invitations?.find((item) => item.token === token);
    if (invitation) return { workspaceId, businessName: data.business.name, invitation: structuredClone(invitation) };
  }
  return null;
}

export async function acceptInvitationToken(workspaceId, token, accountId) {
  return mutate(workspaceId, (state) => {
    const invitation = state.invitations?.find((item) => item.token === token);
    if (!invitation || invitation.status !== "Pending")
      throw Object.assign(Error("This invitation is no longer available"), { status: 410 });
    invitation.status = "Accepted";
    invitation.accountId = accountId;
    invitation.acceptedAt = new Date().toISOString();
    delete invitation.token;
    return invitation;
  });
}

export async function slugBelongsToAnotherWorkspace(slug, workspaceId) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (usesMongo())
    return Boolean(
      await WorkspaceModel.exists({
        userId: { $ne: workspaceId },
        "data.aiProfile.slug": normalized,
      }),
    );
  return Object.entries(database.workspaces).some(
    ([id, workspace]) => id !== workspaceId && workspace.aiProfile?.slug === normalized,
  );
}

async function save(workspaceId, data) {
  if (usesMongo())
    await WorkspaceModel.updateOne(
      { userId: workspaceId },
      { $set: { data }, $setOnInsert: { userId: workspaceId } },
      { upsert: true },
    );
  else {
    database.workspaces[workspaceId] = data;
    await persistLocal();
  }
}
export function mutate(workspaceId, fn) {
  const previous = queues.get(workspaceId) || Promise.resolve();
  const task = previous.then(async () => {
    const current = await snapshot(workspaceId);
    const result = await fn(current);
    await save(workspaceId, current);
    return result;
  });
  queues.set(
    workspaceId,
    task.catch(() => {}),
  );
  return task;
}
