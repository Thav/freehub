# ADR-0003: Provider-neutral container deployment

Status: Accepted

Production uses one ordinary OCI application image, managed PostgreSQL, environment-provided secrets, configurable `PORT`, `/up`, stdout/stderr logs, no durable application filesystem, and a separate release command using the same image. No provider-specific runtime API is permitted.

The same contract also supports a single-VPS pilot with the app and PostgreSQL
in separate containers. That pilot is an operational option, not an application
dependency, and does not replace managed PostgreSQL TLS, backups, and PITR for
production. See [the production deployment runbook](../production-deployment.md).
