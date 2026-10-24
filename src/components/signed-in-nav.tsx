"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { LogoutButton } from "@/components/logout-button";
import { isActiveSection, signedInNavItems } from "@/lib/nav";

function useLinks() {
  const pathname = usePathname();
  return signedInNavItems.map((item) => ({ ...item, active: isActiveSection(pathname, item) }));
}

// The five signed-in sections (src/lib/nav.ts). From 768px they sit in one row in the header with Log out.
// On phones the header keeps only Log out, and SignedInTabBar shows the sections at the bottom of the screen.
export function SignedInNav() {
  const links = useLinks();

  return (
    <>
      <nav aria-label="Main" className="hidden min-w-0 flex-1 items-center gap-1 whitespace-nowrap text-sm md:flex">
        {links.map((item) => (
          <Link aria-current={item.active ? "page" : undefined} className="btn-ghost btn-sm !gap-1.5 !px-2.5" href={item.href} key={item.href}>
            <Icon className="size-4" name={item.icon} />
            {item.label}
          </Link>
        ))}
        <LogoutButton className="btn-ghost btn-sm ml-auto !gap-1.5 !px-2.5" />
      </nav>

      <div className="flex flex-1 justify-end md:hidden">
        <LogoutButton className="btn-ghost btn-sm !gap-1.5 !px-2.5" />
      </div>
    </>
  );
}

// Phones only. It sits outside the header: the header's glass would otherwise pin a fixed bar to itself.
export function SignedInTabBar() {
  const links = useLinks();
  return (
    <nav aria-label="Main" className="tab-bar md:hidden">
      {links.map((item) => (
        <Link aria-current={item.active ? "page" : undefined} className="tab-link" href={item.href} key={item.href}>
          <span className="tab-icon"><Icon className="size-5" name={item.icon} /></span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
