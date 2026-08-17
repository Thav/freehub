# Modern application foundation

The supported application lives in `modern/`. It uses React/Vite for the client,
Fastify for the API, TypeBox runtime schemas and OpenAPI, Prisma migrations, and
PostgreSQL 18.4. The `modern` Compose profile runs one application image and its
internal PostgreSQL service; only the application is published on port 3001.

Run the fast static and contract checks from the repository root:

```sh
bin/verify-modern-foundation
```

Run the complete disposable-state verification, which deletes only the local
Compose `modern` volumes, rebuilds the image, reapplies migrations, runs tests
and Playwright, verifies PostgreSQL 18, and compares `pg_dump` with the committed
schema artifact:

```sh
bin/verify-modern-foundation-clean
```

The committed `modern/prisma/schema.sql` is generated from PostgreSQL with
`pg_dump --schema-only --no-owner --no-privileges --quote-all-identifiers`.
`npm run schema:check` verifies the artifact contains all FH-005 entities and
the required canonical tenant constraints, checks, triggers, and indexes.
