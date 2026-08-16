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
- Define the handoff requirement for an executable, PostgreSQL-specific schema;
  the stack-neutral contract is not itself a database schema format.

## Exclusions

- Do not choose the application stack or mutate the source database.

## Acceptance criteria

- Source count equals valid import candidates plus quarantined records for every table.
- Every transformation and rejection category is documented and machine-readable.
- Schema supports both architecture candidates without candidate-specific semantics.
- FH-009 has an explicit, verifiable requirement to materialize this contract as
  versioned PostgreSQL migrations and a generated PostgreSQL schema artifact using
  the selected stack's conventional migration mechanism.

## Verification

Run the stack-neutral contract validator, then restore and classify the supplied
dump and the isolated committed edge-case database:

```bash
node --check test/migration/preflight.mjs
node test/migration/validate-contract.mjs
sh -n bin/restore-legacy-source bin/migration-preflight bin/migration-reconcile bin/verify-migration-preflight
docker compose config --quiet
bin/verify-migration-preflight
git diff --check
bin/ralph validate
```

`bin/verify-migration-preflight` runs each source in a read-only transaction twice,
byte-compares each pair, and compares them with
`test/migration/expected/{sanitized-source,edge-cases}.json`. The report must show
all ten table equations passing and must contain only aggregate categories/counts,
contract hashes, and non-sensitive source labels.

## Rollback and handoff

Schema remains proposed until ADR-0002 is accepted; preserve reports for both spike tickets.
