# Phase 4 — Dashboard, weekly plan, progress, and profile

## Readiness and review gates

- This document is the Phase 4 behavior and data outline. Phase 4 remains local-only; do not deploy.
- Phase 4 reads data from Phases 1–3. It adds no new health or safety wording beyond the existing footer disclaimer, the macro-mismatch warning that already exists on the results screen, and the account-deletion confirmation.
- Targets stay placeholders until qualified review. The app never changes a target automatically.
- Items marked **Decision** below have a recommended default. Confirm or change them before P4-2.

## Screen map

| Screen | Path | What it is |
| --- | --- | --- |
| Dashboard | `/dashboard` | New signed-in home. Today at a glance. |
| Weekly plan | `/week` | The current week, Monday to Sunday. |
| Progress | `/progress` | Weigh-ins, weight trend, workouts per week. |
| Profile and targets | `/profile` | Edit profile and goals, recalculate, edit macros, delete account. |

The signed-in menu becomes: Dashboard, Meals, Workouts, Week, Progress, Food library, Preferences, Profile. Menu items live in `src/lib/nav.ts`.

**Decision: retire `/account`.** Phase 1's Account page showed the saved target and the weigh-in form. Its content moves: saved target to Profile and Dashboard, weigh-in form to Progress. `/account` redirects to `/dashboard`, and login, sign-up confirmation, and the guest-draft save finish on `/dashboard`. Recommended, because two pages showing the same target would drift apart.

## Dates and time zones

"Today" and "this week" use the user's local calendar date, as meals already do. The server cannot know the time zone, so:

- Pages that depend on today (Dashboard, Weekly plan) render their static parts on the server and fetch the date-based parts through a server action that receives the browser's local date, like `loadDayTotalsAction` does for meals.
- Weeks run **Monday to Sunday** (**Decision**: Monday start, not configurable).
- Weigh-ins carry a timestamp. The weight trend uses "the last seven days" counted back from the current moment, so it needs no local date.

## Meals improvements

These fix and extend the Phase 2 meal screens. They come before the Dashboard because the Dashboard reuses the same daily summary. All five choices below were confirmed with the user. `docs/PLAN.md` and `docs/PHASE2.md` still describe a free-text label and no delete; this section replaces that for meals.

1. **Today's summary on the Meals page.** A card above the meal list shows today's eaten, target, and left for calories, protein, carbohydrates, fat, and fiber. It uses the same "left / over target" wording as "Remaining today" on New meal and the same fiber rule: if any food that day has no fiber value, show "Incomplete". Each meal in the list keeps its own totals. With no saved target, the card links to set one.
2. **Meal labels are Meal 1 to Meal 6.** The label is a required dropdown. Each number can be used once per date. A number already used on the chosen date is marked as taken. The label column stays text. A database rule (partial unique index on user, date, and label for labels `Meal 1` to `Meal 6`) enforces one per day. Old meals with other labels (for example "breakfast") still show, open, and save with their existing label.
3. **Two columns on the meal pages.** New meal and Edit meal use a wider page. On large screens the foods are on the left, and Meal totals, Remaining today, and Suggested foods are on the right in a column that stays in view and scrolls by itself. On a phone it is one column. Other pages keep the current width.
4. **The form clears after saving a new meal.** Label, all foods, and the search box are emptied, and "Meal saved." is shown. Remaining today updates for the next meal. Editing an existing meal stays on the page with "Meal saved."
5. **Add several foods at once.** Four optional slots: Protein, Carbs, Fat, and Fiber (vegetables or fruit). Each has a food picker limited to that role, an amount, and a unit. Leave any slot empty. An **Add another food** button adds extras from the whole catalog. A meal needs at least one food. Totals, gram limits, and suggestions work as before.
6. **Delete a meal.** Each meal in the list has a Delete button next to Edit. Delete asks "Delete this meal?" with **Yes** and **No**. Yes removes the meal and its foods and refreshes the list. No cancels. The database already allows this, so no change is needed there.

## Dashboard

Shows, for today:

1. **Calories and macros**: eaten so far versus the saved target, and the remaining amount, for calories, protein, carbohydrates, fat, and fiber. Fiber follows the existing rule: if any food that day has no fiber value, show "Incomplete" instead of a total. If there is no saved target, show a link to set one.
2. **Meals**: today's meals with label and calories, each linking to edit.
3. **Workout**: the workouts logged today (day name and set count), each linking to edit. If none, say so and link to Workouts. There is no scheduling and no "up next".
4. **Weight trend**: the same value as Progress (see below).
5. **Quick actions**: New meal, Log a workout (to the Workouts page), Log a weigh-in (to Progress).

## Weekly plan

**Decision: a read-only week view with no scheduling.** Phase 3 lets the user pick any workout day each time, so the app does not assign days to weekdays. The page shows:

