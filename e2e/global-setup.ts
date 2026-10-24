import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { adminClient, newTestUser, saveTestUser } from "./test-user";

// Creates a confirmed user and saves a first target through the same database function the app uses,
// so the signed-in pages open straight away.
export default async function globalSetup(): Promise<void> {
  const admin = adminClient();
  const { email, password } = newTestUser();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`Could not create the e2e user: ${error?.message}`);
  saveTestUser({ id: data.user.id, email, password });

  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw new Error(`Could not sign in the e2e user: ${signIn.error.message}`);

  const { data: saved, error: saveError } = await client.rpc("save_initial_guest_draft", {
    p_user_id: data.user.id,
    p_guest_draft_id: randomUUID(),
    p_profile: { preferred_units: "metric", adult_confirmed_at: new Date().toISOString() },
    p_target: {
      source: "manual", target_kcal: 2000, goal: null, pace: null, protein_g: 120, carbs_g: 230, fat_g: 67,
      fiber_g: 28, formula_branch: null, floor_applied: false, config_version: "e2e", calculation_inputs: { weight_kg: 75 },
    },
    p_initial_body_log: { weight_kg: 75 },
  });
  if (saveError || saved?.status !== "saved") throw new Error(`Could not save the e2e target: ${saveError?.message}`);

  // A training plan, so Train has a "log this day" link.
  const { error: preferencesError } = await client
    .from("user_preferences")
    .insert({ user_id: data.user.id, experience: "beginner", equipment: "gym", training_days: 3 });
  if (preferencesError) throw new Error(`Could not save the e2e preferences: ${preferencesError.message}`);
}
