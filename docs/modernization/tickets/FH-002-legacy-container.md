# FH-002 — Containerize the coherent legacy application

## Objective

Boot the last coherent Rails 2 application locally without changing product behavior.

## Dependencies

FH-001.

## Scope

- Establish a legacy reference from commit `0a00d9a` without overwriting modern planning work.
- Build Ruby 1.9.3-p551, Bundler 1.13.1, Rails LTS 2.3.18.18, and locked gems reproducibly.
- Add environment-driven DB configuration and container entrypoint.
- Vendor browser assets currently fetched over external HTTP.
- Use a minimal Rack-compatible local server and loopback-only binding.

## Exclusions

- No feature changes, schema redesign, public deployment, Passenger, or nginx recreation.

## Acceptance criteria

- Image builds from a clean cache and application boots.
- Login page and static assets render without external network requests.
- Service is accessible only from the intended sandbox/loopback boundary.

## Verification

Build the legacy profile, inspect its health/log output, request the login page, and confirm there are no external browser dependencies.

## Rollback and handoff

Compatibility changes remain isolated from the historical commit and are documented individually.
