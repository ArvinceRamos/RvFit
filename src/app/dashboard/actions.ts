"use server";

import { refresh } from "next/cache";
import { validateActivityKey, validateActivityMinutes, validateSleep, validateSteps } from "@/lib/activity/inputs";
import { isCalendarDate, isUuid } from "@/lib/meal";
import { getActionUser } from "@/lib/supabase/auth";
import { logError } from "@/lib/log";

export type SaveDailyActivityResult = { ok: true } | { ok: false; error: string };

type DayFields = { steps: number } | { sleep_minutes: number };

// One row per user and local date. The upsert sends only the field being saved, so saving steps keeps
// the day's sleep and the other way round. There is no updated_at trigger, so it is sent here.
async function saveDay(
  auth: NonNullable<Awaited<ReturnType<typeof getActionUser>>>,
  date: string,
  fields: DayFields,
  scope: string,
): Promise<boolean> {
  const { error } = await auth.supabase
    .from("daily_activity")
    .upsert({ user_id: auth.user.id, on_date: date, ...fields, updated_at: new Date().toISOString() }, { onConflict: "user_id,on_date" });
  if (error) {
    logError(scope, error);
    return false;
  }
  // Today shows the saved value and the Burned today card counts the new steps.
  refresh();
  return true;
}

// date is the browser's local date, as for meals and workouts. Saving again replaces the day's steps.
export async function saveStepsAction(date: unknown, steps: unknown): Promise<SaveDailyActivityResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in to save steps." };
  if (typeof date !== "string" || !isCalendarDate(date) || typeof steps !== "string") return { ok: false, error: "Steps details are invalid." };

  const validated = validateSteps(steps);
  if (!validated.ok) return validated;
  if (!(await saveDay(auth, date, { steps: validated.data }, "activity.saveSteps"))) {
    return { ok: false, error: "Your steps could not be saved. Please try again." };
  }
  return { ok: true };
}

// Sleep last night is saved on today's local date, the day the user woke up. Saving again replaces it.
export async function saveSleepAction(date: unknown, hours: unknown, minutes: unknown): Promise<SaveDailyActivityResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in to save sleep." };
  if (typeof date !== "string" || !isCalendarDate(date) || typeof hours !== "string" || typeof minutes !== "string") {
    return { ok: false, error: "Sleep details are invalid." };
  }

  const validated = validateSleep(hours, minutes);
  if (!validated.ok) return validated;
  if (!(await saveDay(auth, date, { sleep_minutes: validated.data }, "activity.saveSleep"))) {
    return { ok: false, error: "Your sleep could not be saved. Please try again." };
  }
  return { ok: true };
}

export type ActivityLogResult = { ok: true } | { ok: false; error: string };

// Adds one Other activity entry on the browser's local date. The key is checked against the config list,
// so an unknown or walking key is refused here as well as by the form.
export async function addActivityAction(date: unknown, activityKey: unknown, minutes: unknown): Promise<ActivityLogResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in to add an activity." };
  if (typeof date !== "string" || !isCalendarDate(date) || typeof minutes !== "string") return { ok: false, error: "Activity details are invalid." };

  const key = validateActivityKey(activityKey);
  if (!key.ok) return key;
  const validated = validateActivityMinutes(minutes);
  if (!validated.ok) return validated;

  const { error } = await auth.supabase
    .from("activity_logs")
    .insert({ user_id: auth.user.id, performed_on: date, activity_key: key.data, minutes: validated.data });
  if (error) {
    logError("activity.add", error);
    return { ok: false, error: "Your activity could not be saved. Please try again." };
  }
  // Today lists the entry and the Burned today card counts it.
  refresh();
  return { ok: true };
}

// Deletes one of the caller's own entries. The user_id filter and row-level security both limit it to their rows.
export async function deleteActivityAction(activityId: unknown): Promise<ActivityLogResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in to delete an activity." };
  if (!isUuid(activityId)) return { ok: false, error: "Activity details are invalid." };

  const { data, error } = await auth.supabase.from("activity_logs").delete().eq("id", activityId).eq("user_id", auth.user.id).select("id");
  if (error) {
    logError("activity.delete", error);
    return { ok: false, error: "The activity could not be deleted. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Activity not found." };
  refresh();
  return { ok: true };
}
