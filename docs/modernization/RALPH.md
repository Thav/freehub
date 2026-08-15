# Ralph-style session loop

The tracker replaces conversational memory. One feature-sized ticket may span several sessions, but only one ticket may be active at a time.

## Start of every session

1. Read the root `AGENTS.md`, `PLAN.md`, this file, and `TRACKER.yml`.
2. Inspect `git status`; preserve unrelated or pre-existing work.
3. Run `bin/ralph validate` and `bin/ralph status`.
4. If a ticket is active, resume it. Otherwise run `bin/ralph next`, read the returned ticket completely, and claim it.
5. Commit the tracker claim before implementation so another session can see it.

## During work

- Stay within the ticket's declared scope.
- Update the ticket before materially expanding scope and explain why.
- Make small, reviewable implementation commits.
- Never treat persistent containers or named volumes as the only copy of reproducible state.
- Never commit database dumps, credentials, temporary passwords, or unreviewed personal data.

## End of a successful ticket

1. Run every verification command in the ticket.
2. Commit implementation changes.
3. Run `bin/ralph complete FH-### --evidence "<commands and artifacts>"`.
4. Commit the tracker completion separately.
5. Confirm `bin/ralph validate` and `bin/ralph status` pass.

## Blocked work

Block only on a concrete external condition:

```bash
bin/ralph block FH-### --reason "why progress cannot continue" --unblock "specific condition"
```

Blocking clears the active slot. A later session may choose another dependency-ready ticket. When the condition changes, use `bin/ralph release FH-###` to return it to pending.

Time, difficulty, or ending a chat session are not blockers. Leave the ticket active with a concise handoff in its evidence if work is merely incomplete.
