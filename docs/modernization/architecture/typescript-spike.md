# FH-006 TypeScript spike measurements

The spike is isolated in `spike/typescript` and uses React 19/Vite, React Router,
Fastify, TypeBox OpenAPI schemas, Prisma/PostgreSQL, plain CSS, and a database
session cookie. It deliberately contains only the required vertical slice; FH-008
must compare it with FH-007 and decide the selected architecture.

## Reproducible gates

| Gate | Command | Evidence |
| --- | --- | --- |
| Static/client/API test | `bin/verify-typescript-spike` | TypeScript check, Fastify injection health test |
| Runtime contract | `npm run openapi && node scripts/verify-openapi.mjs` | `spike/typescript/openapi.json` |
| Canonical reconciliation fixture | `node test/migration/reconcile.mjs test/migration/expected/edge-cases.json test/migration/expected/edge-cases-ledger.json` | 60 source rows reconcile exactly |
| Clean OCI startup | `docker compose --profile typescript up -d --build --wait` | `/up` at port 3001 |
| Browser smoke | `docker compose --profile typescript-visual run --rm --no-deps typescript-visual` | login, scoped search, and profile navigation from one origin |

The migration recorder consumes the already read-only FH-005 preflight JSON and
persists a migration run, sanitized category counts, and report hash. It does not
claim to be the final full importer; the full source-row transformation and
cutover remain FH-020. The spike nevertheless uses the same deterministic
preflight/reconciliation fixture as the Rails candidate.

## Measured implementation characteristics

The production image has one Node process and serves the Vite build and Fastify
API from one origin. It listens on `PORT` (default 3001), accepts `DATABASE_URL`,
exposes `/up`, and uses no writable application filesystem. Compose publishes only
`127.0.0.1:3001`; PostgreSQL remains on the internal `modern` network.

## Verified result

On 2026-08-16, the `freehub` sandbox completed a clean FH-006 verification:
the TypeScript OCI image built successfully, a newly created PostgreSQL container
applied all three migrations and seeded the non-secret `manager` /
`spike-password` fixture, and `/up` returned `{"status":"ok"}`. The
Compose-contained suite passed two tests, the host suite passed the same two
tests, the OpenAPI document validated ten routes, and the shared edge-case
reconciliation reported `60 source = 32 imported + 28 quarantined; 33 identity
mappings`. The Playwright runner passed the login/search/profile workflow.
