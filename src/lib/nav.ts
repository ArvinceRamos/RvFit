import type { IconName } from "@/components/icon";

// The signed-in navigation: five sections (audit 2026-10-24, section 3). Each page keeps its address;
// also lists the other pages that belong to a section, so its tab stays lit there.
// Today includes the Week page, Food includes Browse foods, and Me includes Preferences
// (Food settings and the training plan).
export const signedInNavItems = [
  { href: "/dashboard", label: "Today", icon: "dashboard", also: ["/week"] },
  { href: "/meals", label: "Food", icon: "meals", also: ["/foods"] },
  { href: "/workouts", label: "Train", icon: "workouts", also: [] },
  { href: "/progress", label: "Progress", icon: "progress", also: [] },
  { href: "/profile", label: "Me", icon: "profile", also: ["/preferences"] },
] as const satisfies readonly { href: string; label: string; icon: IconName; also: readonly string[] }[];

export type SignedInNavItem = (typeof signedInNavItems)[number];

// A path is active on itself and on any path below it, such as /meals/new under /meals.
export function isActiveNavItem(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Whether this section's tab is lit on the page: its own path or one of the pages that belong to it. */
export function isActiveSection(pathname: string, item: SignedInNavItem): boolean {
  return [item.href, ...item.also].some((href) => isActiveNavItem(pathname, href));
}
