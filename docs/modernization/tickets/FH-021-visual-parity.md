# FH-021 — Restore screenshot-by-screenshot visual parity

## Objective

Restore the retained legacy application's information architecture and visual
continuity so current users can find the same information and actions without
relearning established workflows.

## Dependencies

FH-018.

## Scope

- Execute `docs/modernization/visual-parity-plan.md` against every retained FH-004
  screenshot, workflow probe, and CSV artifact.
- Restore logged-in identity, person dashboard states and aggregates, complete
  person form fields/order, visit/service/note/tag list/detail/form structure,
  report descriptions/filters/columns, and shared date-range report navigation.
- Apply the resulting shared design language to modern-only import and bulk
  management workflows.
- Generate deterministic modern comparison candidates for full-resolution owner
  review without committing unreviewed screenshots or personal data.

## Exclusions

- Do not restore obsolete Engine Yard credits, third-party runtime chart assets,
  public signup/reset-token flows, permanent deletion, cross-tenant lookup, or
  other behavior retired by `docs/modernization/current-product-spec.md`.
- Visual parity does not mean reproducing legacy accessibility defects or breaking
  responsive behavior.

## Acceptance criteria

- Every entry in the screenshot-by-screenshot matrix has implemented modern
  evidence or a documented, owner-approved replacement decision.
- The authenticated header identifies the current user and retains familiar
  organization navigation and logout placement.
- All four profile role/membership states preserve sign-in, membership/contact,
  tag, rolling-hour, recent visit, recent service, and recent note information.
- Person and service forms preserve retained fields and recognizable order;
  service and visit detail pages use readable labeled values.
- Reports retain their explanatory index content, type-specific filters and
  columns, semantic type navigation, one date range across type changes, valid
  empty states, pagination, and export behavior.
- Desktop comparison candidates and responsive checks pass without committing
  unreviewed screenshots.

## Verification

Run API/integration coverage for newly exposed data, Playwright coverage for every
retained screen family and task transition, deterministic comparison capture,
full-resolution owner review, `npm run check`, Compose test/visual profiles,
`bin/verify-modern-foundation`, `git diff --check`, and `bin/ralph validate`.

## Rollback and handoff

The approved FH-004 baseline remains immutable. Application changes are separable
by shared primitives and screen family; temporary comparison output stays under
ignored `tmp/`. FH-019 follows after owner acceptance.
