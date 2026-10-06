# UI refresh of the signed-in app

Local only. No deployment. No new features. This is a visual and layout change.
Jobs: UI-1 to UI-4 in `docs/TASKS.md`. `docs/PLAN.md` stays the source of truth for product rules and the palette rule.

## Decisions (made by the user)

- **Width.** Signed-in pages use `max-w-6xl` (1152px) by default. Login, sign-up, forgot and reset password, and the guest calculator flow (`/`, `/start`, `/calculate`, `/manual`, `/results`) stay narrow (`max-w-xl`).
- **Layout.** Card grids and side-by-side layouts. One column on phones. The header nav is one slim row.
- **Theme.** Dark by default; light mode added in UI-5 (header sun/moon toggle, first visit follows the device, choice kept in this browser). Tokens, not colour classes, across the whole app, set with colour tokens in `src/app/globals.css`. No hard-coded `zinc`, `stone`, `lime` or `white` colour classes in signed-in screens (about 401 classes in 33 files today).
- **Off-white.** `#FEF9F5` is the chosen white token. `docs/PLAN.md` line 411 allows this "if chosen"; it is now chosen. `docs/PHASE5.md` still says `#FFFFFF` and must be updated before the Phase 5 jobs.

## Width change in code

`AuthFrame` (`src/components/auth-frame.tsx`) currently defaults to `max-w-xl` and takes `wide`. UI-2 flips the default: signed-in pages (`showNav`) are wide; pages without `showNav` stay narrow. Remove the `wide` prop once nothing needs it. Keep the change small.

## Colour tokens

Define in `globals.css` (`@theme inline` plus `:root`). Use semantic names so no page names a colour directly.

| Token | Value | Use |
| --- | --- | --- |
| `--color-page` | `#111413` (charcoal, changed from `#000000` in UI-5 at the user's request) | Page background, flat (the UI-5 glow was removed in UI-7 at the user's request). Black is still the text colour on Fit Green. |
| `--color-card` | `#1C1C1C` | Cards, header, inputs |
| `--color-accent` | `#AFFA00` | Primary buttons, progress bars, rings, active nav, focus ring |
| `--color-accent-soft` | `#CFED89` | Soft fills, hover on accent |
| `--color-ink` | `#FEF9F5` | Text on dark |
| `--color-muted` | grey, about `#A3A3A3` | Body and secondary text. Must pass 4.5:1 on `#1C1C1C` |
| `--color-line` | `#FEF9F5` at about 10% | 1px card and input borders |

Added in UI-3 and UI-4 (all in `globals.css`; the whole app is dark, there is no light theme):

| Token | Value | Use |
| --- | --- | --- |
| `--color-warn` / `--color-warn-bg` | `#FBBF24` / amber at 12% | Over-target bars and warning text |
| `--color-danger` / `--color-danger-bg` / `--color-danger-edge` | `#F87171` / red at 12% / red at 40% | Errors and the delete section |
| `--color-danger-fill` / `--color-on-danger` | `#F87171` / black | "Delete everything" button |
| `--color-field` / `--color-edge` | `#0D0D0D` / `#FEF9F5` at 40% | Inputs and their borders |
| `--color-selected` / `--color-selected-edge` | Fit Green at 12% / Fit Green | Chosen option |
| `--color-track` | `#333333` | Bar tracks, disabled buttons |
| `--color-accent-text` | `#AFFA00` | Fit Green used as text (dark backgrounds only) |

Light mode (UI-5): `[data-theme="light"]` overrides the tokens. Page `#FEF9F5`, card `#FFFFFF`, ink `#111111`, muted `#52525B`, borders black at 10% and inputs black at 50%. Fit Green stays a fill with black text; `--color-accent-text` becomes dark green `#3F6212` because Fit Green is never text on a light background. Warn `#92400E`, danger `#B91C1C`. Theme is set before paint by a small script in `src/app/layout.tsx`; the toggle is `src/components/theme-toggle.tsx`.

UI-7 Progress tiles: the Latest weight tile is a solid Fit Green card with black text (16.5:1); its change chip is white on black (21:1) in both themes; the workouts ring uses `--color-accent-text` on `--color-track` (13.4:1 on the dark card, 7.0:1 dark green on the light card).

UI-5 contrast (both themes; measured over the old glow, so the flat page is the same or better; body text 4.5, borders and bars 3), all pass: dark ink 12.6–17.7, muted 5.2–7.4, Fit Green text 10.4–13.1, danger 5.2–6.2, input border 3.7; light ink 17.0–18.6, muted 7.0–7.6, dark-green accent text 6.4–7.0, warn 6.5–7.1, danger 5.7–6.5, input border 3.9–4.0. Earlier UI-4 figures (flat black page) were (ratios; body text needs 4.5, borders and bars 3): ink on page 20.1, ink on card 16.3, muted on card 6.8, muted on page 8.3, Fit Green on page 16.5, Fit Green on card 13.4, black on Fit Green 16.5, black on Fit Green 40% 16.1, warn on card 10.2, danger on card 6.2, danger on its tint 5.2, black on danger fill 7.6, muted on track 5.0, input border on card 3.7, input border on page 3.5.

### Colour rules

- Fit Green is **text only on `#000000` or `#1C1C1C`**. Never on a light background.
- Text on a Fit Green fill is always black (`--color-page`).
- Fit Green 40% (`#CFED89`) is a fill or hover, not text on dark body copy.
- Body text 4.5:1 or better. Large text and UI borders 3:1 or better. Focus rings visible on both black and `#1C1C1C`.
- Colour is never the only signal (keep text or icons on warnings and errors).
- Do not copy RedSun text, assets or branding. Structure only.

