"use server";

import { refresh } from "next/cache";
import { calculationConfig } from "@/lib/calc/config";
import { isUuid } from "@/lib/meal";
import { loadChartWeighIns } from "@/lib/overview-data";
import type { ChartPoint } from "@/lib/progress-data";
import { getActionUser } from "@/lib/supabase/auth";
import { logError } from "@/lib/log";
import { isChartRangeKey, rangeStart } from "@/lib/weight-chart";

export type WeightChartResult = { ok: true; points: ChartPoint[] } | { ok: false; error: string };

// Weigh-ins for one chart range, newest first, in kg. Capped by chart_max_weigh_ins.
// The page renders the first range on the server; this loads the others when the user picks one.
export async function loadWeightChartAction(range: unknown): Promise<WeightChartResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in." };
  if (!isChartRangeKey(range)) return { ok: false, error: "Choose a valid range." };

  const points = await loadChartWeighIns(auth.supabase, rangeStart(range, Date.now()), calculationConfig.progress.chart_max_weigh_ins);
  if (!points) {
    logError("progress.loadChart", null);
    return { ok: false, error: "Your weight chart could not be loaded. Please try again." };
  }
  return { ok: true, points };
}

export type DeleteWeighInResult = { ok: true } | { ok: false; error: string };

// Row-level security limits the delete to the user's own weigh-ins.
export async function deleteWeighInAction(weighInId: unknown): Promise<DeleteWeighInResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in to delete a weigh-in." };
  const { supabase } = auth;
  if (!isUuid(weighInId)) return { ok: false, error: "Weigh-in details are invalid." };

  const { data, error } = await supabase.from("body_logs").delete().eq("id", weighInId).select("id");
  if (error) {
    logError("progress.deleteWeighIn", error);
    return { ok: false, error: "The weigh-in could not be deleted. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Weigh-in not found." };
  refresh();
  return { ok: true };
}
