"use client";

import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";

// The inline script in layout.tsx sets data-theme before the page paints. This reads it back.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const current = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

// Day/night switch: a pill with a sliding knob. Day puts a white knob with a sun on the right of a sage track;
// night puts a lime knob with a moon on the left of the dark card. The choice is remembered in this browser only.
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => "dark" as Theme);
  const dark = theme === "dark";

  function toggle() {
    const next: Theme = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage can be blocked. The choice then lasts until the page is reloaded.
    }
  }

  return (
    <button
      aria-checked={dark}
      aria-label="Night mode"
      className={`relative inline-flex h-8 w-[5.5rem] shrink-0 items-center rounded-full border text-[11px] font-bold uppercase tracking-wide text-ink transition-colors duration-300 ${
        dark ? "border-btn2-edge bg-card" : "border-line bg-track"
      }`}
      onClick={toggle}
      role="switch"
      title={dark ? "Switch to day mode" : "Switch to night mode"}
      type="button"
    >
      <span aria-hidden className={`absolute ${dark ? "right-2.5" : "left-2.5"}`}>{dark ? "Night" : "Day"}</span>
      <span
        aria-hidden
        className={`absolute left-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full shadow-sm motion-safe:transition-transform motion-safe:duration-300 ${
          dark ? "translate-x-0 bg-accent text-on-accent" : "translate-x-[3.5rem] bg-white text-ink"
        }`}
      >
        <svg className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" viewBox="0 0 24 24">
          {dark ? (
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </>
          )}
        </svg>
      </span>
    </button>
  );
}
