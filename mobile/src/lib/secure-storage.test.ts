import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => new Map<string, string>());
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
  // Like the real store, a value over about 2 KB is refused.
  setItemAsync: vi.fn(async (key: string, value: string) => {
    if (value.length > 2048) throw new Error("too large");
    store.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    store.delete(key);
  }),
}));

import { secureStorage } from "./secure-storage";

describe("secureStorage", () => {
  beforeEach(() => store.clear());

  it("stores a large session in chunks and reads it back whole", async () => {
    const session = JSON.stringify({ access_token: "a".repeat(5000), refresh_token: "r" });
    await secureStorage.setItem("sb-127-auth-token", session);
    expect([...store.keys()].filter((key) => key.endsWith(".count"))).toEqual(["sb-127-auth-token.count"]);
    expect(await secureStorage.getItem("sb-127-auth-token")).toBe(session);
  });

  it("removes every chunk, and a shorter value leaves no stale chunks", async () => {
    await secureStorage.setItem("key", "x".repeat(4000));
    await secureStorage.setItem("key", "short");
    expect(await secureStorage.getItem("key")).toBe("short");
    expect(store.has("key.1")).toBe(false);
    await secureStorage.removeItem("key");
    expect(store.size).toBe(0);
    expect(await secureStorage.getItem("key")).toBeNull();
  });

  it("treats a value with a missing chunk as gone", async () => {
    await secureStorage.setItem("key", "y".repeat(4000));
    store.delete("key.1");
    expect(await secureStorage.getItem("key")).toBeNull();
  });

  it("keeps keys to the characters SecureStore allows", async () => {
    await secureStorage.setItem("sb:auth/token", "v");
    expect([...store.keys()].every((key) => /^[A-Za-z0-9._-]+$/.test(key))).toBe(true);
    expect(await secureStorage.getItem("sb:auth/token")).toBe("v");
  });
});
