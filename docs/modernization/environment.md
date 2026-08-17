# Development environment

The supported Docker host is a persistent sandbox named `freehub`. The workstation
does not need Ruby, MySQL, PostgreSQL, Node, or Playwright installed globally.
Those runtimes belong in project containers so every contributor gets the same
versions.

## Workstation prerequisites

- Git, with this repository checked out on a path visible to `sbx`.
- The `sbx` CLI and its normal host virtualization/container prerequisites.
- Enough disk for two database images, browser images, and legacy build layers
  (allow at least 15 GB while both modernization spikes exist).

Do not grant the project access to the workstation's Docker socket. The nested
Docker daemon managed by `sbx` is the isolation boundary.

## Create and enter the sandbox

Run these commands on the workstation, not from an existing Codex sandbox:

```bash
cd /home/tony/git/freehub
sbx create --name freehub codex /home/tony/git/freehub
sbx run --name freehub
```

Creation is a one-time operation. Use only `sbx run --name freehub` for subsequent
sessions. If the repository lives elsewhere, substitute its absolute host path in
the create command but keep the sandbox name `freehub`.

## Verify the sandbox

Inside `freehub`, run:

```bash
bin/environment-diagnostics
bin/ralph validate
bin/ralph status
```

The diagnostics intentionally fail if Docker or Compose is not usable. Ruby,
database clients, Node, and Playwright are reported for troubleshooting but are
not host requirements. Node 20 or newer is temporarily required to run the
dependency-free tracker until it is wrapped in the development tool container.

## Image inventory

The FH-001 baseline was pulled in the persistent `freehub` sandbox on
2026-08-16. Tags aid humans; Compose files must use the immutable digest.
The owning tickets may replace a baseline only with an updated digest and an
explanation in their verification evidence.

| Purpose | Baseline image | Immutable digest | Selected by |
| --- | --- | --- | --- |
| Modern database | `postgres:18.4-trixie` | `postgres@sha256:a02db8cac496f15b094798a38254f14d6e00741f709360e5e00bb6668ea31636` | FH-001; consumed by FH-009 |
| Migration compatibility | `mariadb:11.8.5` | `mariadb@sha256:345fa26d595e8c7fe298e0c4098ed400356f502458769c8902229b3437d6da2b` | FH-001; consumed by FH-003 |
| Browser capture/tests | `mcr.microsoft.com/playwright:v1.62.0-noble` | `mcr.microsoft.com/playwright@sha256:baed2032d533817f3dbe6425de795788430ba345e819a1201337009ba17c9d07` | FH-001; consumed by FH-004 |
| TypeScript build/runtime | `node:24.18.1-bookworm-slim` | `node@sha256:235600a8101ab264e117b1768e925532262668dc9b581ef1dd7d96ced463b8e7` | FH-001; consumed by FH-006 |
| Modern Rails spike | `ruby:4.0.6-slim-trixie` | `ruby@sha256:607bf92fa7ecebb4a0c6654b62cb44c48d94b36b6f5a754611ddbbe3dc5b6135` | FH-001; consumed by FH-007 |
| Legacy Rails build base | Project-owned Ruby 1.9.3-p551 compatibility image | Ruby `v1_9_3_551` commit `a32f3789244b5f976dfaee75b06a91e3b4a18182` | FH-002; built from `legacy/Dockerfile` |

Record a pulled image without relying on mutable tags:

```bash
docker image inspect IMAGE --format '{{json .RepoDigests}}'
```

The image names above are cache baselines, not application containers. FH-002
will define the project-owned legacy compatibility image; FH-006 and FH-007
will measure their respective stack choices against these bases.

## Version and support policy

The baseline was reviewed on 2026-08-16 against the upstream release policies:

- PostgreSQL 18.4 is the current stable major; PostgreSQL 18 is supported through
  November 2030.
- MariaDB 11.8 is the current Community Server LTS series, maintained through
  June 2028.
- Node 24.18.1 is the current Node.js LTS release line.
- Ruby 4.0.6 is the current stable release and is in normal maintenance.
- Playwright has no LTS release line. Use the current pinned release for its
  browser-test image and update it deliberately with the paired test dependency.

