"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePreferencesAction } from "@/app/preferences/actions";
import { foodRoles, roleLabels, stateLabels, type FoodRole, type PreparationState } from "@/lib/food-catalog";
import {
  allergenNotice,
  dietTagLabels,
  equipmentLabels,
  equipmentOptions,
  experienceLabels,
  experiences,
  trainingDayOptions,
  type DietTag,
  type Equipment,
  type Experience,
} from "@/lib/preferences";

export type AvoidableFood = { id: string; name: string; role: FoodRole; preparation_state: PreparationState };

export type PreferencesFormValues = {
  allergyTags: DietTag[];
  avoidedFoodIds: string[];
  experience: Experience;
  equipment: Equipment;
  trainingDays: number;
};

const savedMessage = "Preferences saved.";

export function PreferencesForm({ initial, offeredTags, foods }: {
  initial: PreferencesFormValues;
  offeredTags: DietTag[];
  foods: AvoidableFood[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<PreferencesFormValues>(initial);
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const dayOptions = trainingDayOptions(values.experience);

  function toggle<T extends string>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((existing) => existing !== item) : [...list, item];
  }

  function changeExperience(experience: Experience) {
    const maxDays = Math.max(...trainingDayOptions(experience));
    setValues((current) => ({ ...current, experience, trainingDays: Math.min(current.trainingDays, maxDays) }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(undefined);
    const result = await savePreferencesAction(values);
    setSaving(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(savedMessage);
    router.refresh();
  }

  return (
    <form className="mt-6 grid gap-8" onSubmit={submit}>
      <fieldset>
        <legend className="text-xl font-bold">Allergies</legend>
        <p className="mt-2 text-sm text-zinc-700">{allergenNotice}</p>
        {offeredTags.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-700">No allergy options are available yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {offeredTags.map((tag) => (
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" key={tag}>
                <input
                  checked={values.allergyTags.includes(tag)}
                  onChange={() => setValues((current) => ({ ...current, allergyTags: toggle(current.allergyTags, tag) }))}
                  type="checkbox"
                />
                {dietTagLabels[tag]}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend className="text-xl font-bold">Foods to avoid</legend>
        <p className="mt-2 text-sm text-zinc-700">These foods will not be suggested. This is separate from allergies.</p>
        <div className="mt-3 grid gap-2">
          {foodRoles.map((role) => {
            const roleFoods = foods.filter((food) => food.role === role);
            if (roleFoods.length === 0) return null;
            const selectedCount = roleFoods.filter((food) => values.avoidedFoodIds.includes(food.id)).length;
            return (
              <details className="rounded-lg border border-zinc-200 bg-white" key={role}>
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                  {roleLabels[role]} ({selectedCount} selected)
                </summary>
                <ul className="grid gap-1 border-t border-zinc-200 px-3 py-2">
                  {roleFoods.map((food) => (
                    <li key={food.id}>
                      <label className="flex items-center gap-2 py-1 text-sm">
                        <input
                          checked={values.avoidedFoodIds.includes(food.id)}
                          onChange={() => setValues((current) => ({ ...current, avoidedFoodIds: toggle(current.avoidedFoodIds, food.id) }))}
                          type="checkbox"
                        />
                        {food.name} <span className="text-zinc-600">({stateLabels[food.preparation_state]})</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </fieldset>

      <section className="grid gap-4">
        <h2 className="text-xl font-bold">Training</h2>
        <label className="grid gap-1 text-sm font-semibold">
          Experience
          <select className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal" onChange={(event) => changeExperience(event.target.value as Experience)} value={values.experience}>
            {experiences.map((experience) => <option key={experience} value={experience}>{experienceLabels[experience]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Equipment
          <select className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal" onChange={(event) => setValues((current) => ({ ...current, equipment: event.target.value as Equipment }))} value={values.equipment}>
            {equipmentOptions.map((equipment) => <option key={equipment} value={equipment}>{equipmentLabels[equipment]}</option>)}
          </select>
          {values.equipment === "bodyweight" && (
            <span className="text-sm font-normal text-zinc-600">Needs a pull-up bar and a sturdy chair or table.</span>
          )}
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Training days per week
          <select className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal" onChange={(event) => setValues((current) => ({ ...current, trainingDays: Number(event.target.value) }))} value={values.trainingDays}>
            {dayOptions.map((days) => <option key={days} value={days}>{days}</option>)}
          </select>
          {values.experience === "beginner" && values.trainingDays >= 5 && (
            <span className="text-sm font-normal text-red-800">Risk: a beginner on 5–6 days a week has little recovery time.</span>
          )}
        </label>
      </section>

      {message && <p aria-live="polite" className={message === savedMessage ? "text-sm text-zinc-700" : "text-sm text-red-800"}>{message}</p>}
      <button className="w-fit rounded-lg bg-lime-400 px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
        {saving ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
