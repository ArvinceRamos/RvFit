const nonceBytes = 32;

/** Creates an opaque, URL-safe nonce for a single Google Identity button mount. */
export function createGoogleNonce(): string {
  const bytes = new Uint8Array(nonceBytes);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Google receives the SHA-256 digest, while Supabase receives the original value. */
export async function hashGoogleNonce(nonce: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
