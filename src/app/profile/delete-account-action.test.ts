import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked clients only. These tests never touch a real account.
const getUser = vi.fn();
const signOut = vi.fn();
const deleteUser = vi.fn();
const createAdminClient = vi.fn(() => ({ auth: { admin: { deleteUser } } }));
const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT ${url}`);
});

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser, signOut } }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => createAdminClient() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

const { deleteAccountAction } = await import("./delete-account-action");

const userId = "11111111-2222-4333-8444-555555555555";

beforeEach(() => {
  vi.clearAllMocks();
  signOut.mockResolvedValue({ error: null });
  deleteUser.mockResolvedValue({ data: {}, error: null });
});

describe("deleteAccountAction", () => {
  it("refuses a signed-out caller and never creates the admin client", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await deleteAccountAction()).toEqual({ ok: false, error: "You must be signed in to delete your account." });
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("refuses when the session cannot be verified", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid JWT" } });
    expect(await deleteAccountAction()).toMatchObject({ ok: false });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes only the verified user, signs out locally, and goes home", async () => {
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    await expect(deleteAccountAction()).rejects.toThrow("REDIRECT /?account=deleted");
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith(userId);
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("ignores any user id passed from the browser", async () => {
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    const callWithExtra = deleteAccountAction as unknown as (id: string) => Promise<unknown>;
    await expect(callWithExtra("99999999-9999-4999-8999-999999999999")).rejects.toThrow("REDIRECT");
    expect(deleteUser).toHaveBeenCalledWith(userId);
  });

  it("keeps the session and reports an error when deletion fails", async () => {
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    deleteUser.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await deleteAccountAction()).toEqual({ ok: false, error: "Your account could not be deleted. Nothing was removed. Please try again." });
    expect(signOut).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("reports an error when the admin settings are missing", async () => {
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    createAdminClient.mockImplementationOnce(() => {
      throw new Error("The server is missing its Supabase admin settings.");
    });
    expect(await deleteAccountAction()).toMatchObject({ ok: false });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("still goes home if clearing the session fails after the account is gone", async () => {
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    signOut.mockRejectedValue(new Error("network"));
    await expect(deleteAccountAction()).rejects.toThrow("REDIRECT /?account=deleted");
  });
});
