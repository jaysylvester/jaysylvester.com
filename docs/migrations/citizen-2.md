# Citizen 1.x to 2.0 migration record

Status: Phase 1 repository implementation and local Docker acceptance complete;
optional Postico confirmation and the production host cutover remain. The
shared local VM remains until its other projects have been migrated.

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
| `db.password` | `DB_PASSWORD` host source; `db-password` Docker secret | Docker reads `/run/secrets/db-password`; a missing file falls back to the Phase 1 host production environment, while unreadable and empty mounted files produce distinct errors. Never logged. |
| `db.port` | `DB_PORT` | Converted to a number and rejected unless finite. |
| `db.max` | `DB_MAX` | Converted to a number and rejected unless finite; preserve the source value. |
| `db.connectionTimeoutMillis` | `DB_CONNECTION_TIMEOUT_MILLIS` | Converted to a number and rejected unless finite; preserve the source value. |
| Existing/default database host | `DB_HOST` | `db` locally; host loopback during the Phase 1 production interval. |
| PostgreSQL server timezone | `POSTGRES_TIMEZONE` | Passed only to the database container as `TZ` so `initdb` preserves the source server's time behavior. |
| `mail.service` | `MAIL_SERVICE` | Used by the production Nodemailer transport. |
| `mail.auth.user` | `MAIL_AUTH_USER` | Used by the production Nodemailer transport. |
| `mail.auth.pass` | `MAIL_AUTH_PASS` host source; `mail-auth-pass` Docker secret | Docker reads `/run/secrets/mail-auth-pass`; a missing file falls back to the Phase 1 host production environment, while unreadable and empty mounted files produce distinct errors. Never logged. |
| `mail.name` | `MAIL_NAME` | Read by the contact action at its use site. |
| `mail.address` | `MAIL_ADDRESS` | Read by the contact action at its use site. |
| `mail.addressNoReply` | `MAIL_ADDRESS_NO_REPLY` | Read by the contact action at its use site. |
| `citizen.cors` | `CITIZEN_CORS` | JSON object used as Citizen's global baseline; preserves the existing headers for all route controllers. |

No controller-level CORS configuration is needed. Citizen merges optional controller/action overrides over the global baseline and supports `cors: false` where a route must opt out.

## Application changes

- Both start files use flat `app.config.directories.app` and call `app.start()` with no arguments.
- PostgreSQL pool options and the production mail transport are constructed from explicit configuration inputs. Numeric PostgreSQL values are coerced at construction; Docker passwords come from Compose secret files rather than the container environment.
- Required application values are read through Citizen's auto-discovered `app/helpers/utility.js` module. `requiredEnvironment` handles non-secret settings, while `requiredSecret` prefers `/run/secrets/<name>` and falls back to the existing environment key for the temporarily non-containerized Phase 1 production host. Both throw focused errors without exposing values. This module predated Citizen's helper convention under `app/toolbox/helpers.js`; moving and renaming it lets Citizen import and hot-reload it natively while distinguishing utility functions from the stateful `app.toolbox` services.
- Contact addresses are read from the application environment where mail is sent.
- The development mail stub and both PostgreSQL pool error handlers now use the documented `app.log()` export. Their stale `app.helpers.log()` calls came from a 2021 pre-release Citizen branch API and were not valid for the released Citizen 1.x or 2.0 APIs.
- The legacy global CORS object is supplied directly through `CITIZEN_CORS`; application controllers contain no duplicated CORS configuration.
- Framework mode reads use `app.config.mode` in JavaScript and `config.mode` in views.
- The old startup object carried application-owned cache-buster values, which Citizen 2.0 rejects. Those values now live under `app.toolbox.cacheBuster` and are passed to the existing `_head` view as local controller data.
- Legacy JSON configuration is excluded from every image and must be removed from the active checkout before local startup. Protected host copies are archived outside the checkout.
- Gulp reads local certificate paths and host settings from its restricted process environment and uses polling for every watcher.
- Local Compose overrides the production log volume with the ignored repository-root `logs/` bind mount so development email/error output is readable in the editor. Citizen creates its log directory when it first needs to write; no tracked `.gitkeep` or startup directory shim is required.

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

Verified from 2026-08-05 through 2026-08-07:

