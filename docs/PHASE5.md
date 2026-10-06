# Phase 5 — Roadmap landing page

## Readiness and review gates

- This document is the Phase 5 behavior and design outline. Phase 5 remains local-only; do not deploy.
- Phase 5 adds no new health or safety wording beyond the honest-estimates line and the existing footer disclaimer.
- Items marked **Decision** were confirmed by the user in P5-1 (2026-10-07). See "Decisions (confirmed in P5-1)".
- `docs/PLAN.md` Phase 5 stays the source of truth for the five stages, the honest-estimates line, the hero actions, and the palette rules. This document adds the visual direction and the job list.

## Visual reference

The user supplied a screen recording of a dark landing page ("Relay", frames from `ezgif-6002b943bc52dfaa-jpg.zip`). The parts worth borrowing:

| What the reference does | How RvFit uses it |
| --- | --- |
| Near-black page with one lime accent; Fit Green `#AFFA00` is a close match | Same idea with the plan palette. Fit Green on dark only: never as text on white or off-white. |
| Big sans headline with one italic serif word | Same headline style. One italic word per heading, for example "Know your *numbers*." |
| Hero: text on the left, a glass product panel on the right, a glowing 3D light ribbon behind | Hero with the macro-dial 3D enhancement behind a static app preview. Falls back to a static image. |
| Ribbon changes shape and position as you scroll | One shared 3D scene that moves between the five stages (see 3D scope). |
| Small mono labels, status pill, "badge" chips | Mono labels such as `stage 1 / 5`. No "all systems normal" style fake status. |
| Glass cards with simple charts: line, segmented bar, progress bar | Real RvFit shapes: calorie and macro bars, weight trend line, workouts-per-week bars. Drawn as inline SVG from fake demo data. |
| Full-bleed lime block with the logo as a section break | One lime block before the final call to action. Black text on it. |
| Stat row with big numbers and testimonials | **Not used.** The plan forbids fake testimonials, user counts, and outcome promises. |
| Pricing and "free for 14 days" copy | **Not used.** RvFit has no pricing. |

Other places to study (not copy):

