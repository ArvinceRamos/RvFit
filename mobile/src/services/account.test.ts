import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "~/test/fake-supabase";

const fake = vi.hoisted(() => ({ current: null as ReturnType<typeof fakeSupabase> | null }));
vi.mock("~/lib/supabase", () => ({
  get supabase() {
    return fake.current!.client;
  },
}));
vi.mock("~/lib/env", () => ({ env: { webUrl: "https://app.test", supabaseUrl: "", supabaseAnonKey: "", googleAuthEnabled: false } }));
vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

import { deleteAccount, saveDisplayName, saveWeighIn } from "./account";

const noWeighIn = { weight: "81.4", waist: "", chest: "", hips: "" };

describe("account services", () => {
  beforeEach(() => {
    fake.current = fakeSupabase();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("deletes through the web endpoint with the session token, then clears the session on this phone", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: "deleted" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await deleteAccount()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("https://app.test/api/account", { method: "DELETE", headers: { Authorization: "Bearer token-1" } });
    expect(fake.current!.client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("keeps the session when the server fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 500 })));
    expect(await deleteAccount()).toEqual({ ok: false, error: "Your account could not be deleted. Nothing was removed. Please try again." });
    expect(fake.current!.client.auth.signOut).not.toHaveBeenCalled();
  });

  it("says so when the token is not accepted", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    expect(await deleteAccount()).toEqual({ ok: false, error: "You must be signed in to delete your account." });
  });

  it("gives a connection message when the request cannot be sent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Network request failed");
      }),
    );
    const result = await deleteAccount();
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain("Check your connection");
  });

  it("does not call the server when signed out", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    fake.current!.signedOut();
    expect(await deleteAccount()).toEqual({ ok: false, error: "You must be signed in to delete your account." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates a weigh-in in the chosen units before saving", async () => {
    expect(await saveWeighIn(noWeighIn, "stone")).toEqual({ ok: false, error: "Choose metric or imperial units." });
    fake.current!.onTable("body_logs", { data: null, error: null });
    expect(await saveWeighIn(noWeighIn, "metric")).toEqual({ ok: true });
    const insert = fake.current!.calls.find((call) => call.table === "body_logs" && call.method === "insert");
    expect(insert?.args[0]).toMatchObject({ user_id: "user-1", weight_kg: 81.4 });
  });

  it("rejects a name that is too long", async () => {
    const result = await saveDisplayName("x".repeat(80));
    expect(result.ok).toBe(false);
    expect(fake.current!.client.auth.updateUser).not.toHaveBeenCalled();
  });
});
