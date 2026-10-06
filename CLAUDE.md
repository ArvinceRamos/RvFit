# RvFit



Beginner-friendly fitness website. Build the website first; consider a mobile app later.

Stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase (Auth and Postgres with row-level security), Vitest.



Before each task, read the "Configuration and product rules" section and the section for the current phase of `docs/PLAN.md`. Read the whole plan when a task crosses phases.



Rules:

- Keep V1 small. Do only the task requested and touch only files needed.

- Do not add unplanned features or checkboxes. Keep the age confirmation and account-deletion confirmation required by the plan.

- Build and test locally. Do not deploy unless I explicitly ask for deployment.

- Never commit secrets. Keep local secrets in an untracked `.env.local`.
- Never overwrite or delete `CLAUDE.md` or `docs/PLAN.md`.

- Run relevant local checks. Report files changed, commands run, pass/fail results, and any failures.

## Working style

- Use short, plain sentences. Explain unusual things in one or two lines.
- For future implementation jobs, read docs/TASKS.md and the relevant parts of docs/PLAN.md first.
- Update docs/TASKS.md only after a job’s checks pass. Never mark a job done if a check failed.
- Before a large job, send a 3–5 line plan and ask “Want me to start Job N?” My yes approves that plan and starts that job; do not ask for a second approval.
- After a job, stop and report what changed, which checks ran and passed, what I should check by hand, and the next job with its suggested model and effort. Do not start the next job until I say yes.
- If a decision is needed, ask one question instead of guessing.
- If you see a risk or a plan rule that looks wrong, say so plainly.
- Keep replies short and do not repeat the plan.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
