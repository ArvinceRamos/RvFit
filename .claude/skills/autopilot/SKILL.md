---
name: autopilot
description: Use when the user says "autopilot", "run it all without me", "don't wait for me", or similar for a group of RvFit jobs in docs/TASKS.md. Runs every unchecked job in that group back to back with no questions: Claude makes the choices, runs each big job in a fresh subagent, checks and commits each job locally, and stops only at the end or on a blocker it cannot safely solve.
---

# Autopilot

The user is away (for example, at the gym). Their message that started this skill approves every unchecked job in the named group of `docs/TASKS.md`, and the plan for each job in its doc. While this skill runs, its rules replace these rules in CLAUDE.md:
- "Want me to start Job N?"
- "stop after a job and wait"
- "ask one question instead of guessing"

Every other rule in CLAUDE.md and `docs/PLAN.md` still holds.

## Before the first job

1. Name the group. If the user didn't name one, take the first group in `docs/TASKS.md` that has unchecked jobs. Read its doc, for example `docs/ACTIVITY.md`.
2. Call `mcp__ccd_host__request_keep_awake` (load it with ToolSearch first), so the computer doesn't sleep.
3. Check the tools the checks need: Docker Desktop and local Supabase (`npx supabase status`; start them if they are down). If they can't start, run every check that doesn't need them and record the gap.
4. Send one short message: which jobs will run, in what order, and "I'll notify you when done."

## For each unchecked job, in order

1. **Decide where it runs.**
   - A small job (a handful of files, or docs only) runs here, in this session.
   - A large job runs in a fresh `general-purpose` subagent. Give it the model from the job's line in TASKS (`opus` or `sonnet`), so this session's context stays small. Its brief:
     - Say: "Read CLAUDE.md, docs/TASKS.md and <the job's doc> first."
     - The job line, word for word.
     - The choices already made.
     - The rules below under "Never".
     - Say: "Do not commit, and do not edit docs/TASKS.md. Report the files changed, the commands run, and their pass/fail output."
   - Wait for its result. Do not poll.
2. **Make the choices yourself.** When a choice comes up, pick the option that keeps CLAUDE.md and the plan's rules, and record the choice and its reason. If every option would break a rule, or the choice can't be undone (deleting data, or changing a health value that isn't a planned placeholder), don't guess: skip to "Stop early".
3. **Verify it here, yourself.** Don't trust a subagent's report. Run the relevant checks: `npm run lint`, `npx tsc --noEmit`, `npm test`, the database tests when a migration changed, the e2e tests when screens changed, and `npm run build` with no dev server running. Read the diff.
4. **Fix failures.** Make up to three fix attempts per failing check, here or in the subagent (send it a follow-up with `SendMessage`). A test may change only when the test itself is wrong. Never weaken a check just to make it pass.
5. **When everything passes:**
   - Mark the job `[x]` in TASKS, with the usual summary line: what changed, the choices made, the checks run, and the model.
   - Commit locally with a message like the earlier ones.
   - Overwrite `docs/handoffs/autopilot.md` with the status, the last commit, the next job, and the choices made so far. If the session stops or the context gets summarized, the work can carry on from that file.
6. Go to the next job without asking.

## Stop early only when

- A check still fails after three fix attempts.
- A choice would break a rule or can't be undone.
- A job needs something only the user can do: an account, a key, a deploy, or a qualified review.

When you stop:
- Leave that job unchecked and uncommitted.
- Write the reason and the exact failing output in `docs/handoffs/autopilot.md`.
- Then go to "At the end". Don't start later jobs that depend on the failed one. Jobs that don't depend on it may still run.

## At the end

1. Send a phone notification with `PushNotification` (load it with ToolSearch first). It's one line: how many jobs passed, and whether anything is blocked.
2. Write the final report:
   - Each job with its commit.
   - The choices made, with reasons.
   - The checks run, with pass/fail.
   - What to check by hand.
   - Anything blocked.
3. Use the job-handoff skill for the next group, and ask the user the one question about what comes next.

## Never

- Push, deploy, or run `supabase db push` or `config push`. The CLI is linked to rvfit-prod.
- Delete user data or real accounts. Use throwaway test users only.
- Fill in the Decision column of `docs/REVIEW-SHEET.md`, or change health values except the placeholders the job's doc lists.
- Commit secrets or `.env.local`.
- Overwrite or delete `CLAUDE.md` or `docs/PLAN.md`.
- Add features that aren't in the job's doc.
