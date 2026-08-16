# ADR-0002: PostgreSQL and staged legacy migration

Status: Proposed

Modern development and production use PostgreSQL. Consider SQLite as a single tenant fallback. Legacy dumps are restored into isolated MariaDB and migrated through explicit preflight/migrate/reconcile commands. Direct SQL-dump conversion is not supported. FH-005 will finalize the schema and reconciliation policy.
