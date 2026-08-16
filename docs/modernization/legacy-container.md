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
  bundled in the historical Blue Ridge plugin. The trailing analytics block is
  removed from the generated layout. Ordinary outbound footer links remain
  hyperlinks, not browser-loaded dependencies.
- `script/server` runs WEBrick through Ruby with the application root on the
  load path. Migrations are invoked programmatically so Ruby 1.9's Test::Unit
  autorun does not treat `db:migrate` as a test filename.

No production deployment, Passenger, nginx, product behavior, or historical
source files are changed by this workflow.
