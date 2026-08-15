# FH-001 — Establish the persistent `sbx` environment

## Objective

Make the named `freehub` sandbox the reproducible container host for all later tickets.

## Scope

- Document host-side `sbx create` and `sbx run` lifecycle.
- Verify nested Docker and Compose inside the sandbox.
- Record pinned image names/digests for PostgreSQL, MariaDB, Playwright, Node, Ruby, and the legacy build base.
- Add environment diagnostics and cache/volume recreation instructions.
- Bootstrap and validate `bin/ralph`.

## Exclusions

- Do not repair, mount, or use the host Docker socket.
- Do not add application containers yet.
- Do not place fixtures, credentials, or dumps in sandbox templates.

## Acceptance criteria

- `sbx run --name freehub` reconnects to a sandbox where `docker info` and `docker compose version` succeed.
- Pulled images remain available after disconnect/reconnect.
- `bin/ralph validate` and `bin/ralph status` succeed.
- A documented recreation procedure preserves repository work and recreates disposable container state.

## Verification

```bash
docker info
docker compose version
docker image ls
bin/ralph validate
bin/ralph status
```

## Expected artifacts

Environment documentation, recorded image digests, and verified tracker tooling.

## Rollback and handoff

Sandbox deletion is safe after confirming repository work is committed. A later session resumes from tracker state, not named volumes.

## Implementation notes

- `docs/modernization/environment.md` defines workstation prerequisites, the
  canonical host commands, verification, image inventory, and recovery process.
- `bin/environment-diagnostics` verifies the required nested Docker and Compose
  services while reporting optional tool versions.
- `bin/ralph` and its tests are implemented. Completing this ticket still requires
  host-side creation/reconnection and persistent image-cache verification.
