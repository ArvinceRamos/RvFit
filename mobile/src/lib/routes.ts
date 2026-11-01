import type { Href } from "expo-router";

// The shared lib (setup steps, landing stages) links to web addresses. This maps each one to the
// matching app screen, so the same steps and links work on both.
export function toAppRoute(webHref: string): Href {
  const [path, query] = webHref.split("?");
  const suffix = query ? `?${query}` : "";
  const fixed: Record<string, string> = {
    "/dashboard": "/today",
    "/meals": "/food",
    "/meals/new": "/meal/new",
    "/meals/plan": "/meal/plan",
    "/workouts": "/train",
    "/workouts/log/new": "/workout/new",
    "/profile": "/me",
    "/progress": "/progress",
    "/preferences": "/preferences",
    "/foods": "/foods",
    "/week": "/week",
    "/start": "/start",
    "/privacy": "/privacy",
    "/terms": "/terms",
    "/glossary": "/glossary",
  };
  if (fixed[path]) return `${fixed[path]}${suffix}` as Href;
  const meal = /^\/meals\/([0-9a-f-]{36})$/.exec(path);
  if (meal) return `/meal/${meal[1]}` as Href;
  const workout = /^\/workouts\/log\/([0-9a-f-]{36})$/.exec(path);
  if (workout) return `/workout/${workout[1]}` as Href;
  return "/today";
}
