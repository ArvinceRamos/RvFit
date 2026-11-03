// Scroll positions where the hero, each "How it works" card, and the end of the welcome screen sit in the
// middle of the screen. The ribbon's camera moves one stop per position, like the web landing page
// (measureStops in src/components/ribbon-background.tsx). centers are the cards' middles in content
// coordinates; the result is in order and inside the scroll range, even if the layout is unusual.
export function ribbonStops(centers: number[], viewportHeight: number, contentHeight: number): number[] {
  const max = Math.max(contentHeight - viewportHeight, 0);
  const stops: number[] = [];
  for (const y of [0, ...centers.map((center) => center - viewportHeight / 2), max]) {
    stops.push(Math.min(Math.max(y, stops.at(-1) ?? 0), max));
  }
  return stops;
}
