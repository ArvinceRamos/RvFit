"use client";

import { useState } from "react";
import { saveDisplayNameAction } from "@/app/profile/name-action";
import { maxDisplayNameLength } from "@/lib/display-name";

// Account details: the email (read only) and an optional name used in the Dashboard greeting.
export function AccountCard({ email, name }: { email: string; name: string }) {
  const [value, setValue] = useState(name);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(undefined);
    const result = await saveDisplayNameAction(value);
    setSaving(false);
    if (!result.ok) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setMessage({ ok: true, text: "Name saved." });
  }

  return (
    <section className="card mt-[30px]">
      <h2 className="section-title">Account</h2>
      <p className="mt-2 text-sm text-muted">Signed in as {email}</p>
      <form className="mt-4 grid max-w-sm gap-4" onSubmit={submit}>
        <label className="grid gap-1 text-sm font-semibold">
          Name (optional)
          <input
            autoComplete="given-name"
            className="field w-full"
            maxLength={maxDisplayNameLength}
            name="name"
            onChange={(event) => setValue(event.target.value)}
            type="text"
            value={value}
          />
          <span className="text-xs font-normal text-muted">Used for the greeting on your Dashboard.</span>
        </label>
        <div aria-live="polite">{message && <p className={message.ok ? "alert-success" : "alert-danger"}>{message.text}</p>}</div>
        <button className="btn-secondary w-fit disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
          {saving ? "Saving…" : "Save name"}
        </button>
      </form>
    </section>
  );
}
