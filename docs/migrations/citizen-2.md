# Citizen 1.x to 2.0 migration record

Status: Phase 1 repository implementation and local Docker acceptance complete; optional Postico confirmation and the production host cutover remain.

## Framework source

- Dependency: `git+https://github.com/jaysylvester/citizen.git#2.0-env-file-config-revised`
- Locked and tested commit: `49476d1102672d12696d1fa96bc23966e198ec80`
- Citizen version at that commit: `2.0.0`
- No Citizen source is patched in this application or its images.

The branch name remains in `package.json`; `package-lock.json` is the reproducible commit input used by `npm ci`.

## Configuration mapping

| Citizen 1.x source | Citizen 2.0/application target | Notes |
| --- | --- | --- |
| `host` | Removed | Deployment selection comes from the environment and Compose files. |
| `citizen.http.hostname` | `CITIZEN_HTTP__HOSTNAME` | Empty inside local Docker; retain the inventoried loopback binding on the Phase 1 production host. |
| `citizen.http.port` | `CITIZEN_HTTP__PORT` | `8080` inside local Docker; retain the inventoried upstream port on the Phase 1 production host. |
| `citizen.layout.controller` | `CITIZEN_LAYOUT__CONTROLLER` | Typed and exposed as `app.config.layout.controller`. |
| `citizen.templateEngine` | `CITIZEN_TEMPLATE_ENGINE` | Typed and exposed as `app.config.templateEngine`. |
| Startup mode | `CITIZEN_MODE` | Local `development`; production `production`. |
| Docker Desktop watcher | `CITIZEN_DEVELOPMENT__WATCHER__USE_POLLING`, `CITIZEN_DEVELOPMENT__WATCHER__INTERVAL` | Local only; values are Boolean/number after Citizen coercion. |
| `db.database` | `DB_DATABASE` | Read directly when constructing each PostgreSQL pool. |
| `db.user` | `DB_USER` | Direct application environment read. |
| `db.password` | `DB_PASSWORD` | Direct application environment read; never logged. |
| `db.port` | `DB_PORT` | Converted with `Number(...)`. |
| `db.max` | `DB_MAX` | Converted with `Number(...)`; preserve the source value. |
| `db.connectionTimeoutMillis` | `DB_CONNECTION_TIMEOUT_MILLIS` | Converted with `Number(...)`; preserve the source value. |
| Existing/default database host | `DB_HOST` | `db` locally; host loopback during the Phase 1 production interval. |
| PostgreSQL server timezone | `POSTGRES_TIMEZONE` | Passed only to the database container as `TZ` so `initdb` preserves the source server's time behavior. |
| `mail.service` | `MAIL_SERVICE` | Used by the production Nodemailer transport. |
| `mail.auth.user` | `MAIL_AUTH_USER` | Used by the production Nodemailer transport. |
| `mail.auth.pass` | `MAIL_AUTH_PASS` | Used by the production Nodemailer transport; never logged. |
| `mail.name` | `MAIL_NAME` | Read by the contact action at its use site. |
| `mail.address` | `MAIL_ADDRESS` | Read by the contact action at its use site. |
| `mail.addressNoReply` | `MAIL_ADDRESS_NO_REPLY` | Read by the contact action at its use site. |
| `citizen.cors` | `CITIZEN_CORS` | JSON object used as Citizen's global baseline; preserves the existing headers for all route controllers. |

No controller-level CORS configuration is needed. Citizen merges optional controller/action overrides over the global baseline and supports `cors: false` where a route must opt out.

## Application changes

- Both start files use flat `app.config.directories.app` and call `app.start()` with no arguments.
- PostgreSQL pool options and the production mail transport are constructed from explicit environment values. Numeric PostgreSQL values are coerced at construction.
- Required application variables are read through the shared `app/toolbox/helpers.js` `requiredEnvironment` helper, which throws a focused error without exposing the environment.
- Contact addresses are read from the application environment where mail is sent.
- The development mail stub now uses the documented `app.log()` export. Its stale `app.helpers.log()` call came from a 2021 pre-release Citizen branch API and was not valid for the released Citizen 1.x or 2.0 APIs.
- The legacy global CORS object is supplied directly through `CITIZEN_CORS`; application controllers contain no duplicated CORS configuration.
- Framework mode reads use `app.config.mode` in JavaScript and `config.mode` in views.
- The old startup object carried application-owned cache-buster values, which Citizen 2.0 rejects. Those values now live under `app.toolbox.cacheBuster` and are passed to the existing `_head` view as local controller data.
- Legacy JSON configuration is excluded from every image and from the limited local bind mounts. Protected host copies must be archived outside the active checkout before host startup testing.
- Gulp reads local certificate paths and host settings from its restricted process environment and uses polling for every watcher.

## Upstream behavior relied on

At the locked commit, Citizen's native tests prove:

- typed `CITIZEN_DEVELOPMENT__WATCHER__USE_POLLING=true` and `CITIZEN_DEVELOPMENT__WATCHER__INTERVAL=500` values reach `app.config.development.watcher`;
- only the project-root `.env` is loaded, an `app/.env` is ignored, and existing process values take precedence;
- non-`CITIZEN_*` application variables remain available only through `process.env`;
- legacy `app/config/*.json` is rejected;
- `CITIZEN_CORS` provides a validated global baseline that controller/action config can override or disable; and
- `app.start()` rejects supplied configuration.

