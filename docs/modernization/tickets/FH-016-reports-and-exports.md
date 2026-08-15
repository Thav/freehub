# FH-016 — Reports and CSV exports

## Objective

Restore people, visit, service, and summary reporting with familiar filters and tables.

## Dependencies

FH-013, FH-014, and FH-015.

## Scope

- Date/name/type filters, organization-timezone grouping, pagination, summary classifications, and streamed CSV exports with descriptive filenames.

## Acceptance criteria

- Results reconcile to canonical fixtures and approved legacy cases.
- Empty/populated/paginated/export states pass Playwright parity.

## Verification

Run report SQL/domain tests, CSV contract tests, reconciliation queries, and visual captures.

## Rollback and handoff

Reports are read-only and must not repair data implicitly.
