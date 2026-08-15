# FH-006 — Portable React/Vite/Fastify spike

## Objective

Measure whether the preferred portable TypeScript stack can meet migration, parity, security, and operations gates.

## Dependencies

FH-005.

## Scope

- React stable, Vite, and React Router library mode.
- Fastify JSON API and static asset serving from one origin.
- TypeBox runtime contracts/OpenAPI and Prisma/PostgreSQL persistence.
- Database-backed sessions and organization-scoped data access.
- Implement login, person search/profile, visit sign-in/out, one report/CSV export, and the agreed migration slice.
- Produce one standard OCI image.

## Exclusions

- No Next.js, RSC, Server Actions, edge runtime, proprietary build output, component framework, or unneeded feature work.

## Acceptance criteria

- All hard-gate measurements in `PLAN.md` are recorded reproducibly.
- Clean Compose startup, test suite, Playwright comparison, OpenAPI validation, and OCI execution pass.

## Verification

Run unit/integration/system tests, migration reconciliation, visual capture, clean build, and container smoke test.

## Rollback and handoff

Keep spike code isolated until FH-008; do not treat it as selected architecture early.