Global CORS support was added upstream in commit `49476d1102672d12696d1fa96bc23966e198ec80`. The application now uses that framework baseline and has removed the temporary controller-level CORS duplication.

## Verification results

Verified on 2026-08-05:

| Check | Result |
| --- | --- |
| Citizen native suite, Node.js 22.23.2 | Pass: 17 tests, 0 failures |
| Citizen native suite, Node.js 24.19.0 | Pass: 17 tests, 0 failures |
| Application `npm ci`, Node.js 24.19.0 | Pass; locked Citizen resolved over HTTPS at the recorded commit |
| ESLint for `app/` and `gulpfile.js` | Pass |
| Citizen 2.0 development startup, Node.js 22.23.2 and 24.19.0 | Pass on both; application imports, views validate, polling watcher starts, and HTTP reaches listening state with 8 expected `CITIZEN_*` process values |
| Citizen 2.0 production startup, Node.js 24.19.0 | Pass; production entrypoint initializes explicit database/mail environment consumers and reaches its HTTP listening state |
| Global CORS preflight without controller config, Node.js 24.19.0 | Pass; `OPTIONS /contact` returned the configured allow-origin and allow-methods headers from `CITIZEN_CORS` |
| Legacy-reference searches | Run as part of repository verification; expected to return no active application use |
| Compose render/build, Nginx test, image inspection | Pass on macOS with Docker Desktop 29.6.2 / Compose 5.3.1; app runs as UID/GID 10001, Node.js 24.19.0 and Citizen 2.0.0 are present, required bundles exist, and protected files are absent. |
| Local database restore/comparison | Pass: PostgreSQL 13.23 custom dump restored into PostgreSQL 17.10; UTF-8, `en_US.UTF-8`, `America/New_York`, three tables/sequences/indexes/constraints, row counts, maximum IDs, sequence values, extension, and representative queries match. Data persisted across `docker compose down` and restart. |
| Local HTTPS, route/CORS, proxy, and watcher automation | Pass over an explicit loopback resolution using the generated mkcert CA: six routes, CORS preflight, HTTP redirect, static gzip/cache headers, Nginx forwarding, Citizen polling, Gulp rebuild, and BrowserSync reload. The generated bundle diff from the watcher test was reviewed and restored rather than committed. |
| Local system trust and hosts cutover | Pass: the mkcert CA is trusted in the macOS system keychain, `dev.jaysylvester.com` resolves to `127.0.0.1`, and the standard smoke script passes without `--insecure` or a custom CA argument. |
| Local development contact flow | Pass after replacing the stale, undocumented `app.helpers.log()` call with the released Citizen 1.x/2.0 `app.log()` API; the form redirected to confirmation and wrote exactly two unsent development messages. |
| Interactive browser acceptance | Pass: manually confirmed normal rendering through trusted `https://dev.jaysylvester.com`. BrowserSync's trusted client endpoint and loopback-only UI endpoint also pass automated checks. |
| Postico acceptance | Optional manual confirmation remains; PostgreSQL is published only on `127.0.0.1:5432`, and both the application connection and direct container queries pass. |
| Production Node 24/Citizen 2.0 host cutover | Pending production inventory, snapshot, and maintenance window |

`npm ci` reports audit findings in the existing dependency tree. Broad dependency remediation is outside this migration's allowed upgrade scope and was not folded into the Citizen/Docker change.

## Reusable lessons

- Import timing matters: Citizen resolves environment configuration before application startup code runs.
- Do not use `app.start()` as an application configuration channel in Citizen 2.0; move application-owned runtime data to its actual consumer.
- Preserve the direct HTTPS dependency string as well as the exact commit in the lockfile. Some npm GitHub shorthand normalization chooses an SSH resolved URL, which is unsuitable for unauthenticated container builds.
- Mount only editable source subdirectories locally. Mounting the repository root hides Linux `node_modules`; mounting all of `app/` can expose protected legacy JSON and correctly make Citizen refuse startup.
- Bind-mount the ignored root-level `logs/` directory to `/site/logs` locally so development email and error logs remain directly accessible in the editor; retain the named log volume for production persistence.
- Keep the database service's environment narrow. Compose interpolation maps only the four PostgreSQL initialization values plus the non-secret timezone; mail and other application secrets are not injected into `db` or `assets`.
- Inventory the source server timezone as well as encoding and locale. The official PostgreSQL container otherwise initialized in UTC; mapping the non-secret `POSTGRES_TIMEZONE` to `TZ` before `initdb` preserved the source behavior.
- PostgreSQL 17 exposes the database collation and character type through `pg_database.datcollate` and `pg_database.datctype`; the PostgreSQL 13 `SHOW lc_collate`/`SHOW lc_ctype` checks are not portable to that target.
- Recreate Nginx after recreating the app because its workers may retain the removed container's resolved IP.
- Compare the effective legacy proxy during operational inventory. That check restored the local VM's gzip, 30-day static expiry, and static access-log behavior before acceptance.
