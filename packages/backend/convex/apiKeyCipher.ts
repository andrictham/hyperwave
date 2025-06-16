import { CompactEncrypt, compactDecrypt, base64url } from "jose";

/**
 * Derives a 256-bit secret key from the provided base64url-encoded string.
 *
 * The {@link ENCRYPTION_SECRET} environment variable must be a base64url
 * encoded 32 byte value. This helper decodes the secret and ensures the
 * resulting byte array is exactly 32 bytes long.
 *
 * @param secret - Base64url encoded secret value.
 * @throws If the secret is missing or does not decode to 32 bytes.
 */
function deriveSecret(secret: string): Uint8Array {
  if (!secret) throw new Error("Encryption secret missing");
  let decoded: Uint8Array;
  try {
    decoded = base64url.decode(secret);
  } catch {
    throw new Error("Encryption secret must be base64url encoded");
  }
  if (decoded.length !== 32) {
    throw new Error("Encryption secret must decode to 32 bytes");
  }
  return decoded;
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
