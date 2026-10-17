import bcrypt from "bcryptjs";
import { z } from "zod";
import { acceptInvitationToken, createUser, createWorkspaceMember, findInvitationByToken, findUserByEmail, findUserById, updateUserProfile } from "../services/store.service.js";
import { verifyGoogleToken } from "../config/firebase.js";
import { signToken } from "../utils/token.js";
import { publicUser } from "../utils/public-user.js";
import { createChangedPasswordHash } from "../services/account-password.service.js";

export async function register(req, res) {
  const input = z.object({
    name: z.string().trim().min(2).max(80),
    businessName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(200),
    password: z.string().min(8).max(128),
  }).parse(req.body);

  if (await findUserByEmail(input.email))
    return res.status(409).json({ error: "An account with this email already exists" });

  const user = await createUser({ ...input, passwordHash: await bcrypt.hash(input.password, 12) });
  return res.status(201).json({ token: signToken(user), user: publicUser(user) });
}

export async function login(req, res) {
  const input = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(128),
  }).parse(req.body);
  const user = await findUserByEmail(input.email);
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
    return res.status(401).json({ error: "Email or password is incorrect" });
  return res.json({ token: signToken(user), user: publicUser(user) });
}

export async function googleLogin(req, res) {
  const { idToken, businessName } = z.object({
    idToken: z.string().min(20),
    businessName: z.string().trim().min(2).max(100).optional(),
  }).parse(req.body);
  const identity = await verifyGoogleToken(idToken);
  if (!identity.email || identity.email_verified === false)
    return res.status(401).json({ error: "Google did not provide a verified email" });
  let user = await findUserByEmail(identity.email);
  if (!user)
    user = await createUser({
      name: identity.name || identity.email.split("@")[0],
      email: identity.email,
      businessName: businessName || `${identity.name || "My"}’s Workspace`,
    });
  return res.json({ token: signToken(user), user: publicUser(user) });
}

export async function currentUser(req, res) {
  const user = await findUserById(req.user.accountId);
  if (!user) return res.status(401).json({ error: "Account no longer exists" });
  return res.json({ user: publicUser(user) });
}

export async function changePassword(req, res) {
  const input = z.object({
    currentPassword: z.string().max(128).optional().default(""),
    newPassword: z.string().min(8, "Password must contain at least 8 characters").max(128),
  }).parse(req.body);
  const user = await findUserById(req.user.accountId);
  if (!user) return res.status(401).json({ error: "Account no longer exists" });
  const hadPassword = Boolean(user.passwordHash);
  const passwordHash = await createChangedPasswordHash(user, input);
  await updateUserProfile(req.user.accountId, { passwordHash });
  return res.json({
    message: hadPassword ? "Password changed successfully" : "Password set successfully",
    hasPassword: true,
  });
}

export async function invitationDetails(req, res) {
  const record = await findInvitationByToken(req.params.token);
  if (!record || record.invitation.status !== "Pending" || (record.invitation.expiresAt && new Date(record.invitation.expiresAt) <= new Date()))
    throw Object.assign(Error("This invitation is invalid or has expired"), { status: 404 });
  return res.json({
    invitation: {
      email: record.invitation.email,
      role: record.invitation.role,
      businessName: record.businessName,
    },
  });
}

export async function acceptInvitation(req, res) {
  const input = z.object({
    name: z.string().trim().min(2).max(80),
    password: z.string().min(8).max(128),
  }).parse(req.body);
  const record = await findInvitationByToken(req.params.token);
  if (!record || record.invitation.status !== "Pending" || (record.invitation.expiresAt && new Date(record.invitation.expiresAt) <= new Date()))
    throw Object.assign(Error("This invitation is invalid or has expired"), { status: 404 });
  const user = await createWorkspaceMember({
    workspaceId: record.workspaceId,
    businessName: record.businessName,
    name: input.name,
    email: record.invitation.email,
    role: record.invitation.role,
    passwordHash: await bcrypt.hash(input.password, 12),
  });
  await acceptInvitationToken(record.workspaceId, req.params.token, String(user._id), input.name);
  return res.status(201).json({ token: signToken(user), user: publicUser(user) });
}
