import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const deleteUser = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("@/lib/log", () => ({ logError: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn(() => ({ auth: { getUser } })) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({ auth: { admin: { deleteUser } } })) }));

import { DELETE } from "./route";

function request(authorization?: string) {
  return new Request("http://app.test/api/account", { method: "DELETE", headers: authorization ? { authorization } : {} });
}

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    getUser.mockReset();
    deleteUser.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("refuses a request without a bearer token and deletes nothing", async () => {
    const response = await DELETE(request());
    expect(response.status).toBe(401);
    expect(getUser).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("refuses a malformed authorization header", async () => {
    const response = await DELETE(request("Basic abc"));
    expect(response.status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("refuses a token Supabase Auth does not accept", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid JWT" } });
    const response = await DELETE(request("Bearer bad.token.value"));
    expect(response.status).toBe(401);
    expect(getUser).toHaveBeenCalledWith("bad.token.value");
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes only the user the token belongs to", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    deleteUser.mockResolvedValue({ error: null });
    const response = await DELETE(request("Bearer good.token.value"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "deleted" });
    expect(deleteUser).toHaveBeenCalledWith("user-1");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("reports a failure when the admin delete fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    deleteUser.mockResolvedValue({ error: { message: "boom" } });
    const response = await DELETE(request("Bearer good.token.value"));
    expect(response.status).toBe(500);
  });

  it("reports a failure when the admin client throws", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    deleteUser.mockRejectedValue(new Error("missing key"));
    const response = await DELETE(request("Bearer good.token.value"));
    expect(response.status).toBe(500);
  });
});
