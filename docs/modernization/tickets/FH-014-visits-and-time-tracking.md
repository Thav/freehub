# FH-014 — Visits and time tracking

## Objective

Restore front-desk project/volunteer attendance and accurate historical reporting.

## Dependencies

FH-012.

## Scope

- Arrival, Project/Volunteer selection, sign-in, sign-out, correction, removal rules, daily/historical navigation, notes, duration seconds, and immutable member/staff snapshots.
- Interpret report boundaries in organization timezone.

## Acceptance criteria

- Incomplete visits, daylight-saving transitions, corrections, and historical classifications behave as specified.

## Verification

Run time-zone, duration, snapshot, authorization, and Playwright daily-list tests.

## Rollback and handoff

Corrections preserve audit attribution.
