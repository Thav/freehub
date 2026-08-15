# FH-010 — Authentication and sessions

## Objective

Replace legacy authentication securely while supporting a no-SMTP cutover.

## Dependencies

FH-009.

## Scope

- Login/logout, modern password hashing, database sessions, expiry/revocation, forced password change, disabled users, CSRF defenses, and temporary-password administration.
- Display each generated temporary password once; never log it.

## Exclusions

- Do not migrate SHA-1 hashes or require an external identity provider.

## Acceptance criteria

- Authentication and session security tests pass with SMTP enabled and disabled.
- Migrated users cannot authenticate until provisioned through the approved cutover flow.

## Verification

Run password, session, CSRF, revocation, forced-change, and secret-redaction tests.

## Rollback and handoff

Account identities remain; sessions and temporary credentials can be revoked safely.
