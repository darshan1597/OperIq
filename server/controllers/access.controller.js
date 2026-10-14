import { z } from "zod";
import {
  listWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMember,
} from "../services/store.service.js";
import { publicUser } from "../utils/public-user.js";

const role = z.enum(["manager", "receptionist", "staff"]);

export async function getMembers(req, res) {
  const members = await listWorkspaceMembers(req.user.id);
  return res.json({ members: members.map(publicUser) });
}

export async function updateMember(req, res) {
  const input = z.object({ role }).parse(req.body);
  const member = await updateWorkspaceMember(req.user.id, req.params.id, input);
  return res.json({ member: publicUser(member) });
}

export async function deleteMember(req, res) {
  await removeWorkspaceMember(req.user.id, req.params.id);
  return res.status(204).end();
}
