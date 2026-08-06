# Citizen 1.x to 2.0 migration record

Status: Phase 1 repository implementation complete; local Docker and production host cutovers require environment-specific acceptance.

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
| Compose render/build, Nginx test, image inspection | Pending on the Docker-equipped macOS workstation |
| Local database restore/comparison | Pending protected VM inventory and dump |
| Local HTTPS, route/CORS smoke, contact, Postico, and watcher acceptance | Pending macOS stack startup |
| Production Node 24/Citizen 2.0 host cutover | Pending production inventory, snapshot, and maintenance window |

`npm ci` reports audit findings in the existing dependency tree. Broad dependency remediation is outside this migration's allowed upgrade scope and was not folded into the Citizen/Docker change.

## Reusable lessons

- Import timing matters: Citizen resolves environment configuration before application startup code runs.
- Do not use `app.start()` as an application configuration channel in Citizen 2.0; move application-owned runtime data to its actual consumer.
- Preserve the direct HTTPS dependency string as well as the exact commit in the lockfile. Some npm GitHub shorthand normalization chooses an SSH resolved URL, which is unsuitable for unauthenticated container builds.
- Mount only editable source subdirectories locally. Mounting the repository root hides Linux `node_modules`; mounting all of `app/` can expose protected legacy JSON and correctly make Citizen refuse startup.
- Keep the database service's environment narrow. Compose interpolation maps only the four PostgreSQL initialization values; mail and other application secrets are not injected into `db` or `assets`.
- Recreate Nginx after recreating the app because its workers may retain the removed container's resolved IP.
