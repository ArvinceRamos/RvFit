import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

import { GET } from "./route";

type Reply = Response | Error;

// Answers the Auth health check and the keepalive call with the given replies.
function mockSupabase(auth: Reply, database: Reply) {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const reply = String(url).endsWith("/auth/v1/health") ? auth : database;
    if (reply instanceof Error) throw reply;
    return reply;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const ok = () => new Response(JSON.stringify({}), { status: 200 });
const one = () => new Response("1", { status: 200, headers: { "Content-Type": "application/json" } });

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("is ok when Auth answers and keepalive returns 1", async () => {
    const fetchMock = mockSupabase(ok(), one());
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchMock).toHaveBeenCalledWith("http://supabase.test/rest/v1/rpc/keepalive", expect.objectContaining({
      headers: { apikey: "anon-key" },
      cache: "no-store",
    }));
  });

  it("is degraded when the database check fails", async () => {
    mockSupabase(ok(), new Response("{}", { status: 404 }));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded" });
  });

  it("is degraded when keepalive answers something other than 1", async () => {
    mockSupabase(ok(), new Response("0", { status: 200 }));
    expect((await GET()).status).toBe(503);
  });

  it("is degraded when Auth fails", async () => {
    mockSupabase(new Response("{}", { status: 500 }), one());
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "degraded" });
  });

  it("is down when Supabase does not answer", async () => {
    mockSupabase(ok(), new Error("timeout"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "down" });
  });
});
