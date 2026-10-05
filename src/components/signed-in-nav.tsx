"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { isActiveNavItem, signedInNavItems } from "@/lib/nav";

export function SignedInNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      {signedInNavItems.map((item) => {
        const active = isActiveNavItem(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 font-semibold ${active ? "bg-lime-400 text-zinc-950" : "text-zinc-700 hover:bg-zinc-100"}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
      <LogoutButton className="rounded-lg px-3 py-2 font-semibold text-zinc-700 hover:bg-zinc-100" />
    </nav>
  );
}
