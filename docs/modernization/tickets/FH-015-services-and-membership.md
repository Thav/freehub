# FH-015 — Services and membership

## Objective

Restore Membership, Earn-a-Bike/Digging Rights, and Class management.

## Dependencies

FH-012.

## Scope

- Service create/edit/detail/list, inclusive dates, paid/volunteered flags, renewal, notes, and current/expired/no-member profile states.

## Acceptance criteria

- Boundary dates and historical visit membership agree with the specification and migration fixtures.

## Verification

Run service-type, membership-boundary, renewal, authorization, migration, and visual tests.

## Rollback and handoff

Service corrections are audited and retain historical source identity.