Ruby 1.9.3-p551 is an intentional exception: it is end-of-life and may be used
only in the isolated, non-production legacy compatibility image. FH-002 must
not expose it to the modern application's runtime or production image.

PostgreSQL 18 uses the versioned default data directory
`/var/lib/postgresql/18/docker`. Any later Compose configuration must mount the
parent `/var/lib/postgresql` volume or set `PGDATA` deliberately; it must not
reuse a PostgreSQL 16 data volume.

## Cache persistence check

After reconnecting to `freehub`, verify that the cache survived before pulling
anything again:

```bash
docker image inspect postgres:18.4-trixie mariadb:11.8.5 \
  mcr.microsoft.com/playwright:v1.62.0-noble node:24.18.1-bookworm-slim \
  ruby:4.0.6-slim-trixie \
  --format '{{index .RepoTags 0}} {{index .RepoDigests 0}}'
```

On 2026-08-16, this command succeeded from a fresh Docker invocation in the
`freehub` sandbox after the images were pulled. If a sandbox is deliberately
recreated, rerun the documented pulls or build from the pinned digests; cache
loss is expected and does not affect committed repository work.

## Persistence and recovery

Repository files are the durable source of truth. The sandbox's image cache and
named volumes are disposable accelerators, never the only copy of source, fixtures,
or migration logic.

Before recreating the sandbox:

1. Confirm `git status` and preserve all intended repository changes.
2. Export any diagnostic artifact that a ticket explicitly requires.
3. Use the locally installed `sbx --help` to confirm the exact removal command;
   CLI removal syntax is deliberately not guessed here.
4. Recreate the sandbox with the command above.
5. Rebuild containers from committed Compose files and reload sanitized fixtures.

Do not copy database volumes between incompatible engine versions. Rebuild them
from the sanitized dump or deterministic fixtures instead.

## Current-environment finding

The `sbx` CLI is intentionally host-side and is not expected inside the
`freehub` sandbox. Inside the sandbox, `docker info`, `docker compose version`,
and `bin/environment-diagnostics` must succeed against its nested daemon.

On 2026-08-16, FH-006 verified the current daemon as `freehub` / Docker 29.7.1
with Docker Compose v5.4.0. Agent commands need the sandbox's Docker access
permission; once granted, they use this same nested daemon successfully.

### Instructions for agents already inside `freehub`

Do not run `sbx`, search for its binary, or request a host Docker socket. Those
actions are incorrect from an agent session and the missing host-only CLI is not
a blocker. Request sandbox Docker permission if needed, then use `docker` and
`docker compose` directly.

Before diagnosing a build as blocked, check these separate concerns in order:

1. `docker info --format '{{.ServerVersion}} {{.Name}}'` confirms nested-daemon
   access (the expected name is `freehub`).
2. `env | rg -i '^(http|https|no)_proxy='` identifies the sandbox proxy inputs.
3. A failing language dependency fetch may require the sandbox proxy CA in the
   pinned base image; preserve certificate verification and add the CA rather
   than using insecure skip-verify flags.
4. A native extension failure such as `make: not found` is a base-image/toolchain
   issue. Test the required package path separately before changing the image.

The proxy is not a generic Debian mirror: package retrieval through it may be
denied while RubyGems or npm works. Record the exact command, protocol, and
error (for example direct timeout versus proxy `403`) in a ticket's blocker or
verification evidence so the host owner can repair the right service.

#### Policy-addition request procedure

When direct access to a necessary dependency host is denied and the proxy is
not usable for that protocol, agents must ask the user—not attempt the policy
change themselves—for a least-privilege `sbx policy` network addition. A useful
request contains:

1. the exact hostname or wildcard required (for the Rails builder, the observed
   Debian endpoints are `deb.debian.org` and its `*.debian.org` paths);
2. the reproducing direct and proxy commands plus their different errors;
3. the dependency justification (for example, `build-essential` and `libpq-dev`
   are required to compile native Ruby gems); and
4. the verification command to run after the user changes policy.

The repository owner must confirm the local `sbx policy --help` syntax and run
the host-side command. Agents then rerun the narrow package or language-fetch
probe. Do not request blanket network access, disable TLS verification, or use
the workstation Docker socket as a workaround.
