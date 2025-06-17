import { expect, test } from "vitest";

import { base64url } from "jose";

import { decryptApiKey, encryptApiKey } from "./apiKeyCipher";

const SECRET = base64url.encode(new Uint8Array(32).fill(1));

test("encrypts and decrypts", async () => {
  const apiKey = "test-key";
  const encrypted = await encryptApiKey(apiKey, SECRET);
  const decrypted = await decryptApiKey(encrypted, SECRET);
  expect(decrypted).toBe(apiKey);
});

test("fails with wrong secret", async () => {
  const apiKey = "another-key";
  const encrypted = await encryptApiKey(apiKey, SECRET);
  await expect(decryptApiKey(encrypted, "x".repeat(32))).rejects.toThrow();
});