- [Scrollytelling website examples](https://reallygooddesigns.com/scrollytelling-website-examples/) for chapter-style scroll stories.
- [Scroll-driven 3D website notes](https://www.svilenkovic.com/3d/scroll-driven-3d-website) for the scroll-moves-the-camera pattern.
- [Scroll hero animation notes](https://www.svilenkovic.com/3d/scroll-hero-animation) for a short hero sequence of a few keyframes.
- [React Three Fiber examples](https://docs.pmnd.rs/react-three-fiber/getting-started/examples), including ScrollControls, for the React way to do it.
- [Grind](https://www.framer.com/marketplace/templates/grind/) and [Fitnex](https://www.framer.com/community/marketplace/templates/fitnex-gym/) for dark, lime, fitness-app layouts.

## Page structure (top to bottom)

1. **Hero.** Headline, one line of support, the four required actions: **Get my starting estimate**, **See the roadmap**, the smaller **Enter my own target** link, and **Log in**. App preview panel on the right. All of this is plain HTML and works before any 3D loads.
2. **Roadmap.** Five stages in a vertical scrolling timeline. Each stage has a number, a short title and sentence from `docs/PLAN.md`, and an "App preview" panel that links to the real screen.
3. **Honest-estimates card.** The illustrative sample result card without calorie math, plus the plan line: "A starting estimate, not a promise. Review your weight trend over time, then decide whether to edit your target."
4. **Lime break block, then final call to action.** Same four actions again, short.
5. **Footer.** Existing disclaimer.

| Stage | Title | Preview panel | Links to |
| --- | --- | --- | --- |
| 1 | Know your numbers | Sample calorie and macro result card (no math shown) | `/start` (target-method screen with the age checkbox) |
| 2 | Fuel your day | Meal builder slots and a daily calories bar | `/meals` (sign-in required) |
| 3 | Train your week | Workout plan day with exercises | `/workouts` |
| 4 | Track your trend | Weight line and 7-day average | `/progress` |
| 5 | Review and adjust | Profile and targets with the macro warning | `/profile` |

Links to signed-in screens send signed-out visitors to Log in, as the app already does.

**Feature lines (user decision, 2026-10-07).** The page is an overview of the whole app. Under each stage's exact plan sentence, show 3-4 short feature lines. They only name features the app already has. No outcome promises, no new health or safety wording, and no claims about allergy safety. Draft wording, final in P5-2:

| Stage | Feature lines |
| --- | --- |
| 1 Know your numbers | Calorie estimate or your own target · Protein, carb, fat and fiber targets · Try it before you make an account |
| 2 Fuel your day | Meal builder with protein, carb, fat and fiber slots · Meal planner for a day or a week · Food library and food preferences · Eaten checklist and a prep list for the day |
| 3 Train your week | Workout plan from your preferences · Swap exercises · Log your sets · Optional progression prompts from your last session |
| 4 Track your trend | Weigh-ins with a 7-day average · Weight chart over 7, 30 or 90 days · Workouts per week · Dashboard and weekly plan |
| 5 Review and adjust | Edit your details and recalculate · Edit macros with a mismatch warning · Delete your account and data |

Hero and final call-to-action links:

| Action | Links to |
| --- | --- |
| Get my starting estimate | `/start` |
| See the roadmap | `#roadmap` on the same page |
| Enter my own target (smaller link) | `/start` |
| Log in | `/login` |

- Both target actions go to `/start` so the "I am 18 or older" checkbox is never skipped. Do not link straight to `/calculate` or `/manual`.
- Keep the "Your account and data were deleted." notice that shows at `/?account=deleted`.
- The landing page is always dark, whatever the saved theme. It has no theme toggle. Signed-in screens keep their light and dark themes.

## 3D scope

**Decision: 3D is a background layer, not the content.** The plan says the roadmap is a plain scrolling timeline that does not depend on 3D, and to cut 3D first if the phase grows.

- One light-ribbon or macro-dial scene behind the page, drawn on a canvas. Scroll position moves the camera so the ribbon shifts for each stage. It reads as a "3D roadmap" while the text and panels stay normal HTML.
- Loads after first paint. The page is fully usable before it loads, and if it fails.
- Static image instead on: phones and small screens, `prefers-reduced-motion`, no WebGL, and data-saver. 3D is a desktop enhancement.
- **Decision (confirmed): add `three` only.** No `@react-three/fiber`. One hand-written client component, loaded only on the landing page with a dynamic import. One new dependency and no tie to React versions. If the phase grows, cut this first; the static fallback then becomes the only version.

## Charts and previews

- **Decision (confirmed): the preview panels are built from fake demo data, not photographed screens.** For Phase 5 this replaces the plan's "screenshots from a seeded demo account". Panels are small static components with fake data and inline SVG (same approach as the Phase 4 weight chart, no chart library), each labelled **App preview**. All fake data lives in one module. A code comment on each panel names the screen it mirrors; update the panel when that screen changes.
- Charts animate in once when scrolled into view (draw the line, fill the bars). With reduced motion they simply appear.
- No real user data and no fake counts anywhere on the page.

## Palette and type

- `#AFFA00` Fit Green and `#CFED89` pale green as fills and accents; `#1C1C1C` and `#000000` as backgrounds; `#FEF9F5` off-white for text on dark.
- **Decision (confirmed): keep `#FEF9F5` as the off-white.** It is already the app's `--ink` (dark) and light `--page` token, so nothing outside the landing page changes.
- Fit Green is never text on white or off-white. On the lime block use black text.
- Headline: the app's sans (Geist) plus one italic serif word. Add one serif (for example Instrument Serif, italic) through `next/font`, which hosts the file with the app. No third-party request at runtime.
- Contrast on dark must pass for body text and small mono labels.

## Accessibility and performance

- All four hero actions are reachable by keyboard and visible without scrolling on a laptop screen.
- Canvas is decorative: `aria-hidden`, no focus, no text inside it.
- Reduced motion: no scroll-driven camera, no chart animation, no ribbon motion.
- Phone width: one column, no horizontal scroll, panels stack under each stage.
- 3D code does not load for signed-in app screens.

## Decisions (confirmed in P5-1)

1. **3D:** `three` only, hand-written, dynamic import on the landing page. No `@react-three/fiber`.
2. **Previews:** components with fake demo data and inline SVG, labelled **App preview**. No screenshots, no demo account.
3. **Off-white:** keep `#FEF9F5`, the existing token.

## Out of scope

Deployment, pricing, testimonials, user or run counts, outcome promises, blog, video embeds, a demo login, screenshots of any real account, new health or safety wording, and changes to the app screens.

## Risks to keep in view

- The reference shows testimonials and big stat numbers. Copying that style with made-up values would break the plan rule. Use neutral labels like "Sample" or "App preview".
- 3D adds weight and a dependency. Keep it lazy-loaded and optional.
- Preview panels can drift from the real screens when those change. Keep them small and note in the code which screen each one mirrors.
- Dark landing page against a light signed-in app: the header, links, and focus states must still match the app's look where the visitor crosses over.

## Acceptance checks (Phase 5 done when)

A hands-on walkthrough:

- Follows the five stages in order, and each stage links to the right real screen or the sign-in step.
- Shows the four hero actions before any 3D loads, and they work.
- Works at phone width, with reduced motion on, and with 3D disabled (the static fallback shows).
- Shows only fake demo data, each panel labelled **App preview**.

In addition:

- No third-party requests at runtime, no secrets, no new health wording.
- `npx tsc --noEmit`, `npm run lint`, and `npm test` pass. Run `npm run build` only when the dev server is stopped.

## Reference walkthrough (what the video shows, in order)

Source: `C:\Users\arvince\Downloads\ezgif-6002b943bc52dfaa-jpg.zip`, 73 frames of a screen recording of a dark SaaS landing page ("Relay"). It loops: it starts and ends on the hero. The frames are low resolution and small text is blurred. Style only; copy none of its words or numbers.

1. **Loader and hero (frames 1-10).** Black page. A lime rounded-square logo pulses at the centre, then moves into the hero. Nav: logo, four links, a status pill, a lime "Start free" button. Hero: small mono badge, a big white sans headline with one italic serif word, a grey support line, a lime primary button and a dark ghost secondary button, one mono line of small print. On the right, a glass product panel (a flow diagram with nodes and a "last runs" list). A glowing green-to-blue ribbon of light fades in behind it.
2. **Scroll away from hero (frames 11-18).** The ribbon swoops from the hero into the page as you scroll. A row of small app tiles ("connects to 240 apps") appears under the hero.
3. **Section "Most of a process is glue." (frames 19-26).** Mono pill label, headline with an italic word, a short paragraph on the right. Below it, a glass card showing a timeline of steps with a lime progress bar and a time axis. The ribbon is a soft blurred glow behind, not sharp lines.
4. **Lime full-bleed block (frames 22-23, 55-56).** The page cuts to a solid lime rounded block with only the dark logo in the middle. It acts as a chapter break.
5. **Feature cards (frames 27-40).** Two-column glass cards with a small diagram and a progress-bar list (one lime bar, others grey, a percentage on the right). A "Tuesday, seen from..." section with a bar-by-day chart (Mon-Sat, today highlighted), a lime ring at "82%", avatar circles with a count, and a smooth two-line wave chart.
6. **Stats row (frames 41-47).** Three columns with a big white number each: a mini line chart, a segmented lime bar, and a lime progress bar. Quotes with names below. (RvFit must not copy the numbers or quotes.)
7. **Pricing (frames 48-54).** A slider card with a price that updates, then three plan cards, one marked "most picked" with a lime tag. (RvFit has no pricing.)
8. **End (frames 55-73).** The lime block again, then the page scrolls back up to the hero. The ribbon is sharp and bright in the hero, and blurred in the middle sections.

### What to carry over to RvFit

- **Look:** near-black page, one lime accent, glass cards with thin borders and soft rounded corners, mono micro-labels, big sans headline with one italic serif word.
- **3D:** one glowing ribbon-of-light scene behind the page. It is sharp in the hero and soft and blurred behind content sections. Scroll moves it. This is the "3D roadmap" feel; the roadmap text and cards stay plain HTML on top.
- **Charts to build (inline SVG, fake demo data, labelled App preview):** calorie bar for the day, macro bars (one lime, rest grey), weight line with 7-day average, workouts-per-week bars with the current week highlighted, a lime progress ring for "target hit today" style display (no outcome promises), a smooth wave line only if it adds meaning.
- **Motion:** charts draw in once on scroll, lime block as a chapter break before the final call to action. All of it off with reduced motion. **No loader screen:** it would hide the hero actions, which must show right away.
- **Skip:** status pill, app-tile row, pricing, testimonials, stat counters, "free for 14 days" copy.

## Jobs

One small job each. Mark a job done in `docs/TASKS.md` only after its checks pass. Run `npx tsc --noEmit`, `npm run lint` and `npm test` in every code job.

- **P5-2: Landing content and hero.** Put stage titles, sentences, feature lines, links and the honest-estimates line in one typed module. Add Vitest tests that they match `docs/PLAN.md` word for word and that both target actions go to `/start`. Replace `src/app/page.tsx` with the dark hero: headline with one italic serif word (`next/font`), support line, the four actions, the account-deleted notice, and the footer. Always dark. (Sonnet 5.5 medium)
- **P5-3: Roadmap timeline.** Five stages in a plain vertical timeline under `#roadmap`: mono `stage n / 5` label, title, sentence, its 3-4 feature lines, link, and an empty preview slot. One column on phones. (Sonnet 5.5 medium)
- **P5-4: Fake demo data and the first three previews.** One demo-data module. Panels for stages 1-3: sample result card (no math), meal slots with a daily calories bar, and a workout day. Each labelled **App preview**. (Sonnet 5.5 medium)
- **P5-5: Chart previews and the hero panel.** Stage 4 weight line with 7-day average and workouts-per-week bars, stage 5 profile and targets with the macro warning, and the static hero panel. Inline SVG. Charts draw in once on scroll; no motion with reduced motion. (Sonnet 5.5 medium)
- **P5-6: Honest-estimates card, lime block, final call to action.** Exact plan line, black text on lime, the four actions again. (Sonnet 5.5 low)
- **P5-7: 3D ribbon / macro-dial.** Add `three`. One client component, loaded with a dynamic import after first paint, `aria-hidden`. Scroll moves the camera between stages. Static fallback on small screens, reduced motion, no WebGL and data-saver. Confirm `three` is not in signed-in page bundles. Cut this job first if the phase grows. (Opus 5.5 high)
- **P5-8: Phase 5 walkthrough and checks.** Run the acceptance checks above: five stages and their links (signed out, and signed in with a throwaway user), phone width, reduced motion, 3D off, no third-party requests in the network tab, and contrast. Run tsc, lint and tests, then `npm run build` with the dev server stopped. (Sonnet 5.5 medium)