## Style notes

- Fonts: the existing Geist sans and mono (`next/font`, already loaded locally). Headings weight 500, large sizes. Body in `--color-muted`. No new font request.
- **Cards:** 20–24px radius, 1px `--color-line` border, `--color-card` fill (translucent is optional), optional soft inner glow. One shared card class or small component, not copy-paste.
- **Buttons:** about 15px radius. Primary: solid accent fill, black text. Secondary: translucent dark pill with a faint accent border and ink text. One shared class each.
- **Inputs:** `--color-card` or slightly lighter fill, 1px line border, ink text, accent focus ring.
- **Grid:** 3 columns with about 30px gap on large screens (`lg`), 2 on medium where it fits, 1 on phone.
- **Activity ring:** an inline SVG ring in accent on `--color-card`, used where a "progress toward today's target" number already exists (Dashboard). No new data, no chart library.

## Header

One slim row: logo on the left, nav items, Log out on the right. Active item has an accent fill with black text. At 1152px all eight items plus Log out fit in one row. On phones the row scrolls sideways inside the header (no wrapping, no page scroll). No hamburger menu in V1 (not requested).

## Layout per page

All pages: one column on phones. Keep every existing form, field, action and safety wording. Move things, do not remove them.

| Page | Layout |
| --- | --- |
| Dashboard `/dashboard` | 3-column card grid: target, today's calories and macros (with ring), weight trend, workouts this week, next workout, quick links. Cards that exist today stay; they are only rearranged. |
| Week `/week` | Grid of day cards (Mon–Sun, 3 columns on large screens). Each day card shows meals and workout for that day, read-only. |
| Workouts `/workouts` | Grid of day cards for the plan, with swap controls inside each card. Recent workouts list in its own card. |
| Workout log new/edit | Two columns: form on the left, last-session and progression prompts on the right. |
| Meals `/meals` | Keep the current two-column layout; restyle only. |
| Meal new/edit | Keep the current two-column layout; restyle only. |
| Progress `/progress` | Two columns: weigh-in form and trend summary on the left; chart, history and workouts-per-week on the right. |
| Profile `/profile` | Two columns: current target (calories, macros, age last entered) on the left; edit form on the right. Delete my account section full width below, in its own card. |
| Food library `/foods` | Two columns: search and filters on the left; results list on the right. |
| Preferences `/preferences` | Two columns: preference form on the left; allergen notice and avoided foods on the right. |

Narrow pages (login, sign-up, forgot and reset password, guest flow) keep their layout. They get the dark tokens only if they share `AuthFrame`; the guest flow must still read correctly. Confirm in UI-4.

## Job split

- **UI-2:** width default, header, Dashboard, Week, Workouts as card grids. Add the shared card and button classes and the token definitions these pages need.
- **UI-3:** Progress, Profile, Food library, Preferences side by side.
- **UI-4:** apply tokens to every remaining screen, remove leftover hard-coded colour classes, contrast check, tsc, lint, tests, hands-on walkthrough.

Note: tokens are first defined in UI-2 so UI-2 and UI-3 pages are already dark. UI-4 sweeps whatever is left and verifies.

## Phase 5 link

The Phase 5 landing page must use these same tokens so the visitor sees one look when they cross into the app. Before P5 jobs: update `docs/PHASE5.md` (`#FFFFFF` → `#FEF9F5`) and add the P5 jobs to `docs/TASKS.md`. Open Phase 5 questions to ask the user one at a time: 3D library or hand-drawn canvas ribbon; fake-data preview panels or real screenshots.

## Acceptance checks

UI-2 to UI-4 are done when:

- Signed-in pages are 1152px wide at a laptop size; login, sign-up and the guest flow are still narrow.
- Dashboard, Week and Workouts show a 3-column card grid on large screens and one column on a phone. No horizontal page scroll at 375px.
- Progress, Profile, Food library and Preferences are side by side on large screens and stacked on a phone.
- The header nav is one row at laptop width.
- Signed-in screens contain no hard-coded `zinc`, `stone`, `lime` or `white` colour classes; colours come from the tokens. (Check with a search.)
- Contrast: body text, muted text, buttons, borders, focus rings and error text all meet the ratios above. Record the checked pairs in the UI-4 report.
- Fit Green appears as text only on black or `#1C1C1C`. Text on Fit Green fills is black.
- No feature, field, wording or data rule changed. The age confirmation and account-deletion confirmation are still there.
- `npx tsc --noEmit`, `npm run lint` and `npm test` pass. `npm run build` only with the dev server stopped. Never `supabase db reset`.
- Hands-on walkthrough with a throwaway user only: log in, visit every page, one action per page (weigh-in, save a meal, swap an exercise, edit profile), at laptop and phone width. Never touch arvinceramos14@gmail.com.

## Risks

- A dark theme touches 33 files. The risk is missed spots (white inputs on dark, unreadable placeholders, native selects and date pickers). UI-4 searches for leftovers and checks forms by hand.
- Native controls (select, date, number spinners) may stay light. Set `color-scheme: dark` on the document and check them.
- Eight nav items need a plan for phones. Sideways scroll is the V1 choice.
- Wider pages make long text lines. Keep paragraph text to about 65–75 characters wide inside cards.
