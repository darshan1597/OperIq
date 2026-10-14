import test from "node:test";
import assert from "node:assert/strict";
import { verifyAccessRecipients } from "../services/agent.service.js";

const plan = (members) => ({
  steps: [{ action: "prepare_member_invites", params: { members } }],
});

test("access plans must preserve every requested email and explicit role", () => {
  const goal = "Invite exact@example.com as Manager\nand second@example.com as Staff";
  assert.doesNotThrow(() => verifyAccessRecipients(goal, plan([
    { email: "exact@example.com", role: "manager" },
    { email: "second@example.com", role: "staff" },
  ])));
  assert.throws(() => verifyAccessRecipients(goal, plan([
    { email: "changed@example.com", role: "manager" },
    { email: "second@example.com", role: "staff" },
  ])), /changed or omitted/);
  assert.throws(() => verifyAccessRecipients(goal, plan([
    { email: "exact@example.com", role: "staff" },
    { email: "second@example.com", role: "staff" },
  ])), /changed the requested role/);
});

test("access plans cannot bypass the owner proposal step", () => {
  assert.throws(() => verifyAccessRecipients("Invite exact@example.com as Staff", {
    steps: [{
      action: "create_and_send_member_invites",
      params: { members: [{ email: "exact@example.com", role: "staff" }] },
    }],
  }), /owner approval proposal/);
});

test("read-only team access plans do not require an invitation proposal", () => {
  assert.doesNotThrow(() => verifyAccessRecipients("Show me the current team access", {
    steps: [{ action: "read_team_access", params: {} }],
  }));
});
