# FH-008 — Select and record the application stack

## Objective

Apply the predetermined rubric without introducing a new preference after seeing results.

## Dependencies

FH-006 and FH-007.

## Scope

- Compare migration reconciliation, visual/task parity, tenant isolation, clean setup, OCI portability, testability, and projected parity effort.
- Select TypeScript if it passes every hard gate and projected effort is at most 1.5 times Rails; otherwise select Rails.
- Complete ADR-0001 and archive/remove losing prototype code from the active tree.

## Acceptance criteria

- Every score links to reproducible evidence.
- ADR-0001 is Accepted and the active application has one unambiguous stack.

## Verification

Re-run the decisive checks and validate all ADR links.

## Rollback and handoff

The losing spike remains recoverable from Git history; reversing the ADR requires a superseding ADR.