- Seven rows, Monday to Sunday, with the date. Each row shows calories eaten versus target, and the workouts logged that day. Today is marked.
- Under the week, "This week's plan": the user's workout days with how many times each was logged this week. Days not yet logged this week are marked as such.

It uses saved Preferences and logs. It never edits anything.

## Progress

- **Weigh-in form** (moved from Account): weight and optional waist, chest, and hips, in the user's units. Same rules as before.
- **Weight trend**: the average of weigh-ins that have a weight value in the last seven days. With fewer than three, show **"Not enough data yet."** This is a placeholder rule from the plan.
- **History**: the latest 20 weigh-ins with date, weight, and any measurements, in the user's units, rounded to one decimal.
- **Weight chart**: **Decision**: one simple line chart of those weigh-ins, drawn as inline SVG with no new library. It shows only recorded points, with no smoothing or goal line. Drop it if you want the smallest V1.
- **Workouts per week**: workouts logged in each of the last eight weeks, as a short list with counts.

## Profile and targets

- **Details**: age, sex (for the formula), height, activity level, units, goal, and pace, plus current weight. The form fills with saved values. For a user who started with a manual target, the details start empty.
- **Age**: shown as **"Age last entered"** with the saved age. The app never advances it.
- **Current weight**: pre-filled from the latest weigh-in. If the user changes it, the change is saved as a new weigh-in in the same save. (**Decision**: this keeps one source for weight.)
- **Recalculate**: runs the existing calculation module and shows the new calorie target, macros, and any floor explanation. Nothing is saved yet.
- **Edit macros**: the user can edit protein, carbohydrate, fat, and fiber grams, with the existing validation. The same **over-5% macro-mismatch warning** shows as on the results screen. The calorie target does not change when macros are edited.
- **Save**: creates a new `calorie_targets` row and updates the profile. The newest row by `created_at` is current. Old rows stay as history. One database function does both writes in one transaction, so a failed save changes nothing.
- A manual target (calories chosen directly) follows the existing manual rules.
- The page shows the current target, its source (calculated or manual), and when it was saved.

## Delete my account and data

- A **Delete my account and data** section at the bottom of Profile.
- **Confirmation step**: the first button opens a confirmation panel that says what is deleted and that it cannot be undone. The panel has **Delete everything** and **Cancel** buttons. There is no checkbox.
- Deletion runs in a server action. It first checks the signed-in user with the normal server client, then deletes that user's auth account with a server-only admin client. Every user table already deletes its rows when the account goes (profiles, targets, weigh-ins, preferences, avoided foods, meals and items, workout logs, sets, and swaps).
- The admin key (`SUPABASE_SERVICE_ROLE_KEY`) is read only on the server, never has a `NEXT_PUBLIC_` name, and is never sent to the browser or logged.
- After deletion the user is signed out and sent to the home page with a short confirmation message.
- The action deletes only the verified caller's account. It accepts no user ID from the browser.

## Data and database outline

- No new tables. One migration adds `save_profile_and_target`: a security-invoker function, `search_path = ''`, executable only by signed-in users. It updates the caller's profile, inserts a `calorie_targets` row with a fresh draft key, and optionally inserts a weigh-in, all in one transaction.
- Existing row-level security stays as is. Tests must show another user cannot read or change these rows through the new function.
- New placeholder values go in `calculationConfig` under `progress`:

| Value | Initial placeholder |
| --- | --- |
| Weight trend window | 7 days |
| Minimum weigh-ins for a trend | 3 |
| Weigh-ins shown in history | 20 |
| Weeks shown for workouts per week | 8 |

## Out of scope

Deployment, goal weights, streaks, notifications, charts beyond the one weight chart, workout or nutrition analytics beyond the totals above, weekly scheduling, changing targets automatically, social features, AI plans, data export, password-confirm on deletion, and any new health or safety wording.

## Risks to keep in view

- Account deletion is irreversible and uses a privileged key. Keep it small, server-only, and tested with throwaway users only. Never test it on a real account.
- A new target row is permanent history. The save must be atomic.
- Time zones: all "today" logic must use the browser's local date, or totals land on the wrong day.
- The trend rule is a placeholder. Show it plainly and do not imply medical meaning.

## Acceptance checks (Phase 4 done when)

A hands-on walkthrough with a test user:

- Shows the dashboard and weekly plan reflecting saved meals, workouts, and target.
- Shows "Not enough data yet." with fewer than three weigh-ins in seven days, and a trend with three or more.
- Edits a target so it creates a new current row, with the macro warning shown when macros are over 5% off.
- Confirms a deletion that removes a demo user's account and every associated row.

In addition:

- Another user cannot read or change a user's rows through the new function or pages, and signed-out visitors are denied.
- `npx tsc --noEmit`, `npm run lint`, and `npm test` pass. Run `npm run build` only when the dev server is stopped.
