import { describe, it, expect, afterEach } from "vitest";

// Set encryption key before importing module
const TEST_KEY = "12345678901234567890123456789012"; // exactly 32 chars
process.env.ENCRYPTION_KEY = TEST_KEY;

import { encrypt, decrypt } from "../utils/encryption";

describe("encryption utility", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it("should encrypt and decrypt a string correctly", () => {
    const plaintext = "my-api-key";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("should produce different ciphertext for same input (random IV)", () => {
    const plaintext = "my-api-key";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("should both encrypt and decrypt round-trip correctly", () => {
    expect(decrypt(encrypt("my-api-key"))).toBe("my-api-key");
  });

  it("should handle long strings", () => {
    const longString = "a".repeat(100);
    const encrypted = encrypt(longString);
    expect(decrypt(encrypted)).toBe(longString);
  });

  it("should handle special characters", () => {
    const special = "key-with-special!@#$%^&*()_+=";
    expect(decrypt(encrypt(special))).toBe(special);
  });

  it("should produce output in iv:ciphertext hex format", () => {
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(2);
    // IV is 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // Both parts should be valid hex
    expect(parts[0]).toMatch(/^[0-9a-f]+$/);
    expect(parts[1]).toMatch(/^[0-9a-f]+$/);
  });

  it("should throw if ENCRYPTION_KEY is missing", () => {
    process.env.ENCRYPTION_KEY = "";
    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be exactly 32 characters",
    );
  });

  it("should throw if ENCRYPTION_KEY is wrong length", () => {
    process.env.ENCRYPTION_KEY = "short";
    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be exactly 32 characters",
    );
  });

  it("should throw on invalid ciphertext format", () => {
    expect(() => decrypt("invalid")).toThrow("Invalid ciphertext format");
  });
});
