import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { createChangedPasswordHash } from "../services/account-password.service.js";
import { publicUser } from "../utils/public-user.js";

test("Google-created accounts can set their first password without a current password", async () => {
  const hash = await createChangedPasswordHash(
    { passwordHash: "" },
    { newPassword: "new-password-123" },
  );
  assert.equal(await bcrypt.compare("new-password-123", hash), true);
});

test("accounts with a password must provide the correct current password", async () => {
  const passwordHash = await bcrypt.hash("current-password", 4);
  await assert.rejects(
    createChangedPasswordHash(
      { passwordHash },
      { currentPassword: "wrong-password", newPassword: "new-password-123" },
    ),
    (error) => error.status === 401 && /incorrect/i.test(error.message),
  );
  const changed = await createChangedPasswordHash(
    { passwordHash },
    { currentPassword: "current-password", newPassword: "new-password-123" },
  );
  assert.equal(await bcrypt.compare("new-password-123", changed), true);
});

test("public account data exposes password availability without exposing its hash", () => {
  const user = publicUser({
    _id: "account-1",
    name: "Owner",
    email: "owner@example.com",
    businessName: "Studio",
    passwordHash: "private-hash",
  });
  assert.equal(user.hasPassword, true);
  assert.equal("passwordHash" in user, false);
});
