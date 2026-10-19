# Docker/Citizen alignment acceptance

Initial acceptance: 2026-10-08. Production acceptance: 2026-10-19.
Standard: **0.5-draft**.

Status: **Complete.** Shared build/development/database alignment and the production
follow-ups are accepted.

## Production acceptance — 2026-10-19

The operator confirmed production verification on 2026-10-19 and requested migration
closure. This closes live adoption of the aligned production scripts, portable
credential loading, and the application-password follow-up. Rotation was scoped to
the `jaysylvester` application login and production `DB_PASSWORD`; the separately
established `postgres` administrator password was retained.

The normal deployment command is `./scripts/prod deploy`; it builds the production
images before recreating app and then proxy and running the smoke test. No separate
initial image-build step is required for this workflow.

Acceptance is based on the operator's confirmation; this documentation update did
not access production. The original migration's runtime, TLS renewal and recovery
evidence remains in the
[migration record](plans/docker-migration.md).

## Initial local source and tools — 2026-10-08

- Branch/base commit: `main` / `42c768af83e601709c3d1a3cff94fa5831dd0b7e` plus the uncommitted alignment
  working tree. This initial local evidence does not identify the later production
  release.
- Lockfile SHA-256: `591d124ce88650f0776beeed74d212f6b37daa47518a8736ead9be499dfb7510`.
- Docker Desktop engine 29.8.0; Node image `node:24-bookworm-slim`
  (Node 24.21.0, image npm 11.19.0); PostgreSQL `postgres:17-bookworm`;
  Nginx `nginx:1.28-alpine`; Compose 5.5.1, which supports `!reset` and the production start flags.
- Canonical development project: `jaysylvester`; accepted database volume:
  `jaysylvester-postgres`. Existing data and the running workstation stack were preserved.
- Intentional project inputs: Handlebars app; existing jaysylvester-production-postgres/logs volumes retained; static production Nginx upstream requires proxy recreation after app recreation. Frozen web/shoplc nested legacy demo remains separate from root preparation.

## Local evidence

- `test:dev`: 31 dependency/lifecycle cases passed, including two real offline
  Git/npm cases for changed declarations and same-branch/same-version advancement.
- `test:db`: 12 mocked initialization/backup/restore guard/failure cases passed.
- `test:compose`: standalone, shared-edge and production boundaries passed.
- `lint`: passed in Docker, including the current host script files.
- `test:prod`: 13 mocked production cases passed, including sudo, read-only drift,
  partial builds, retention, ordering, reporting, and ignoring networks/secrets when
  inspecting configured volumes.
- Both development and production app/proxy images built through `scripts/build`.
  Manifest-only drift was prepared generically; unchanged dependencies remained
  locked. Production images still copy the committed compiled assets.
- Disposable real PostgreSQL checks passed: interactive initialization, normal-db
  credential/hook boundaries, app CRUD and denied privileges, protected/checksummed
  backup, empty-target restore, prior service-state restoration, populated-target
  refusal and non-administrator grant refusal.
- Disposable real development start/routing checks passed: root and representative
  dynamic route, static CSS, 404 and BrowserSync client. A forced app address change
  recovered through the existing proxy via Docker DNS without recreating proxy.
- Production proxy `nginx -t` passed in an isolated container with temporary TLS
  fixtures and no production data or published ports.
- Disposable verification containers, volumes, certificates and fixture data were
  removed. No production environment or live-site smoke command was accessed.

## Scope retained

No new full initial asset build or strict one-off compiler behavior was introduced.
The existing watcher and manual asset task remain unchanged. Jaysylvester has no
remaining migration or alignment-rollout acceptance items following the operator's
production verification above. Original Trilogy's migration remains separate.

The following review notes record local checks performed before live adoption.

Review follow-up: the corrected volume parser matched locally rendered production
Compose output with placeholder secrets. Development app/assets were refreshed with
`./scripts/dev start -d`, and retained cached proxies were explicitly recreated from
current tags. Final app/assets/proxy image IDs match their development tags across
all three projects; this project's development smoke suite passed afterward. Named
data volumes were preserved, and production was not accessed.

## Explicit dependency refresh — 2026-10-08

