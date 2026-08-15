# FH-019 — Provider-neutral production deployment

## Objective

Prove the application can run on a generic container PaaS with managed PostgreSQL.

## Dependencies

FH-016, FH-017, and FH-018.

## Scope

- One OCI image, configurable `PORT`, `/up`, stdout/stderr logs, environment secrets, no durable local filesystem, and a release command from the same image.
- Managed PostgreSQL TLS, backups/PITR, health checks, staging, rollback, and optional SMTP.

## Exclusions

- No provider-specific application SDK, Next.js build/runtime, or manually operated VPS requirement.

## Acceptance criteria

- Staging deploy, migration, health checks, backup restore, SMTP-disabled operation, and image rollback succeed.

## Verification

Run the production image contract suite and documented disaster-recovery exercise.

## Rollback and handoff

Previous application image and database recovery point remain addressable.
