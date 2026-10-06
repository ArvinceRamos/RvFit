"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { isActiveNavItem, signedInNavItems } from "@/lib/nav";

// One row. On a phone the row scrolls sideways inside the header.
export function SignedInNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm">
      {signedInNavItems.map((item) => {
        const active = isActiveNavItem(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`rounded-[10px] px-3 py-2 font-semibold ${active ? "bg-accent text-on-accent" : "text-muted hover:bg-line hover:text-ink"}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
      <LogoutButton className="ml-auto rounded-[10px] px-3 py-2 font-semibold text-muted hover:bg-line hover:text-ink" />
    </nav>
  );
}
