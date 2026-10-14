import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { hashPassword, needsRehash, verifyPassword } from "@/server/auth/password";
import { isWellFormedSessionToken, sessionIdFromToken } from "@/server/auth/sessions";
import {
  constantTimeEqual,
  decryptSecret,
  encryptionKeyFromBase64,
  encryptSecret,
  generateToken,
  sha256Hex,
} from "@/server/security/crypto";
import { windowStartFor } from "@/server/security/rate-limit";
import { clientIpFromHeaders } from "@/server/security/request";

const newKey = () => encryptionKeyFromBase64(randomBytes(32).toString("base64"));

describe("secret encryption (AES-256-GCM)", () => {
  it("round-trips a secret", () => {
    const key = newKey();
    const encrypted = encryptSecret("EAAG-whatsapp-access-token", [key]);
    expect(encrypted).toMatch(/^v1\.[0-9a-f]{8}\./);
    expect(encrypted).not.toContain("whatsapp");
    expect(decryptSecret(encrypted, [key])).toBe("EAAG-whatsapp-access-token");
  });

  it("uses a fresh IV for every value", () => {
    const key = newKey();
    expect(encryptSecret("same", [key])).not.toBe(encryptSecret("same", [key]));
  });

  it("detects tampering", () => {
    const key = newKey();
    const encrypted = encryptSecret("secret", [key]);
    const [version, id, payload] = encrypted.split(".");
    const bytes = Buffer.from(payload!, "base64url");
    bytes[bytes.length - 1]! ^= 0xff;
    expect(() => decryptSecret(`${version}.${id}.${bytes.toString("base64url")}`, [key])).toThrow();
  });

  it("decrypts values from the previous key during a rotation", () => {
    const previous = newKey();
    const current = newKey();
    const legacy = encryptSecret("old token", [previous]);
    expect(decryptSecret(legacy, [current, previous])).toBe("old token");
    expect(() => decryptSecret(legacy, [current])).toThrow(/No encryption key/);
  });

  it("rejects keys that are not 32 bytes", () => {
    expect(() => encryptionKeyFromBase64(randomBytes(16).toString("base64"))).toThrow();
  });
});

describe("tokens and hashing", () => {
  it("generates 256-bit URL-safe tokens", () => {
    const token = generateToken(32);
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(isWellFormedSessionToken(token)).toBe(true);
    expect(generateToken(32)).not.toBe(token);
  });

  it("stores sessions by SHA-256 of the token", () => {
    const token = generateToken(32);
    expect(sessionIdFromToken(token)).toBe(sha256Hex(token));
    expect(sessionIdFromToken(token)).toHaveLength(64);
    expect(isWellFormedSessionToken("short")).toBe(false);
    expect(isWellFormedSessionToken(`${token.slice(0, 42)}!`)).toBe(false);
  });

  it("compares secrets in constant time", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });
});

describe("password hashing (argon2id)", () => {
  it("verifies the right password only", async () => {
    const hash = await hashPassword("une phrase de passe solide");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "une phrase de passe solide")).toBe(true);
    expect(await verifyPassword(hash, "une phrase de passe fausse")).toBe(false);
  });

  it("treats a malformed stored hash as a failed verification", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });

  it("flags hashes created with weaker parameters for upgrade", async () => {
    const current = await hashPassword("phrase");
    expect(needsRehash(current)).toBe(false);
    const { hash } = await import("@node-rs/argon2");
    const weak = await hash("phrase", { memoryCost: 4096, timeCost: 1, parallelism: 1 });
    expect(needsRehash(weak)).toBe(true);
    expect(needsRehash("garbage")).toBe(true);
  });
});

describe("rate limit windows", () => {
  it("aligns windows on their size", () => {
    const start = windowStartFor(new Date("2026-10-02T10:07:31Z"), 15 * 60);
    expect(start.toISOString()).toBe("2026-10-02T10:00:00.000Z");
    expect(windowStartFor(new Date("2026-10-02T10:15:00Z"), 15 * 60).toISOString()).toBe("2026-10-02T10:15:00.000Z");
  });
});

describe("client IP extraction", () => {
  it("reads the first forwarded address behind a trusted proxy", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    expect(clientIpFromHeaders(headers, true)).toBe("203.0.113.7");
  });

  it("ignores forwarded headers when the proxy is not trusted", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.7" }), false)).toBeNull();
  });

  it("rejects values that are not IP addresses", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "<script>" }), true)).toBeNull();
    expect(clientIpFromHeaders(new Headers({ "x-real-ip": "2001:db8::1" }), true)).toBe("2001:db8::1");
  });
});
