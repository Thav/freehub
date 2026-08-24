# Ralph-style session loop

The tracker replaces conversational memory. One feature-sized ticket may span several sessions, but only one ticket may be active at a time. The repository owner, not an agent, controls commits and the transition to the next ticket.

## Start of every session

1. Read the root `AGENTS.md`, `PLAN.md`, this file, and `TRACKER.yml`.
2. Inspect `git status`; preserve unrelated or pre-existing work.
3. Run `bin/ralph validate` and `bin/ralph status`.
4. If a ticket is active, resume it. Otherwise run `bin/ralph next`, read the returned ticket completely, and claim it.
5. Leave the tracker claim uncommitted. The persistent shared worktree makes it visible to later sessions.

## During work

- Stay within the ticket's declared scope.
- Update the ticket before materially expanding scope and explain why.
- Do not stage or commit changes. Leave the complete diff available for the repository owner to review and commit.
- Continue until every acceptance criterion passes or work is truly blocked on a concrete external condition. A chat or agent-session boundary is not a stopping condition.
- Never treat persistent containers or named volumes as the only copy of reproducible state.
- Never commit database dumps, credentials, temporary passwords, or unreviewed personal data.

## Ready for owner review

1. Run every verification command in the ticket.
2. Confirm the acceptance criteria pass and inspect the complete uncommitted diff.
3. Do **not** run `bin/ralph complete`. Leave the ticket active so no dependent ticket becomes available before review.
4. Give the repository owner a short review handoff containing:
   - a very brief summary of what the ticket completed;
   - exact commands to enter the persistent sandbox and start or prepare every Compose service needed for a host-side demonstration, plus the local URL and any non-secret fixture login or setup steps;
   - the verification commands and artifacts that will become tracker evidence;
   - optional cleanup commands when cleanup is useful; and
   - one line naming the ticket that would follow after acceptance. Determine it from dependency order without claiming or starting it.
5. Stop. Do not begin work on the next ticket while owner review is pending.

The demonstration handoff must distinguish host commands from commands run inside `sbx`. A typical shape is:

```text
Host:
  cd /home/tony/git/freehub
  sbx run --name freehub

Inside sbx:
  <ticket-specific fixture/build commands>
  docker compose --profile <profile> up -d --build

Open on host:
  http://127.0.0.1:<port>
```

The `Host` section is for the repository owner only. An agent session already
running in `freehub` must skip that section and invoke `docker compose` directly
after obtaining sandbox Docker permission. It must not try to run `sbx` from
inside the sandbox or fall back to a workstation Docker socket.

Do not guess a generic profile, port, or fixture command; report the exact commands verified for the ticket.

## After owner acceptance

The repository owner reviews the implementation outside the agent workflow. Only after explicit acceptance may the owner, or an agent asked to finalize the reviewed ticket, run:

```bash
bin/ralph complete FH-### --evidence "<commands and artifacts>"
bin/ralph validate
bin/ralph status
```

Run completion before committing so the approval, verification evidence, implementation, and tracker transition are included in one owner-reviewed commit. Historical tickets may retain their `implementation_commits` references, but new completions do not require a separate implementation commit. Only after the combined commit may an agent claim the next ticket.

## Blocked work

Block only on a concrete external condition:

```bash
bin/ralph block FH-### --reason "why progress cannot continue" --unblock "specific condition"
```

Blocking clears the active slot. A later session may choose another dependency-ready ticket. When the condition changes, use `bin/ralph release FH-###` to return it to pending.

After recording a genuine block, stop and provide the concrete reason, unblock condition, and any useful reproduction commands. Do not select a different ticket unless the repository owner explicitly asks.

Time, difficulty, context limits, or ending a chat session are not blockers. If work is incomplete, keep working or leave the ticket active for the next session; never mark it blocked merely to end a run.
