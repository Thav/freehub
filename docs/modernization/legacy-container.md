# Legacy container compatibility notes

FH-002 builds the historical application from commit `0a00d9a` into the
project-owned `freehub-legacy` image. The historical source remains untouched:
`bin/prepare-legacy-reference` creates the ignored `.legacy-build/reference`
build context and applies only the compatibility adaptations below.

## Local operation

```bash
bin/prepare-legacy-reference
docker compose --profile legacy up --build
```

## Reproducible sanitized data and fixtures

FH-003 restores the approved sanitized archive and then adds a separate,
synthetic fixture organization. The archive remains ignored under `inbox/`;
only its required filename and extracted SQL checksum are committed. From the
repository root, run:

```bash
bin/restore-legacy-fixtures
```

The command recreates the disposable Compose volume, verifies the archive's
extracted SQL SHA-256 (`971fa9dfcd1b167265c9dd535b803df025a2d244dfb8b1240829e238eb88e17a`),
loads the sanitized source, applies `legacy/fixture-data.sql`, starts the app,
and prints fixture and all-record aggregate counts. A differently located archive can be
selected with `LEGACY_ARCHIVE=/path/to/archive.zip`.

The safe fixture logins are `fixture_manager` (Fixture Workshop),
`fixture_empty` (Fixture Empty Workshop), and `fixture_observer` (permission
denial); all use password `fixture-password`. The fixture organization key is
`fixture-lab`; its stable IDs provide current member (900001), expired member
(900002), patron (900003), staff/volunteer (900004), validation target
(900005), an open visit (900001), a completed volunteer visit (900002), every
service type (900001–900004), tags (900001–900003), notes (900001–900003), and
21 pagination people (900006–900026), all tagged with pagination tag 900003.
`fixture-empty` supplies empty-result
screens. Validation screens use the normal new-person form without a first
name; they do not require a persisted invalid record.

To recreate the state again, rerun the command. To discard it, run
`docker compose --profile legacy down -v`; no named volume is authoritative.
Use `bin/legacy-aggregate-counts` at any time to print only the aggregate
counts used for repeat-restore comparison.

The application is published only to `127.0.0.1:3000`. MariaDB is reachable
only through the internal `legacy` network; the application's separate ingress
network is required for Docker to publish the loopback endpoint. Build-time
dependency access inherits the invoking shell's optional `HTTP_PROXY`,
`HTTPS_PROXY`, and `NO_PROXY` variables. The sbx shell already provides these
values; a normal outside Docker host leaves them unset and builds directly. The
generated build context contains the CA bundle needed by sbx's TLS-inspecting
proxy.

## Compatibility adaptations

- Ruby is built from `ruby/ruby` tag `v1_9_3_551` at commit
  `a32f3789244b5f976dfaee75b06a91e3b4a18182`.
- Ruby's omitted generated parser files are fetched from Debian Sources and
  SHA-256 verified in `legacy/Dockerfile`; this avoids regenerating them with
  an incompatible modern Bison.
- OpenSSL `OpenSSL_1_0_2u` at commit
  `e818b74be2170fbe957a07b0da4401c2b694b3b8` is built for Ruby 1.9.3's
  extension API. Ruby uses the generated context's CA bundle for TLS.
- The mysql-2.9.1 locked gem compiles against the MySQL 5.5 headers and client
  library from the digest-pinned Ruby 2.1 bootstrap image; modern MariaDB
  headers removed the legacy `MYSQL#reconnect` field.
- The legacy external jQuery reference is replaced with the version already
  bundled in the historical Blue Ridge plugin. It is loaded once before
  Prototype/script.aculo.us so the latter retains its required global `$`
  helper; the trailing analytics block is removed from the generated layout.
  Ordinary outbound footer links remain hyperlinks, not browser-loaded
  dependencies.
- Authorization 1.0.12 is given a generated initializer that uses
  `instance_variable_defined?` for model lookup. Ruby 1.9 exposes controller
  instance-variable names as symbols, while the gem expects strings; without
  this compatibility shim all manager routes fail before application code runs.
  The same shim replaces the gem's missing `User#uri` denial target with the
  signed-in user's organization (or the public root).
- `script/server` runs WEBrick through Ruby with the application root on the
  load path. Migrations are invoked programmatically so Ruby 1.9's Test::Unit
  autorun does not treat `db:migrate` as a test filename.

No production deployment, Passenger, nginx, product behavior, or historical
source files are changed by this workflow.
