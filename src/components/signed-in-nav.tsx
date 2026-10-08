"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { activeNavLabel, isActiveNavItem, signedInNavItems } from "@/lib/nav";

// Wide screens (1024px+): one row of links. Phones and tablets: a Menu button that opens the same links as a list,
// so nothing scrolls sideways and Log out is always reachable.
export function SignedInNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close the phone menu after navigating (adjusting state during render, not in an effect).
  if (openedOn !== pathname) {
    setOpenedOn(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = signedInNavItems.map((item) => {
    const active = isActiveNavItem(pathname, item.href);
    return { ...item, active };
  });

  return (
    <>
      <nav aria-label="Main" className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm lg:flex">
        {links.map((item) => (
          <Link aria-current={item.active ? "page" : undefined} className="btn-ghost btn-sm" href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
        <LogoutButton className="btn-ghost btn-sm ml-auto" />
      </nav>

      <div className="flex flex-1 justify-end lg:hidden">
        <button
          aria-controls={menuId}
          aria-expanded={open}
          className="btn-secondary btn-sm"
          onClick={() => setOpen((current) => !current)}
          ref={buttonRef}
          type="button"
        >
          <span aria-hidden>{open ? "✕" : "☰"}</span>
          {activeNavLabel(pathname) ?? "Menu"}
          <span className="sr-only">, open menu</span>
        </button>
      </div>
      {open && (
        <nav aria-label="Main" className="surface-float absolute inset-x-3 top-full z-30 mt-2 rounded-2xl !bg-card p-2 lg:hidden" id={menuId}>
          <ul className="grid gap-1 text-base">
            {links.map((item) => (
              <li key={item.href}>
                <Link
                  aria-current={item.active ? "page" : undefined}
                  className="btn-ghost w-full !justify-start"
                  href={item.href}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-1 border-t border-line pt-1">
              <LogoutButton className="btn-ghost w-full !justify-start" />
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}
