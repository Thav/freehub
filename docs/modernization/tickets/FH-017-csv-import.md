# FH-017 — Freehub and Corsizio CSV import

## Objective

Add safe previewed import of people and optional services.

## Dependencies

FH-012 and FH-015.

## Scope

- Documented Freehub template and automatic supplied-Corsizio mapping.
- Preview creates, single matches/skips, warnings, multiple-match errors, and invalid rows.
- Match by organization-scoped normalized email, phone, or first-plus-last name.
- Import valid rows, optional explicit service defaults, idempotency, audit, and downloadable rejection report.

## Exclusions

- V1 does not update existing matched people or provide arbitrary interactive column mapping.

## Acceptance criteria

- Both formats, encodings/BOM, quoted content, invalid headers/dates, duplicates, mixed files, and retries pass.

## Verification

Run parser/property fixtures, transaction/idempotency tests, authorization tests, and full preview/confirm Playwright flow.

## Rollback and handoff

Import job records identify created rows so an administrator can review effects; rollback policy must not delete unrelated matches.
