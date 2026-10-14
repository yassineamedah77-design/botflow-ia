import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { env } from "@/server/env";

/** URL-safe random token with `bytes` bits of entropy × 8. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/*
 * Secret encryption (integration credentials, OAuth tokens).
 *
 * AES-256-GCM, a fresh 96-bit IV per value, authenticated with a 128-bit tag.
 * Format: `v1.<keyId>.<base64url(iv | tag | ciphertext)>`. The key id (first
 * 8 hex chars of the key's SHA-256) lets a value encrypted with the previous
 * key still be decrypted during a rotation (ENCRYPTION_KEY_PREVIOUS).
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const FORMAT_VERSION = "v1";

export interface EncryptionKey {
  id: string;
  key: Buffer;
}

export function encryptionKeyFromBase64(base64: string): EncryptionKey {
  const key = Buffer.from(base64, "base64");
  if (key.length !== 32) {
    throw new Error("Encryption keys must be 32 bytes");
  }
  return { id: createHash("sha256").update(key).digest("hex").slice(0, 8), key };
}

function configuredKeys(): EncryptionKey[] {
  const config = env();
  const keys = [encryptionKeyFromBase64(config.ENCRYPTION_KEY)];
  if (config.ENCRYPTION_KEY_PREVIOUS) {
    keys.push(encryptionKeyFromBase64(config.ENCRYPTION_KEY_PREVIOUS));
  }
  return keys;
}

export function encryptSecret(plaintext: string, keys: EncryptionKey[] = configuredKeys()): string {
  const [current] = keys;
  if (!current) throw new Error("No encryption key configured");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, current.key, iv, { authTagLength: TAG_LENGTH });
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const payload = Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
  return `${FORMAT_VERSION}.${current.id}.${payload}`;
}

export function decryptSecret(value: string, keys: EncryptionKey[] = configuredKeys()): string {
  const [version, keyId, payload] = value.split(".");
  if (version !== FORMAT_VERSION || !keyId || !payload) {
    throw new Error("Unsupported encrypted secret format");
  }
  const match = keys.find((candidate) => candidate.id === keyId);
  if (!match) {
    throw new Error(`No encryption key available for key id ${keyId}`);
  }
  const raw = Buffer.from(payload, "base64url");
  const iv = raw.subarray(0, IV_LENGTH);
  const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, match.key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
