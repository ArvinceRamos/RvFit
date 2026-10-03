"use client";

import { useEffect, useRef, useState } from "react";
import { saveGuestDraftAction } from "@/app/account/actions";
import { GUEST_DRAFT_EVENT, GUEST_DRAFT_STORAGE_KEY } from "@/lib/guest-draft";

type Message = { text: string; error?: boolean };

export function AccountDraftSave({ hasSavedTarget }: { hasSavedTarget: boolean }) {
  const sent = useRef(false);
  const [checked, setChecked] = useState(false);
  const [message, setMessage] = useState<Message>();

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const rawDraft = window.localStorage.getItem(GUEST_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      void Promise.resolve().then(() => {
        if (!hasSavedTarget) {
          setMessage({ text: "Draft not found. Return to the browser or device where you started setup to save your draft." });
        } else {
          setMessage({ text: "Saved." });
        }
        setChecked(true);
      });
      return;
    }

    let draft: unknown;
    try {
      draft = JSON.parse(rawDraft);
    } catch {
      void Promise.resolve().then(() => {
        setMessage({ text: "Your local draft could not be read. It has not been removed.", error: true });
        setChecked(true);
      });
      return;
    }

    void saveGuestDraftAction(draft).then((result) => {
      if (!result.ok) {
        setMessage({ text: result.error, error: true });
      } else if (result.status === "saved_target_exists") {
        window.localStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
        window.dispatchEvent(new Event(GUEST_DRAFT_EVENT));
        setMessage({ text: "Your account already has a saved target, so these answers were not saved." });
      } else {
        window.localStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
        window.dispatchEvent(new Event(GUEST_DRAFT_EVENT));
        setMessage({ text: "Saved." });
      }
      setChecked(true);
    }).catch(() => {
      setMessage({ text: "Your draft could not be saved. It has not been removed.", error: true });
      setChecked(true);
    });
  }, [hasSavedTarget]);

  if (!checked || !message) return null;
  return <p className={`mt-5 text-sm ${message.error ? "text-red-800" : "text-zinc-700"}`}>{message.text}</p>;
}
