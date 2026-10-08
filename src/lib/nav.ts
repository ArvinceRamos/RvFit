// The signed-in navigation. To add a page to the menu, add one line here.
export const signedInNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/meals", label: "Meals" },
  { href: "/workouts", label: "Workouts" },
  { href: "/week", label: "Week" },
  { href: "/progress", label: "Progress" },
  { href: "/foods", label: "Food library" },
  { href: "/preferences", label: "Preferences" },
  { href: "/profile", label: "Profile" },
] as const;

// A page is active on its own path and on any path below it, such as /meals/new under /meals.
export function isActiveNavItem(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The label of the menu item for this page, for the phone menu button. */
export function activeNavLabel(pathname: string): string | null {
  return signedInNavItems.find((item) => isActiveNavItem(pathname, item.href))?.label ?? null;
}
