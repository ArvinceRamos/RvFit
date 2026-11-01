import * as ExpoCrypto from "expo-crypto";

// The shared web code calls crypto.randomUUID() for draft and save keys (src/lib/guest-draft.ts,
// the workout save key). Hermes has no Web Crypto, so the same functions come from expo-crypto,
// which uses the phone's secure random source.
type CryptoLike = {
  randomUUID?: () => string;
  getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
  subtle?: { digest: (algorithm: string | { name: string }, data: BufferSource) => Promise<ArrayBuffer> };
};
const target = globalThis as unknown as { crypto?: CryptoLike };
target.crypto ??= {};
target.crypto.randomUUID ??= () => ExpoCrypto.randomUUID();
target.crypto.getRandomValues ??= ((array: ArrayBufferView) => ExpoCrypto.getRandomValues(array as Uint8Array)) as CryptoLike["getRandomValues"];

// supabase-js hashes the PKCE code verifier with crypto.subtle.digest. Without it, it warns
// ("WebCrypto API is not supported") and sends the verifier itself as the challenge ("plain").
// Only digest is needed, so only digest is provided.
const digestAlgorithms = new Set<string>(Object.values(ExpoCrypto.CryptoDigestAlgorithm));
target.crypto.subtle ??= {
  digest: (algorithm, data) => {
    const name = (typeof algorithm === "string" ? algorithm : algorithm.name).toUpperCase();
    if (!digestAlgorithms.has(name)) return Promise.reject(new Error(`Unsupported digest algorithm: ${name}`));
    return ExpoCrypto.digest(name as ExpoCrypto.CryptoDigestAlgorithm, data);
  },
};
