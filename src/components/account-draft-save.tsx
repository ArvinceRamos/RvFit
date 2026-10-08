"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveGuestDraftAction } from "@/app/account/actions";
import { GUEST_DRAFT_EVENT, GUEST_DRAFT_STORAGE_KEY, storedDraftHasTarget } from "@/lib/guest-draft";

type Message = { text: string; tone: "success" | "info" | "error"; profileLink?: boolean };

function clearDraft() {
  window.localStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
  window.dispatchEvent(new Event(GUEST_DRAFT_EVENT));
}

// Saves a finished guest target from this browser after sign-in, once.
// It says nothing when there is nothing to save, so returning users never see a stale message.
// A user without a target is guided by the dashboard's setup steps instead.
export function AccountDraftSave() {
  const router = useRouter();
  const sent = useRef(false);
  const [message, setMessage] = useState<Message>();

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const rawDraft = window.localStorage.getItem(GUEST_DRAFT_STORAGE_KEY);
    if (!storedDraftHasTarget(rawDraft)) return;

    void saveGuestDraftAction(JSON.parse(rawDraft!)).then((result) => {
      if (!result.ok) {
        setMessage({ text: result.error, tone: "error" });
        return;
      }
      clearDraft();
      if (result.status === "saved") {
        setMessage({ text: "Your targets are saved to your account.", tone: "success" });
        router.refresh();
      } else if (result.status === "saved_target_exists") {
        // Shown once: the draft is cleared so this does not repeat on every visit.
        setMessage({
          text: "Your account already had saved targets, so the numbers from this browser were not saved. To change your target, use",
          tone: "info",
          profileLink: true,
        });
      }
    }).catch(() => {
      setMessage({ text: "Your targets could not be saved right now. They are still in this browser, so reload the page to try again.", tone: "error" });
    });
  }, [router]);

  if (!message) return null;
  const style = message.tone === "error"
    ? "bg-danger-bg text-danger"
    : message.tone === "success" ? "bg-selected text-ink" : "bg-warn-bg text-warn";
  return (
    <p className={`mt-5 rounded-lg p-3 text-sm ${style}`} role={message.tone === "error" ? "alert" : "status"}>
      {message.text}
      {message.profileLink && <> <Link className="font-semibold underline" href="/profile">Profile and targets</Link>.</>}
    </p>
  );
}
