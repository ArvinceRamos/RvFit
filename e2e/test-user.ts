import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

// One throwaway user per run. Its password only lives in this git-ignored file until teardown.
const statePath = path.join(process.cwd(), "e2e", ".auth", "user.json");

export type TestUser = { id: string; email: string; password: string };

// The admin key can create and delete any user, so it is only ever used against local Supabase.
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const host = URL.canParse(url) ? new URL(url).hostname : "";
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("The e2e tests only run against local Supabase (NEXT_PUBLIC_SUPABASE_URL on 127.0.0.1).");
  }
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing from .env.local.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function newTestUser(): Omit<TestUser, "id"> {
  const tag = randomBytes(6).toString("hex");
  return { email: `e2e-${tag}@rvfit.test`, password: randomBytes(18).toString("base64url") };
}

export function saveTestUser(user: TestUser): void {
  mkdirSync(path.dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(user));
}

export function readTestUser(): TestUser {
  return JSON.parse(readFileSync(statePath, "utf8")) as TestUser;
}

export function forgetTestUser(): void {
  rmSync(statePath, { force: true });
}
