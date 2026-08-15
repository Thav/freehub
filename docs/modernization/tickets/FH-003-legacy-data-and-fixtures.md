# FH-003 — Restore legacy data and deterministic fixtures

## Objective

Create a repeatable, sanitized database state that exercises every legacy UI state needed for specification and screenshots.

## Dependencies

FH-002.

## Scope

- Restore the approved sanitized dump to a MariaDB container.
- Create safe deterministic screenshot credentials and organization role.
- Add synthetic current/expired/non-member, staff/patron, visit, service, tag, note, validation, empty-state, and pagination cases.
- Record fixture checksum and restore commands.

## Exclusions

- Never modify the source archive or commit it to Git.
- Do not treat named volumes as authoritative fixtures.

## Acceptance criteria

- A clean database can be restored and enriched with one command.
- Every screen-inventory state has a stable fixture identifier.
- No real credentials or unreviewed personal data enter Git.

## Verification

Run the restore twice from empty volumes, compare aggregate counts, log in with fixture credentials, and sample every state class.

## Rollback and handoff

Delete disposable volumes; rerun the documented restore to recover.
