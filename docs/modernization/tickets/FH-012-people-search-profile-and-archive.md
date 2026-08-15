# FH-012 — People, search, profiles, and archive

## Objective

Restore the central people workflow with familiar UX and reversible archival.

## Dependencies

FH-011.

## Scope

- Create/edit/profile, name search/autocomplete, contact/address fields, staff status, normalized match fields, audit attribution, archive and restore.
- Exclude archived people from ordinary search/check-in while retaining reports/exports.

## Acceptance criteria

- Legacy parity cases pass and archive behavior is reversible and authorized.
- No cross-organization person IDs can be read or mutated.

## Verification

Run domain, API/controller, Playwright parity, normalization, and archive tests.

## Rollback and handoff

Archival never deletes dependent history.
