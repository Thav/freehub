# FH-013 — Tags and notes

## Objective

Restore persistent classifications and authored notes without carrying forward invalid relationships.

## Dependencies

FH-012.

## Scope

- Organization-scoped tags and person associations.
- Person, visit, and service notes with author/audit attribution.
- Migration and reporting of valid versus quarantined legacy relationships.

## Acceptance criteria

- Association counts reconcile and familiar view/edit workflows pass parity tests.

## Verification

Run migration, authorization, CRUD, aggregate-note, and visual tests.

## Rollback and handoff

Never silently delete quarantined source evidence.
