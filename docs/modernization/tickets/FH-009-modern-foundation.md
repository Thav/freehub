# FH-009 — Establish the modern application foundation

## Objective

Turn the selected spike into the supported application skeleton.

## Dependencies

FH-008.

## Scope

- Final project layout, canonical schema migrations, seeds, fixtures, configuration, structured errors/logging, audit fields, CI, `/up`, and production image.
- Materialize the FH-005 contract as versioned PostgreSQL migrations using the
  selected stack's conventional migration mechanism. Commit a generated PostgreSQL
  schema artifact (for example `schema.sql`) and a contract-conformance check; the
  FH-005 JSON is a cross-stack contract, not executable DDL.
- If TypeScript wins, establish `/api/v1`, shared runtime schemas, and OpenAPI drift checks.

## Acceptance criteria

- Clean setup, database creation, test suite, health check, static/security checks, and image build pass.
- Applying migrations to an empty PostgreSQL 18 database produces a reviewable
  schema artifact with every FH-005 entity, key, foreign key, tenant constraint,
  enum/check constraint, and required index. The conformance check fails on drift.

## Verification

Execute the documented clean-machine workflow inside a fresh disposable container state.

## Rollback and handoff

Foundation changes remain feature-neutral and reproducible from Git.
