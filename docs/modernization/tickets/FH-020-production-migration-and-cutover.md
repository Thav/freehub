# FH-020 — Production migration and cutover

## Objective

Replace legacy Freehub during a controlled maintenance window with verified rollback.

## Dependencies

FH-019.

## Scope

- Multiple production-like rehearsals, legacy read-only mode, final dump/snapshot, preflight, migration, reconciliation, smoke/manual checks, temporary passwords, traffic switch, and rollback window.

## Acceptance criteria

- Imported plus quarantined counts reconcile exactly.
- Current users approve the parity matrix.
- No unresolved tenant-isolation defect remains.
- Backup restore and legacy-traffic rollback have been rehearsed.

## Verification

Execute and retain the signed cutover checklist, reconciliation report, smoke results, and rollback evidence.

## Rollback and handoff

Restore traffic to read-only legacy if acceptance fails; never permit unsynchronized writes to both systems.
