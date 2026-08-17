# ADR-0001: Application stack

Status: Accepted

Date: 2026-08-17

## Decision

Use the portable TypeScript stack: React, Vite, React Router, Fastify, TypeBox
and OpenAPI contracts, Prisma, PostgreSQL, plain CSS, and database-backed
sessions. The production application is one Node OCI image serving the static
client and API from one origin.

The Rails spike is not part of the active application. Its source was removed
after this decision; its measurement record remains in
[the archived Rails spike evidence](rails-spike.md) and is recoverable from
commit `95a93d074b032614f5caa21520ce0632a6da4686`.

## Fixed-rubric scorecard

The rubric and preference order come from [the modernization plan](../PLAN.md),
which was written before either spike was measured. A pass means the linked,
reproducible command completed successfully on 2026-08-17.

| Gate | TypeScript | Rails | Reproducible evidence |
| --- | --- | --- | --- |
| Migration reconciliation | Pass: exact `60 = 32 + 28`, 33 mappings | Pass: exact `60 = 32 + 28`, 33 mappings | [TypeScript commands](typescript-spike.md#reproducible-gates); [Rails commands](rails-spike.md#reproducible-gates) |
| Visual and task parity | Pass: login, organization-scoped search, profile navigation | Pass: the same workflow plus visit action | [TypeScript Playwright gate](typescript-spike.md#reproducible-gates); [Rails Playwright gate](rails-spike.md#reproducible-gates) |
| Tenant isolation | Pass: scoped browser workflow and typed API contract | Pass: scoped browser workflow and Rails denial test | [TypeScript evidence](typescript-spike.md#verified-result); [Rails evidence](rails-spike.md#reproducible-gates) |
| Clean setup | Pass: fresh PostgreSQL service, migrations, seed, `/up` | Pass: fresh PostgreSQL service, migrations, seed, `/up` | [TypeScript startup gate](typescript-spike.md#reproducible-gates); [Rails startup gate](rails-spike.md#reproducible-gates) |
| OCI portability | Pass: one Node image, `PORT`, `DATABASE_URL`, `/up`, no durable filesystem | Pass: one Puma image with the same operational contract | [TypeScript characteristics](typescript-spike.md#measured-implementation-characteristics); [Rails characteristics](rails-spike.md#reproducible-gates) |
| Testability | Pass: TypeScript checks, Fastify injection tests, OpenAPI validation, browser test | Pass: Rails tests, migration command, browser test | [TypeScript gates](typescript-spike.md#reproducible-gates); [Rails gates](rails-spike.md#reproducible-gates) |
| Projected parity effort | **1.20x Rails (pass; threshold is 1.50x)** | Baseline: 1.00x | Method below |

## Effort projection

The remaining implementation is the twelve dependent FH-009–FH-020 delivery
tickets. Rails is normalized to 1.00. TypeScript is estimated at 1.20 because
the existing Vite/Fastify/Prisma spike already establishes the cross-cutting
client/API contract, authentication boundary, database session pattern, one
origin OCI runtime, and migration ledger; the remaining incremental cost is
typed API-contract maintenance and client/server wiring in each slice. This is
a 20% allowance for that extra boundary, applied consistently across the
remaining tickets, not a post-hoc preference. It is below the plan's 1.50x hard
limit.

Because every hard gate passed and 1.20x is within the stated limit, the plan
requires selecting TypeScript. A different choice requires a superseding ADR.

## Verification

The following completed on 2026-08-17:

```sh
bin/verify-typescript-spike
bin/verify-rails-spike # before the losing prototype was removed
docker compose --profile typescript up -d --build --wait
docker compose --profile typescript --profile typescript-test run --rm --build typescript-test
docker compose --profile typescript-visual run --rm --no-deps typescript-visual
docker compose --profile rails up -d --build --wait # before removal
docker compose --profile rails --profile rails-migration run --rm rails-migration # before removal
docker compose --profile rails-visual run --rm --no-deps rails-visual # before removal
```
