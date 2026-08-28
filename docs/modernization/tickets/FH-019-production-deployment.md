# FH-019 — Provider-neutral production deployment

## Objective

Prove the application can run on a generic container PaaS with managed PostgreSQL.

## Dependencies

FH-016, FH-017, FH-018, and FH-021.

## Scope

- One OCI image, configurable `PORT`, `/up`, stdout/stderr logs, environment secrets, no durable local filesystem, and a release command from the same image.
- Managed PostgreSQL TLS, backups/PITR, health checks, staging, rollback, and optional SMTP.
- A provider-neutral single-VPS pilot may run app and PostgreSQL in separate containers, with bounded operator access for logs, backup/restore, and emergency user management. It must not become an application or provider dependency.

## Exclusions

- No provider-specific application SDK, Next.js build/runtime, or manually operated VPS requirement.

## Acceptance criteria

- Staging deploy, migration, health checks, backup restore, SMTP-disabled operation, and image rollback succeed.

## Verification

Run `bin/verify-production-deployment` for the production image contract and
disposable disaster-recovery exercise. Review
`docs/modernization/production-deployment.md` for the staging, managed database,
Oracle VPS pilot, operator access, and rollback procedures.

## Rollback and handoff

Previous application image and database recovery point remain addressable.