| Check | Result |
| --- | --- |
| Citizen native suite, Node.js 22.23.2 | Pass: 17 tests, 0 failures |
| Citizen native suite, Node.js 24.19.0 | Pass: 17 tests, 0 failures |
| Application `npm ci`, Node.js 24.19.0 | Pass; locked Citizen resolved over HTTPS at the recorded commit |
| ESLint and browser targets for `app/` and `gulpfile.js` | Pass inside the development `assets` container using the root `eslint.config.js`; both it and `.browserslistrc` are copied into the development image so containerized Autoprefixer uses the same targets as a host build. |
| Citizen 2.0 development startup, Node.js 22.23.2 and 24.19.0 | Pass on both; application imports, views validate, polling watcher starts, and HTTP reaches listening state with 8 expected `CITIZEN_*` process values |
| Citizen 2.0 production startup, Node.js 24.19.0 | Pass: the production entrypoint reads both Compose password secrets and reaches HTTP listening state in an isolated production-mode container; a dummy-value check also proves the temporarily non-containerized production-host fallback. |
| Global CORS preflight without controller config, Node.js 24.19.0 | Pass; `OPTIONS /contact` returned the configured allow-origin and allow-methods headers from `CITIZEN_CORS` |
| Legacy-reference searches | Run as part of repository verification; expected to return no active application use |
| Compose render/build, Nginx test, image inspection | Pass on macOS with Docker Desktop 29.6.2 / Compose 5.3.1; app runs as UID/GID 10001, Node.js 24.19.0 and Citizen 2.0.0 are present, required bundles exist, and protected files are absent. |
| Local database restore/comparison | Pass: PostgreSQL 13.23 custom dump restored into PostgreSQL 17.10; UTF-8, `en_US.UTF-8`, `America/New_York`, three tables/sequences/indexes/constraints, row counts, maximum IDs, sequence values, extension, and representative queries match. Data persisted across `docker compose down` and restart. |
| Local HTTPS, route/CORS, proxy, and watcher automation | Pass over an explicit loopback resolution using the generated mkcert CA: six routes, CORS preflight, HTTP redirect, static gzip/cache headers, Nginx forwarding, Citizen polling, Gulp rebuild, and BrowserSync reload. The generated bundle diff from the watcher test was reviewed and restored rather than committed. |
| Local system trust and hosts cutover | Pass: the mkcert CA is trusted in the macOS system keychain, `dev.jaysylvester.com` resolves to `127.0.0.1`, and the standard smoke script passes without `--insecure` or a custom CA argument. |
| Local development contact flow | Pass after replacing the stale, undocumented `app.helpers.log()` call with the released Citizen 1.x/2.0 `app.log()` API; the form awaits owner delivery before sending the visitor confirmation, logs a confirmation-only failure without turning an already-delivered message into an error response, and wrote exactly two unsent development messages. |
| Citizen helper discovery and HMR | Pass: startup imports `/site/app/helpers/utility.js` instead of reporting `No helpers found`; touching the bind-mounted file logs `Helper reinitialized: utility`, and BrowserSync reloads. Startup database configuration and the route/CORS smoke test pass through `app.helpers.utility`. |
| Local application source mount | Pass: both development services mount the checkout `app/` directory at `/site/app`, while image-owned dependencies remain at `/site/node_modules`. Citizen starts from the mounted entrypoint without an image rebuild, in-container ESLint passes, and the full route/CORS smoke test passes. |
| Docker environment loading message | Pass: Citizen reports `No .env found.` because `/site/.env` is intentionally absent, then reports 8 applied `CITIZEN_*` process variables injected by Compose. Application behavior confirms the explicit non-secret environment and secret-file inputs are present. |
| Compose password-secret isolation | Pass: `app` has readable `db-password` and `mail-auth-pass` files but no `DB_PASSWORD` or `MAIL_AUTH_PASS` environment variables; PostgreSQL has only its readable `db-password` file and `POSTGRES_PASSWORD_FILE`; `assets` has no password variables or secrets directory. PostgreSQL reused the accepted named volume, database-backed routes pass, and the full HTTPS/CORS smoke test passes. |
| Editor-visible local logs | Pass: the ignored checkout `logs/` bind mount exposes `email.log` and `error.log` directly to the editor while production retains its named log volume. No `.gitkeep`, volume extraction, or root shell is required. |
| Local lifecycle semantics | Pass: `dev:stop` retains stopped containers for fast reuse, `dev:destroy` removes containers/network without `--volumes`, `dev:status` includes stopped containers, and the PostgreSQL named volume persists across both paths. |
| Local logical backup and recovery drill | Pass: a custom-format backup and SHA-256 checksum were published outside Docker with parent/directory mode `0700` and file mode `0600`; archive validation passed, and an isolated Compose project restored the expected `case_studies`, `screens`, and `work_history` row counts (`7`, `59`, `12`) before its test-only volume was removed. The accepted local volume was not overwritten. |
| Local health-check noise | Resolved: the Docker-only app and proxy HTTP checks were not inherited from the VM and generated two synthetic `/` requests every ten seconds plus Nginx `SIGCHLD` notices. They were removed; the quiet PostgreSQL readiness check remains for startup ordering and the explicit smoke test covers the full HTTP path. |
| Interactive browser acceptance | Pass: manually confirmed normal rendering through trusted `https://dev.jaysylvester.com`. BrowserSync's trusted client endpoint and loopback-only UI endpoint also pass automated checks. |
| Postico acceptance | Optional manual confirmation remains; PostgreSQL is published only on `127.0.0.1:5432`, and both the application connection and direct container queries pass. |
| Production Node 24/Citizen 2.0 host cutover | Pending production inventory, snapshot, and maintenance window |

