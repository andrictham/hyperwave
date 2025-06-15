import { CompactEncrypt, compactDecrypt } from "jose";

/**
 * Derives a 256-bit secret key from the provided secret string.
 * Throws if the secret is missing or shorter than 32 bytes.
 */
function deriveSecret(secret: string): Uint8Array {
  if (!secret) throw new Error("Encryption secret missing");
  const data = new TextEncoder().encode(secret);
  if (data.length < 32) {
    throw new Error("Encryption secret must be at least 32 bytes");
  }
  return data.slice(0, 32);
}

/**
 * Encrypt an API key using AES-256-GCM.
 *
 * @param apiKey - The plaintext API key to encrypt.
 * @param secret - Application secret used for encryption.
 * @returns The encrypted JWE string.
 */
export async function encryptApiKey(apiKey: string, secret: string): Promise<string> {
  const key = deriveSecret(secret);
  return new CompactEncrypt(new TextEncoder().encode(apiKey))
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(key);
}

/**
 * Decrypt an encrypted API key.
 *
 * @param encrypted - The encrypted JWE string.
 * @param secret - Application secret used for encryption.
 * @returns The decrypted API key.
 */
export async function decryptApiKey(encrypted: string, secret: string): Promise<string> {
  const key = deriveSecret(secret);
  const { plaintext } = await compactDecrypt(encrypted, key);
  return new TextDecoder().decode(plaintext);
}
