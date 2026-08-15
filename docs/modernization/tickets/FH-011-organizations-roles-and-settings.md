# FH-011 — Organizations, roles, and settings

## Objective

Restore multi-tenant organization management with explicit authorization.

## Dependencies

FH-010.

## Scope

- Platform-admin provisioning, manager/operator membership, organization timezone/location/settings, and user administration.
- Remove public organization signup.
- Scope every query and mutation through authorized organization membership.

## Acceptance criteria

- Role matrix is implemented and cross-organization access fails for reads and writes.
- Settings retain the approved legacy layout and terminology where applicable.

## Verification

Run exhaustive role and tenant-isolation integration/system tests.

## Rollback and handoff

Role changes are audited and revocable.
