"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveWeighInAction } from "@/app/account/actions";
import type { PreferredUnits, WeighInFields } from "@/lib/weigh-in";

const emptyFields: WeighInFields = { weight: "", waist: "", chest: "", hips: "" };

export function WeighInForm({ preferredUnits }: { preferredUnits: PreferredUnits }) {
  const router = useRouter();
  const [fields, setFields] = useState<WeighInFields>(emptyFields);
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const weightUnit = preferredUnits === "metric" ? "kg" : "lb";
  const measurementUnit = preferredUnits === "metric" ? "cm" : "in";

  function updateField(name: keyof WeighInFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(undefined);
    const result = await saveWeighInAction(fields, preferredUnits);
    setSaving(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setFields(emptyFields);
    setMessage("Weigh-in saved.");
    router.refresh();
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">Add a weigh-in</h2>
      <form className="mt-4 grid gap-4" onSubmit={submit}>
        <Field label={`Weight (${weightUnit})`} name="weight" required value={fields.weight} onChange={updateField} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={`Waist (${measurementUnit})`} name="waist" value={fields.waist} onChange={updateField} />
          <Field label={`Chest (${measurementUnit})`} name="chest" value={fields.chest} onChange={updateField} />
          <Field label={`Hips (${measurementUnit})`} name="hips" value={fields.hips} onChange={updateField} />
        </div>
        {message && <p aria-live="polite" className={message === "Weigh-in saved." ? "text-sm text-zinc-700" : "text-sm text-red-800"}>{message}</p>}
        <button className="w-fit rounded-lg bg-lime-400 px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
          {saving ? "Saving…" : "Save weigh-in"}
        </button>
      </form>
    </section>
  );
}

function Field({ label, name, value, onChange, required = false }: {
  label: string;
  name: keyof WeighInFields;
  value: string;
  onChange: (name: keyof WeighInFields, value: string) => void;
  required?: boolean;
}) {
  return <label className="grid gap-1 text-sm font-semibold">{label}<input className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal" inputMode="decimal" name={name} onChange={(event) => onChange(name, event.target.value)} required={required} type="text" value={value} /></label>;
}
