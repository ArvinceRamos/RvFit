---
name: job-handoff
description: Use at the end of every RvFit job (after the checks pass and the report is sent), and at the start of any new chat that begins from a handoff file. Decides whether the next job belongs in a new chat; if so, writes a handoff file in docs/handoffs/, names the model and effort for the next job, and offers a new session that starts from that file.
---

# Job handoff

The user does not want to repeat context or instructions in a new chat. This skill keeps the work moving between chats.

## At the end of a job

Run this after the job's checks pass and after the usual report (what changed, checks, what to check by hand).

1. **Decide: same chat or new chat.** Use a new chat when any of these is true:
   - The next job is unrelated to the one just finished (a different area, files, or phase).
   - This chat is long. Examples: several jobs done, a big audit, or many large files read.
   - The next job needs a different model or effort from this chat's.

   Otherwise, stay here and just name the next job, model, and effort.

2. **Pick the model and effort for the next job.** Use the same style as `docs/TASKS.md`:
   - **Opus 5.5 high:** database migrations, RLS, security, atomic save functions, tricky logic (solvers, check-in, progression), and anything that is hard to undo.
   - **Opus 5.5 medium:** multi-file features and UI work that needs design judgment.
   - **Sonnet 5.5 medium:** well-specified pages, components, copy, and walkthrough or check jobs.
   - **Sonnet 5.5 low:** small, mechanical edits.
   - **Haiku 5.5:** read-only lookups only.

   Give a one-line reason.

3. **For a new chat, write `docs/handoffs/<job-id>.md`.** Use plain, short sentences:
   - **Status:** what is done, the commit hash, and what is not committed or not pushed.
   - **Next job:** its ID, the goal, and the approved 3–5 line plan if there is one.
   - **Decisions already made by the user:** quote their words. List any decisions still open.
   - **Files and facts that matter:** paths, gotchas, and commands. Remember that files use CRLF.
   - **Model and effort,** with the reason.
   - **First steps for the new chat:** read `CLAUDE.md`, this handoff, `docs/TASKS.md`, and the relevant parts of `docs/PLAN.md`.
   - **Do not:** things to avoid. For example: do not push to `main` without asking, because Vercel may redeploy.

   Do not mark anything done in `docs/TASKS.md` from the handoff. That rule stays tied to passing checks.

4. **Offer the new chat.** Call `mcp__ccd_session__start_session` with:
   - `initiation` "own_initiative" (or "offer" if the user just named the job)
   - `context` "fresh"
   - `model` set to the chosen model
   - a short brief that says: "Read `docs/handoffs/<job-id>.md` first and follow it. Use the job-handoff skill when the job is done."

   If the tool is not available, give the user a ready-to-paste first message with the same text, plus the model and effort to pick in the app.

5. **Tell the user in one or two lines** where the handoff file is and which model and effort to use.

## At the start of a chat that begins from a handoff

- Read the handoff file and the files it lists before anything else.
- Follow `CLAUDE.md` as usual: send the 3–5 line plan and ask "Want me to start Job N?", unless the handoff says the user already approved this plan.
- When this job is done, run "At the end of a job" again. The chain continues without the user repeating any of this.
- After the job's checks pass, delete or update the handoff files that are now stale.
