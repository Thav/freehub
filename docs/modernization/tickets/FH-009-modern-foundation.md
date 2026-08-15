# FH-009 — Establish the modern application foundation

## Objective

Turn the selected spike into the supported application skeleton.

## Dependencies

FH-008.

## Scope

- Final project layout, canonical schema migrations, seeds, fixtures, configuration, structured errors/logging, audit fields, CI, `/up`, and production image.
- If TypeScript wins, establish `/api/v1`, shared runtime schemas, and OpenAPI drift checks.

## Acceptance criteria

- Clean setup, database creation, test suite, health check, static/security checks, and image build pass.

## Verification

Execute the documented clean-machine workflow inside a fresh disposable container state.

## Rollback and handoff

Foundation changes remain feature-neutral and reproducible from Git.