`./scripts/dev start --update citizen -d` passed on the canonical local stack.
The manifest remains `git+https://github.com/jaysylvester/citizen.git#2.0`;
the lock and the running app's installed-package lock both resolve to
`eae56c9914b9f3c29a703bb0fbffda140eb9c101`, matching the public branch head at verification.
The refresh advanced Citizen from `c6610ace80046f294ac85d358a75fd6f3880f6fd`.

The generic repeatable flag is also available on `scripts/build`. Ordinary starts
retain unchanged locked resolutions, and locked production builds reject refresh.
All 31 development/dependency cases, Docker lint, and this project's local smoke
suite passed. The common-helper comparison matches the reference. No production
environment was accessed; existing named data volumes were retained.
Npm also adjusted Acorn resolutions while refreshing Citizen; no root dependency
declarations changed.

## Portable credential loading — 2026-10-19

Implemented as a supplemental change to the completed build/deployment alignment.
Local validation is recorded below; production acceptance was confirmed by the
operator on 2026-10-19.

The application-owned `app/helpers/secrets.js` exports `readSecret(name)`, exposed by
Citizen as `app.helpers.secrets.readSecret()`. A nonempty `name + '_FILE'` path takes
precedence; otherwise the helper reads `process.env[name]`. An explicit unreadable
file fails without fallback. The rule is independent of `NODE_ENV`; startup uses base
names `DB_PASSWORD` and `MAIL_AUTH_PASS`. Development still logs mail.

Configured mail credentials remain in local `.env` for production-mode tests; keys
must not be excluded merely because development does not send mail. Existing local
credential values were retained. The forum importers preserve available mail keys
and continue excluding administrator credentials. Docker production sources app
secrets from host `.env` and mounts scoped files; native execution can use Citizen's
`.env` loading without Docker. See the [framework contract](../../project-framework/project-reference.md#startup-secret-reads-c-deployed-application).

Validation (2026-10-19): `test:dev` passed 39 cases, `test:db` passed 12,
`test:prod` passed 13,
and lint/Compose boundaries passed. Across the three apps and substituted reference,
all 236 script cases and four Compose suites passed. Each app passed four isolated
mode/source startup cases and both source styles in its built production image,
using dummy credentials with networking disabled and no outbound mail. The shared
11-file comparison passes. Local app/proxy/assets were refreshed and the site
returned HTTP 200; the database container/volume, actual `.env`, and lockfile remained
unchanged during these local checks. Production acceptance was subsequently
confirmed by the operator as recorded above.

## Production app-password rotation — 2026-10-19

Status: **Complete**, based on the operator's production verification. The accepted
follow-up replaced the legacy production `jaysylvester` application password and
updated production `DB_PASSWORD`. The existing `postgres` administrator password,
established during the accepted role migration, was retained. Development credentials
remain unchanged.

The supported command is `./scripts/prod app-password`, using psql's hidden prompt
for configured `DB_USER`. After setting the same value in production `.env`, use the
normal `./scripts/prod deploy` workflow to build and recreate app followed by proxy.
See the [operator steps](../README.md#production-database-passwords) for future
separately authorized rotations.

Local verification: Jaysylvester and the substituted reference each passed all 16
mocked production cases; Original Trilogy passed both migration-guard cases,
including refusal of password commands. Shell syntax and ESLint passed.

## Review follow-up — 2026-10-19

Initializer password-file reads now preserve spaces, tabs and additional newlines
and remove only one final LF/CRLF, matching the app helper. Unreadable explicit files
fail without fallback. Redundant initialization-state resets were removed while
retaining the guard that preserves successfully initialized data.

Deployment now refuses multiple app/proxy container candidates before building,
with a clear diagnostic. Its unused certificate-directory test override was removed.

Validation: this project passed all 69 script cases. Across the three projects
and substituted reference, all 246 cases, four Compose boundary suites and lint
passed. The boundary checks include eight password-file fixtures and missing-file
refusal; the deployed-app/reference suites include both ambiguous-container cases.
Existing credentials, lockfiles, unrelated edits and local data were preserved.
These local checks did not access production. The operator subsequently confirmed
production verification and migration completion as recorded above.
