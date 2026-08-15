# Risks and decisions

| Risk | Treatment |
|---|---|
| Legacy runtime cannot be safely exposed | Local-only isolated containers; vendor required browser assets |
| Sanitized dump differs from production | Repeatable preflight, quarantine, reconciliation, and production rehearsals |
| UI retraining or workflow regression | Committed screenshot manifest and behavior-level parity matrix |
| Cross-organization data exposure | Organization-scoped data access plus denial tests for every resource |
| Framework/provider lock-in | Explicit HTTP API, ordinary OCI image, managed PostgreSQL contract |
| Persistent sandbox mistaken for durable state | Recreate all required state from Git plus approved external fixtures |
| No outbound email | Temporary-password cutover; visibly disabled email-dependent features |
| Concurrent sessions overwrite work | One active tracker ticket and Git-visible claim/completion commits |
