# FH-005 — Define the canonical schema and migration preflight

## Objective

Lock the modern data contract and prove exact accounting of the supplied legacy source.

## Dependencies

FH-004.

## Scope

- Define organizations, users, roles, people, visits, services, tags, notes, archives, imports, and migration issues.
- Preserve source IDs, historical visit role snapshots, duration, audit attribution, and organization timezone semantics.
- Implement source preflight and reconciliation prototypes against MariaDB.
- Specify zero-date, duplicate, invalid relationship, and orphan quarantine handling.

## Exclusions

- Do not choose the application stack or mutate the source database.

## Acceptance criteria

- Source count equals valid import candidates plus quarantined records for every table.
- Every transformation and rejection category is documented and machine-readable.
- Schema supports both architecture candidates without candidate-specific semantics.

## Verification

Run preflight against the supplied dump and committed edge-case fixtures; compare deterministic JSON reports.

## Rollback and handoff

Schema remains proposed until ADR-0002 is accepted; preserve reports for both spike tickets.
