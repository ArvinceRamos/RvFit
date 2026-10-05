// The signed-in navigation. To add a page to the menu, add one line here.
export const signedInNavItems = [
  { href: "/account", label: "Account" },
  { href: "/meals", label: "Meals" },
  { href: "/foods", label: "Food library" },
  { href: "/preferences", label: "Preferences" },
] as const;

// A page is active on its own path and on any path below it, such as /meals/new under /meals.
export function isActiveNavItem(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
