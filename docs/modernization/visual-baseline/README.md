# Legacy visual baseline

FH-004 treats screenshots as generated parity evidence, not design direction. The
authoritative capture definition is `test/legacy-visual/manifest.json`; approved
images, its exact manifest snapshot, machine evidence, and the personal-data review
live in this directory after approval.

## Generate an unreviewed candidate

Run inside the persistent `freehub` sbx:

```bash
bin/capture-legacy-baseline tmp/legacy-baseline-candidate
```

The command starts from `bin/restore-legacy-fixtures`, builds the digest-pinned
Playwright runner, and writes only below ignored `tmp/`. It captures at 1280×900,
blocks non-local browser requests, removes transient focus, disables animation/caret
rendering and animated GIF pixels, asserts expected labels and task sequences, and
records image/CSV SHA-256 evidence. Runtime-default form times used in screenshots
are replaced with manifest-declared fixture times. The application footer's
decorative six-pixel shadow background is disabled because its legacy background
image loads nondeterministically. Do not move candidate images into Git manually.

## Personal-data review and approval

Inspect the candidate contact sheet and every full-resolution PNG. The capture
generates `personal-data-review.json` beside them with the correct manifest hash and
every screenshot ID. Fill in its reviewer, UTC review date and method; change every
decision from `pending` to `approved` or `rejected`; and record a finding for every
image. Each finding must say whether the image contains only the documented
synthetic fixture data or identify a reason to reject it.

Then run:

```bash
bin/approve-legacy-baseline \
  tmp/legacy-baseline-candidate \
  tmp/legacy-baseline-candidate/personal-data-review.json
```

Approval fails for a manifest hash mismatch, incomplete review, rejected image, or
an existing baseline. Regenerate rather than editing a PNG. Replacing an approved
baseline is intentionally an explicit owner-reviewed operation.

## Determinism verification

```bash
bin/verify-legacy-baseline
```

This performs two independent clean fixture restores and captures, compares every
image and evidence byte-for-byte, then compares the result with the approved
baseline. Exit 2 means the two clean runs matched but no approved baseline exists.
The temporary run directory is printed and retained for inspection.
