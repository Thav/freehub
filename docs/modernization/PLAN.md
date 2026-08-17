# Freehub modernization plan

## Outcomes

1. Reproduce the coherent Rails 2 application locally and capture a reviewed visual and behavioral baseline.
2. Migrate all valid legacy data to PostgreSQL while explicitly reconciling invalid and orphaned records.
3. Compare a portable React/Vite/Fastify implementation with a current Rails implementation using the same vertical slice and hard gates.
4. Restore feature parity before changing established workflows.
5. Add CSV import and reversible bulk archival.
6. Ship one provider-neutral OCI image backed by managed PostgreSQL.

Next.js, React Server Components, Server Actions, proprietary build outputs, and provider-specific application APIs are excluded.

## Repository findings

- `0a00d9a` is the last coherent legacy baseline. Current `master` contains Rails 2 application code with an incompatible Rails 7 dependency set.
- `origin/rails-latest` is an incomplete 2023 prototype. Its migration, export, pagination, and testing ideas may be ported selectively; the branch must not be merged wholesale.
- Executable FH-005 preflight supersedes the early dump estimate: the supplied sanitized dump contains one organization, one user, one role and role join, 12 people, 6,832 visits, 119 services, 13,543 notes, 79 taggings, and eight tags.
- Sanitization left 11,346 orphaned notes, 61 orphaned taggings, four tags without a valid organization, three MySQL zero arrival datetimes, and one duplicate normalized phone. Migration must account for these rather than silently dropping them.

## Runtime strategy

Use a persistent sandbox created from the host shell:

```bash
sbx create --name freehub codex /home/tony/git/freehub
sbx run --name freehub
```

The sandbox's nested Docker daemon is the only supported container host. Its image cache persists across reconnects. Repository files, not container volumes, are the durable source of truth.

Verified 2026-08-16 during FH-006: the active `freehub` sandbox exposes Docker
29.7.1 and Docker Compose v5.4.0. Commands run from an agent session may require
the sandbox Docker permission, but must target this nested daemon—not a host
socket or another Docker context.

### Agent container rule

`sbx create` and `sbx run` are **workstation-host commands only**. An agent
already executing for this repository is inside the persistent `freehub`
sandbox. It must not try to find or invoke `sbx`, and it must not treat the
absence of that host-only CLI as a blocker. After obtaining the sandbox Docker
permission, run ordinary `docker …` and `docker compose …` commands directly.
They reach the nested daemon named `freehub`; do not mount, forward, or target a
workstation Docker socket.

The sandbox normally supplies `HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`.
Pass them as existing Compose build arguments where the Compose file supports
them. When a build fails, distinguish a Docker-permission failure from a proxy
TLS, package-mirror, or compiler-tool failure before blocking a ticket. Do not
disable TLS verification merely to make a dependency install succeed; install
or provide the required proxy CA instead.

If a required dependency host is blocked directly and the proxy cannot serve
that protocol (for example, apt receives a proxy `403`), request a narrowly
scoped host-side `sbx policy` network addition from the repository owner. State
the exact hostname or host pattern, the reproducing command and error, why the
build needs it, and the smallest expected package set. Do not change sandbox
policy yourself, request broad internet access, or substitute a host socket.
After the owner applies the policy, retry the exact failing command before
changing application code or marking the ticket blocked.

Compose will provide `legacy`, `modern`, and `test` profiles. No host installation of Ruby, Rails, PostgreSQL, MariaDB, or Playwright is required.

## Architecture gate

The TypeScript candidate uses React stable, Vite, React Router in library mode, Fastify, TypeBox/OpenAPI contracts, Prisma/PostgreSQL, plain CSS, and a database-backed session system. A multi-stage build places the static UI and API in one ordinary Node OCI image and one origin.

The Rails candidate uses maintained Ruby and Rails, PostgreSQL, server-rendered ERB/Hotwire, plain CSS, and Rails' authentication foundation.

Both implement login, organization selection, person search/profile, visit sign-in/out, one report/export, a migration slice, Playwright parity coverage, and a production image. TypeScript wins if it passes every migration, parity, authorization, clean-start, and portability gate and projected parity effort is no more than 1.5 times Rails. If both pass, TypeScript is preferred. Otherwise Rails wins. Evidence is recorded in ADR-0001.

## Product defaults

- Preserve multi-organization support.
- Roles are platform administrator, organization manager, and organization operator.
- Organizations are provisioned by platform administrators; public organization signup is removed.
- Organization timezone controls reporting boundaries.
- Membership is inclusive of its start and end dates.
- Visits retain immutable staff/member snapshots and duration seconds for historical reporting.
- All resource access is scoped through the authenticated organization.
- Archived people are excluded from ordinary search and check-in but remain reportable, exportable, and restorable.
- Legacy SHA-1 password hashes are never migrated. Cutover uses temporary passwords that must be changed at first login.

## Data migration

Restore dumps into an isolated MariaDB source container, then run explicit `preflight`, `migrate`, and `reconcile` commands. Preserve source IDs where safe. Convert zero-dates to null with a migration issue, quarantine orphaned relationships, normalize contacts without altering display values, and require source count to equal imported plus quarantined count. The source database is never mutated.

## New functionality

CSV import supports a documented Freehub template and the supplied Corsizio format. Preview identifies creates, existing matches, warnings, and errors. Matching uses organization-scoped normalized email, phone, or first-plus-last name. V1 skips rather than updates existing matches, imports valid rows, and generates a rejection report.

Bulk management filters by created date, last visit, or never visited. Managers may preview, export, archive, and restore. V1 has no automatic or bulk permanent deletion.

## Deployment and cutover

The production image listens on configurable `PORT`, exposes `/up`, logs to stdout/stderr, uses `DATABASE_URL`, has no durable filesystem dependency, and supports a release/migration command. SMTP is optional. Production uses a generic container PaaS and managed PostgreSQL with TLS, backups/PITR, health checks, and rollback.

Cutover uses a maintenance window: make legacy read-only, take a final dump, run migration and reconciliation, execute automated and manual checks, issue temporary passwords, and then switch traffic. Retain the legacy system read-only through the rollback window.

## Execution

Implementation order and acceptance criteria are defined by `TRACKER.yml` and the individual ticket files. Every feature slice includes migration coverage, authorization tests, Playwright coverage, visual comparison, and staging verification where applicable.
