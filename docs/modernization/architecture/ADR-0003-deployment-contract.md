# ADR-0003: Provider-neutral container deployment

Status: Proposed

Production uses one ordinary OCI application image, managed PostgreSQL, environment-provided secrets, configurable `PORT`, `/up`, stdout/stderr logs, no durable application filesystem, and a separate release command using the same image. No provider-specific runtime API is permitted.
