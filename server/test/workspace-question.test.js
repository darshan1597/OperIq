import test from "node:test";
import assert from "node:assert/strict";
import { answerKnownWorkspaceFact, isWorkspaceActionRequest } from "../services/workspace-question.service.js";

test("workspace counts and status questions remain read-only", () => {
  assert.equal(isWorkspaceActionRequest("How many managers are present?"), false);
  assert.equal(isWorkspaceActionRequest("Which staff members are unavailable?"), false);
  assert.equal(isWorkspaceActionRequest("How many approvals are pending?"), false);
});

test("workspace mutations are sent to the governed workflow", () => {
  assert.equal(isWorkspaceActionRequest("Invite alice@example.com as manager"), true);
  assert.equal(isWorkspaceActionRequest("Reschedule tomorrow's booking"), true);
  assert.equal(isWorkspaceActionRequest("Draft a customer follow-up"), true);
});

test("team role counts are deterministic across staff and access membership", () => {
  const state = {
    staff: [
      { id: "s1", email: "one@example.com" },
      { id: "s2", email: "two@example.com" },
      { id: "s3", email: "reception@example.com" },
    ],
  };
  const members = [
    { email: "owner@example.com", role: "owner" },
    { email: "manager@example.com", role: "manager" },
    { email: "reception@example.com", role: "receptionist" },
  ];
  assert.match(answerKnownWorkspaceFact("How many staffs are present?", state, members), /2 staff members/);
  assert.match(answerKnownWorkspaceFact("How many managers are present?", state, members), /1 manager/);
  assert.match(answerKnownWorkspaceFact("How many receptionists are present?", state, members), /1 receptionist/);
});
