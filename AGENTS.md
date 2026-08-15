# Freehub repository instructions

Modernization work is coordinated through `docs/modernization/TRACKER.yml`.

Before changing code:

1. Read `docs/modernization/PLAN.md` and `docs/modernization/RALPH.md`.
2. Run `bin/ralph validate` and `bin/ralph status`.
3. Resume `active_ticket` if one exists. Otherwise claim the ticket returned by `bin/ralph next`.
4. Read that ticket's complete Markdown file before implementing it.

Work on only one ticket at a time. Preserve unrelated user changes. Do not store database dumps, credentials, temporary passwords, or unreviewed screenshots in Git. A ticket is complete only after its acceptance criteria pass and the tracker contains verification evidence.

The supported container host is the persistent `sbx` sandbox named `freehub`. Do not mount or attempt to use the host `/var/run/docker.sock` from project containers.
