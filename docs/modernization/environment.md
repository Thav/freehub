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
| Modern database | `postgres:16-bookworm` | `postgres@sha256:60f4761b9035e0b8d5218f701a8c3382f641bf12b1604822574cf5be3baeb537` | FH-001; consumed by FH-009 |
| Migration compatibility | `mariadb:10.11` | `mariadb@sha256:de61fed4a40d3842f3ee09944ba52792156cfd9adf489b2cc670fc6ded28df8d` | FH-001; consumed by FH-003 |
| Browser capture/tests | `mcr.microsoft.com/playwright:v1.52.0-jammy` | `mcr.microsoft.com/playwright@sha256:ff2946177f0756c87482c0ef958b7cfbf389b92525ace78a1c9890281d0d60f4` | FH-001; consumed by FH-004 |
| TypeScript build/runtime | `node:22-bookworm-slim` | `node@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436` | FH-001; consumed by FH-006 |
| Modern Rails spike | `ruby:3.3-slim-bookworm` | `ruby@sha256:41120b37f3a8147ae5dbca5020b5be4dafaa8ffa589ee539d184dad0ba0b5ae5` | FH-001; consumed by FH-007 |
| Legacy Rails build base | `ruby:2.7.8-bullseye` | `ruby@sha256:2347de892e419c7160fc21dec721d5952736909f8c3fbb7f84cb4a07aaf9ce7d` | FH-001; FH-002 builds the project-owned compatibility image from it |

Record a pulled image without relying on mutable tags:

```bash
docker image inspect IMAGE --format '{{json .RepoDigests}}'
```

The image names above are cache baselines, not application containers. FH-002
will define the project-owned legacy compatibility image; FH-006 and FH-007
will measure their respective stack choices against these bases.

## Cache persistence check

After reconnecting to `freehub`, verify that the cache survived before pulling
anything again:

```bash
docker image inspect postgres:16-bookworm mariadb:10.11 \
  mcr.microsoft.com/playwright:v1.52.0-jammy node:22-bookworm-slim \
  ruby:3.3-slim-bookworm ruby:2.7.8-bullseye \
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
