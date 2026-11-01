import { validateActivityKey, validateActivityMinutes, validateSleep, validateSteps } from "@/lib/activity/inputs";
import { isCalendarDate, isUuid } from "@/lib/meal";
import { logError } from "@/lib/log";
import { supabase } from "~/lib/supabase";
import { currentUserId, type ActionResult } from "./session";

// Mobile versions of the activity actions in src/app/dashboard/actions.ts.

type DayFields = { steps: number } | { sleep_minutes: number };

// One row per user and local date. Only the field being saved is sent, so steps keep the day's sleep.
async function saveDay(userId: string, date: string, fields: DayFields, scope: string): Promise<boolean> {
  const { error } = await supabase
    .from("daily_activity")
    .upsert({ user_id: userId, on_date: date, ...fields, updated_at: new Date().toISOString() }, { onConflict: "user_id,on_date" });
  if (error) {
    logError(scope, error);
    return false;
  }
  return true;
}

export async function saveSteps(date: string, steps: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be signed in to save steps." };
  if (!isCalendarDate(date)) return { ok: false, error: "Steps details are invalid." };
  const validated = validateSteps(steps);
  if (!validated.ok) return validated;
  if (!(await saveDay(userId, date, { steps: validated.data }, "activity.saveSteps"))) return { ok: false, error: "Your steps could not be saved. Please try again." };
  return { ok: true };
}

// Sleep last night is saved on today's local date, the day the user woke up.
export async function saveSleep(date: string, hours: string, minutes: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be signed in to save sleep." };
  if (!isCalendarDate(date)) return { ok: false, error: "Sleep details are invalid." };
  const validated = validateSleep(hours, minutes);
  if (!validated.ok) return validated;
  if (!(await saveDay(userId, date, { sleep_minutes: validated.data }, "activity.saveSleep"))) return { ok: false, error: "Your sleep could not be saved. Please try again." };
  return { ok: true };
}

export async function addActivity(date: string, activityKey: unknown, minutes: string): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be signed in to add an activity." };
  if (!isCalendarDate(date)) return { ok: false, error: "Activity details are invalid." };
  const key = validateActivityKey(activityKey);
  if (!key.ok) return key;
  const validated = validateActivityMinutes(minutes);
  if (!validated.ok) return validated;
  const { error } = await supabase.from("activity_logs").insert({ user_id: userId, performed_on: date, activity_key: key.data, minutes: validated.data });
  if (error) {
    logError("activity.add", error);
    return { ok: false, error: "Your activity could not be saved. Please try again." };
  }
  return { ok: true };
}

export async function deleteActivity(activityId: unknown): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be signed in to delete an activity." };
  if (!isUuid(activityId)) return { ok: false, error: "Activity details are invalid." };
  const { data, error } = await supabase.from("activity_logs").delete().eq("id", activityId).eq("user_id", userId).select("id");
  if (error) {
    logError("activity.delete", error);
    return { ok: false, error: "The activity could not be deleted. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Activity not found." };
  return { ok: true };
}
