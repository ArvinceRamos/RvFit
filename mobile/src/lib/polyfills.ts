import * as ExpoCrypto from "expo-crypto";

// The shared web code calls crypto.randomUUID() for draft and save keys (src/lib/guest-draft.ts,
// the workout save key). Hermes has no Web Crypto, so the same functions come from expo-crypto,
// which uses the phone's secure random source.
type CryptoLike = { randomUUID?: () => string; getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T };
const target = globalThis as unknown as { crypto?: CryptoLike };
target.crypto ??= {};
target.crypto.randomUUID ??= () => ExpoCrypto.randomUUID();
target.crypto.getRandomValues ??= ((array: ArrayBufferView) => ExpoCrypto.getRandomValues(array as Uint8Array)) as CryptoLike["getRandomValues"];
