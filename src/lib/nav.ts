import type { IconName } from "@/components/icon";

// The signed-in navigation. To add a page to the menu, add one line here.
export const signedInNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/meals", label: "Meals", icon: "meals" },
  { href: "/workouts", label: "Workouts", icon: "workouts" },
  { href: "/week", label: "Week", icon: "week" },
  { href: "/progress", label: "Progress", icon: "progress" },
  { href: "/foods", label: "Food library", icon: "foods" },
  { href: "/preferences", label: "Preferences", icon: "preferences" },
  { href: "/profile", label: "Profile", icon: "profile" },
] as const satisfies readonly { href: string; label: string; icon: IconName }[];

// A page is active on its own path and on any path below it, such as /meals/new under /meals.
export function isActiveNavItem(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The label of the menu item for this page, for the phone menu button. */
export function activeNavLabel(pathname: string): string | null {
  return signedInNavItems.find((item) => isActiveNavItem(pathname, item.href))?.label ?? null;
}
