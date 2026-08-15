# FH-007 — Current Rails spike

## Objective

Implement the identical vertical slice in maintained Rails as the comparison baseline.

## Dependencies

FH-005.

## Scope

- Maintained Ruby/Rails, PostgreSQL, ERB/Hotwire, and plain CSS.
- Rails authentication foundation and organization-scoped access.
- Implement exactly the FH-006 workflows, migration slice, tests, screenshots, and production image measurements.

## Exclusions

- No feature work beyond the shared spike rubric and no reuse that makes measurements incomparable.

## Acceptance criteria

- The same hard gates, fixtures, viewports, data set, and evidence format used by FH-006 are complete.

## Verification

Run the shared migration, parity, authorization, clean-start, and container rubric.

## Rollback and handoff

Keep spike code isolated until FH-008.
