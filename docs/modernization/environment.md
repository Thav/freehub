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

FH-001 must replace the blank digest column after pulling each selected image in
the `freehub` sandbox. Tags aid humans; Compose files must use the immutable digest.

| Purpose | Candidate image | Digest | Selected by |
| --- | --- | --- | --- |
| Modern database | Official PostgreSQL image | pending | FH-009 |
| Migration compatibility | Official MariaDB image | pending | FH-003 |
| Browser capture/tests | Official Playwright image | pending | FH-004 |
| TypeScript build/runtime | Official Node image | pending | FH-006 |
| Modern Rails spike | Official Ruby image | pending | FH-007 |
| Legacy Rails build | Project-owned compatibility image | pending | FH-002 |

Record a pulled image without relying on mutable tags:

```bash
docker image inspect IMAGE --format '{{json .RepoDigests}}'
```

Version selection happens in the owning ticket. This avoids prematurely pinning a
runtime before the two measured stack spikes are complete.

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

The environment used to create this plan has `/usr/bin/docker`, but access to
`/var/run/docker.sock` is denied, and the `sbx` CLI is not installed inside it.
That is expected: sandbox creation and reconnection are host-side operations.
