# FH-018 — Bulk filtering, export, and archive

## Objective

Provide policy-neutral management of older or inactive people without automatic deletion.

## Dependencies

FH-012 and FH-016.

## Scope

- Filter by created range, last-visit range, and never visited.
- Preview selection counts, export CSV, archive, and restore.
- Restrict mutations to organization managers and audit them.

## Exclusions

- No automatic retention job or bulk permanent deletion.

## Acceptance criteria

- Filter counts, export population, archive/restore, authorization, and large-selection behavior pass.

## Verification

Run query-boundary, export, batch, audit, authorization, and Playwright tests.

## Rollback and handoff

Archive is reversible and leaves dependent history intact.
