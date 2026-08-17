# FH-007 Rails spike measurements (archived evidence)

The Rails candidate was isolated in `spike/rails`. It used maintained Ruby and
Rails, PostgreSQL, ERB with Turbo, plain CSS, a database-backed canonical schema,
a locked Bundler dependency graph, and an encrypted Rails cookie session. It implements only the comparison slice:
login, organization selection, scoped people search/profile, visit lifecycle,
people CSV export, and migration-accounting persistence.

## Reproducible gates

These commands completed on 2026-08-17 before FH-008 removed the losing
prototype. To reproduce the competitor measurement, check out
`95a93d074b032614f5caa21520ce0632a6da4686` (or inspect that revision) and run
the commands below.

| Gate | Command | Evidence |
| --- | --- | --- |
| Static contract and reconciliation | `bin/verify-rails-spike` | all 15 canonical entities and `60 = 32 + 28`, with 33 mappings |
| Rails tests | `docker compose --profile rails --profile rails-test run --rm rails-test` | health, tenant denial, and immutable visit snapshots |
| Migration slice | `docker compose --profile rails --profile rails-migration run --rm rails-migration` | persisted run plus quarantined issue rows for the shared edge-case preflight report |
| Clean OCI startup | `docker compose --profile rails up -d --build --wait` | `/up` on port 3002 |
| Browser smoke | `docker compose --profile rails-visual run --rm --no-deps rails-visual` | login, organization-scoped search, profile navigation, and visit action |

The production image is a single Puma process. It accepts `DATABASE_URL` and
`PORT`, exposes `/up`, logs to stdout/stderr, does not depend on a durable
application filesystem, and publishes only `127.0.0.1:3002`; PostgreSQL remains
on the internal `rails` network.

The migration recorder consumes the read-only FH-005 report and stores only the
source hash, contract version, report hash, category counts, and deterministic
fingerprints. It intentionally does not retain source rows or credential material;
the complete source transformation remains FH-020.

## Verified result

On 2026-08-16, the `freehub` sandbox completed a clean FH-007 verification. A
new PostgreSQL volume booted the Rails OCI image, applied both migrations, seeded
the non-secret `manager` / `spike-password` fixture, and returned
`{"status":"ok"}` from `/up`. The Compose-contained suite passed three tests;
the migration command persisted one run and quarantined issue rows from the
shared report; and Playwright passed login, scoped search, profile navigation,
and the visit action. The image measured 123,665,441 bytes after this build,
published only `127.0.0.1:3002`, and its PostgreSQL network was internal. The
shared reconciliation remained `60 source = 32 imported + 28 quarantined; 33
identity mappings`.
