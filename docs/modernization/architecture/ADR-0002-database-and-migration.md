# ADR-0002: PostgreSQL and staged legacy migration

Status: Proposed

## Context

The legacy dump has 11 database foreign keys for people/services/visits and audit
users, but its polymorphic/global notes, taggings, roles, and role joins do not
express tenant ownership consistently. The sanitized source contains invalid
unenforced relationships and historical temporal anomalies that direct SQL
conversion would silently lose or reinterpret. Both architecture spikes need one
data contract and one accounting standard.

## Proposed decision

Modern development and production use PostgreSQL 18 or newer. The normative,
stack-neutral schema and transformations are defined by
`docs/modernization/canonical-schema.json`, `canonical-data-contract.md`, and
`migration-rules.json`.

Those JSON and Markdown files are contract inputs, not executable DDL. After stack
selection, FH-009 must express the contract as versioned PostgreSQL migrations in
the selected framework's conventional format, generate and commit a PostgreSQL
schema artifact, and fail a conformance check when migrations and the contract
drift.

Legacy dumps are restored into an isolated MariaDB source container and processed
through explicit `preflight`, `migrate`, and `reconcile` phases. Preflight and
migration read the source in read-only transactions. Every source table must satisfy
`sourceCount = importCandidates + quarantined`; reconciliation additionally proves
canonical outputs through legacy identity mappings. Direct SQL-dump conversion is
not supported.

SQLite may be evaluated later as a single-tenant development or fallback adapter,
but it cannot weaken tenant keys, constraints, timezone behavior, migration
accounting, or PostgreSQL production portability and is not part of FH-006/FH-007's
shared gate.

## Consequences

- Invalid relationships are durable migration issues or quarantine records, never
  silently dropped rows.
- Global legacy tags fan out into organization-owned tags with explicit ID maps.
- Historical visit snapshots and anomalous source times remain explainable without
  permitting invalid new writes.
- The ADR remains proposed until the owner accepts FH-005; both spikes must report
  any implementation pressure to change the canonical contract rather than adding
  candidate-specific semantics.