`npm ci` reports audit findings in the existing dependency tree. Broad dependency remediation is outside this migration's allowed upgrade scope and was not folded into the Citizen/Docker change.

## Reusable lessons

- Import timing matters: Citizen resolves environment configuration before application startup code runs.
- Compose interpolation, explicit container environment injection, service-scoped secret files, and Citizen's optional dotenv load are separate mechanisms. An expected `No .env found.` line does not mean configuration is absent when the subsequent applied-variable log and application behavior prove the explicit environment/secret inputs.
- Do not use `app.start()` as an application configuration channel in Citizen 2.0; move application-owned runtime data to its actual consumer.
- Verify suspicious framework calls against released Citizen 1.x documentation and the locked 2.0 source before classifying them as migration breaks. The stale `app.helpers.log()` call was not a Citizen 2.0 change; `app.log()` is documented in both released major lines.
- Distinguish Citizen's auto-discovered `app/helpers/*.js` namespace from arbitrary legacy utility directories. Older applications may predate the convention; moving a true helper into that directory requires updating its `app.helpers.<module>` consumers plus Docker bind mounts and external watcher paths.
- Preserve the direct HTTPS dependency string as well as the exact commit in the lockfile. Some npm GitHub shorthand normalization chooses an SSH resolved URL, which is unsuitable for unauthenticated container builds.
- Bind-mount the whole `app/` directory locally so entrypoint changes cannot be hidden behind a stale image. Do not mount the repository root, which would hide Linux `node_modules`. Keep protected legacy JSON outside the checkout; if `app/config/*.json` is mistakenly reintroduced, Citizen should fail loudly instead of Docker hiding it.
- Bind-mount the ignored root-level `logs/` directory to `/site/logs` locally so development email and error logs remain directly accessible in the editor; retain the named log volume for production persistence.
- Citizen creates a missing logs directory immediately before writing. Do not add `.gitkeep` or redundant startup directory creation unless a different application/framework actually requires it.
- Keep each service's configuration narrow. PostgreSQL receives its database/user/init/timezone settings plus only the `db-password` secret; `app` receives an explicit non-secret environment allowlist plus the database and mail-password secrets; `assets` receives no database or mail credentials.
- Use one required-environment helper with an explicit type argument, and validate numeric values as finite before passing them to libraries. A plain `Number(...)` can produce `NaN`, and option-defaulting code may silently replace that invalid value.
- Copy build-tool configuration such as `.browserslistrc` into the development image alongside the build tools. Otherwise containerized asset output can differ from the same checkout built on the host.
- Inventory the source server timezone as well as encoding and locale. The official PostgreSQL container otherwise initialized in UTC; mapping the non-secret `POSTGRES_TIMEZONE` to `TZ` before `initdb` preserved the source behavior.
- PostgreSQL 17 exposes the database collation and character type through `pg_database.datcollate` and `pg_database.datctype`; the PostgreSQL 13 `SHOW lc_collate`/`SHOW lc_ctype` checks are not portable to that target.
- Recreate Nginx after recreating the app because its workers may retain the removed container's resolved IP.
- Compare the effective legacy proxy during operational inventory. That check restored the local VM's gzip, 30-day static expiry, and static access-log behavior before acceptance.
- The migration dump is a one-time restore source, not a Compose startup input. Normal starts use PostgreSQL's named volume; `docker compose down` preserves it, while `down --volumes` or `docker volume rm` deletes it.
- Use PostgreSQL logical custom-format backups outside Docker as the primary local recovery path. Publish only after `pg_restore --list` succeeds, checksum them, protect them with `0700`/`0600` modes, and prove the restore against a separately named disposable project/volume rather than the accepted database.
- Give `stop` and `destroy` different developer-facing meanings: normal stop retains containers for speed; destroy removes containers/network but not volumes. Keep volume deletion out of both friendly commands.
- Bind every locally published port to loopback unless another machine must reach it. This includes proxy ports 80/443 as well as PostgreSQL and BrowserSync.
- Restore scripts must preserve the database's prior state independently of whether app/proxy were running, and must run the same cleanup on `HUP`, `INT`, and `TERM` as on normal exit.
- Await the owner notification before treating a contact submission as successful. Send the visitor confirmation afterward and log its failure without returning an error for an owner message that was already delivered; this avoids both unhandled rejections and duplicate owner messages on resubmission.
- A Compose health check runs continuously, not only during startup. Do not add app/proxy HTTP probes without a consumer that will alert or recover; otherwise they create load and misleading development logs while merely changing displayed health status. Keep dependency readiness checks only where an actual startup race exists, such as PostgreSQL accepting connections.
