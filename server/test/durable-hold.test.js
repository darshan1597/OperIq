import assert from "node:assert/strict";
import test from "node:test";
import { decryptIntentToken, encryptIntentToken } from "../services/durable-hold.service.js";

test("durable Hold intent tokens are encrypted and recoverable", () => {
  const previous = process.env.GOVERNANCE_JOB_SECRET;
  process.env.GOVERNANCE_JOB_SECRET = "test-governance-secret-with-enough-entropy";
  try {
    const token = {
      tokenId: "intent-1",
      planHash: "hash",
      expiresAt: Math.floor(Date.now() / 1000) + 1800,
      rawToken: { signature: "private-token-material" },
    };
    const envelope = encryptIntentToken(token);
    assert.equal(JSON.stringify(envelope).includes("private-token-material"), false);
    assert.deepEqual(decryptIntentToken(envelope), token);
  } finally {
    if (previous === undefined) delete process.env.GOVERNANCE_JOB_SECRET;
    else process.env.GOVERNANCE_JOB_SECRET = previous;
  }
});

test("tampered durable Hold tokens cannot be decrypted", () => {
  const previous = process.env.GOVERNANCE_JOB_SECRET;
  process.env.GOVERNANCE_JOB_SECRET = "test-governance-secret-with-enough-entropy";
  try {
    const envelope = encryptIntentToken({ tokenId: "intent-2" });
    envelope.ciphertext = `${envelope.ciphertext.slice(0, -2)}AA`;
    assert.throws(() => decryptIntentToken(envelope));
  } finally {
    if (previous === undefined) delete process.env.GOVERNANCE_JOB_SECRET;
    else process.env.GOVERNANCE_JOB_SECRET = previous;
  }
});
