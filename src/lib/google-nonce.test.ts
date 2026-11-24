import { describe, expect, it } from "vitest";
import { createGoogleNonce, hashGoogleNonce } from "./google-nonce";

describe("Google Identity nonce", () => {
  it("creates a unique 256-bit nonce", () => {
    const first = createGoogleNonce();
    const second = createGoogleNonce();

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toMatch(/^[0-9a-f]{64}$/);
    expect(second).not.toBe(first);
  });

  it("hashes the raw nonce as SHA-256 hex for Google", async () => {
    await expect(hashGoogleNonce("nonce")).resolves.toBe(
      "78377b525757b494427f89014f97d79928f3938d14eb51e20fb5dec9834eb304",
    );
  });
});
