import { createHash, randomUUID, webcrypto } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

// expo-crypto is native; Node's own crypto stands in for it here.
vi.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: { SHA1: "SHA-1", SHA256: "SHA-256", SHA384: "SHA-384", SHA512: "SHA-512" },
  randomUUID: () => randomUUID(),
  getRandomValues: (array: Uint8Array<ArrayBuffer>) => webcrypto.getRandomValues(array),
  digest: async (algorithm: string, data: Uint8Array) => {
    const bytes = createHash(algorithm.replace("-", "").toLowerCase()).update(data).digest();
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  },
}));

// Like Hermes: no Web Crypto at all before the polyfill runs.
vi.stubGlobal("crypto", undefined);
await import("./polyfills");
const phoneCrypto = globalThis.crypto as unknown as { subtle: { digest: (algorithm: string | { name: string }, data: Uint8Array) => Promise<ArrayBuffer> } };

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("crypto polyfill", () => {
  it("gives supabase-js a SHA-256 digest, so PKCE links use S256 instead of plain", async () => {
    const verifier = new TextEncoder().encode("a-code-verifier");
    const hash = await phoneCrypto.subtle.digest("SHA-256", verifier);
    expect(Buffer.from(hash).toString("hex")).toBe(createHash("sha256").update("a-code-verifier").digest("hex"));
    expect((await phoneCrypto.subtle.digest({ name: "sha-256" }, verifier)).byteLength).toBe(32);
  });

  it("refuses an algorithm the phone cannot hash", async () => {
    await expect(phoneCrypto.subtle.digest("SHA-3", new Uint8Array())).rejects.toThrow("Unsupported digest algorithm");
  });

  it("provides randomUUID", () => {
    expect((globalThis.crypto as unknown as { randomUUID: () => string }).randomUUID()).toMatch(/^[0-9a-f-]{36}$/);
  });
});
