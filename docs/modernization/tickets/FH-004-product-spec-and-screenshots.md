# FH-004 — Complete the product specification and visual baseline

## Objective

Turn the running legacy app, source, workshop notes, and fixture database into reviewed parity evidence.

## Dependencies

FH-003.

## Scope

- Complete product spec, data dictionary, screen inventory, role matrix, defect register, and parity matrix.
- Create a Playwright manifest for every screen and meaningful state.
- Capture and commit sanitized reference images.
- Record routes, fixture prerequisites, viewport, expected labels, and task sequence.

## Exclusions

- No UX refresh or modern implementation.

## Acceptance criteria

- Every retained workflow has behavioral evidence and at least one relevant screenshot.
- Images receive explicit personal-data review.
- Capture is deterministic from a clean fixture restore.

## Verification

Run static validation, then the full capture twice and confirm stable manifest
coverage and reviewed output:

```bash
node --check test/legacy-visual/capture.mjs
node -e 'JSON.parse(require("fs").readFileSync("test/legacy-visual/manifest.json"))'
sh -n bin/capture-legacy-baseline bin/verify-legacy-baseline bin/approve-legacy-baseline
bin/verify-legacy-baseline
git diff --check
bin/ralph validate
```

`bin/verify-legacy-baseline` must byte-compare two independent clean fixture
restores and the committed approved baseline. Approval additionally requires a
completed per-image `personal-data-review.json`; CSV bodies remain ignored
candidate artifacts and only their headers, sizes, filenames, and hashes are
committed as evidence.

## Rollback and handoff

Regenerate images from fixtures; never hand-edit reference screenshots.
