# Docker and Citizen 2.0 Migration Plan

Status: Phase 1 development Docker acceptance completed on 2026-08-09. The further
revised Citizen project-configuration-module contract was implemented and revalidated
on 2026-08-10. A post-acceptance review determined that the migrated global CORS
allowance had no known consumer; it was removed and Citizen's fail-closed default was
validated on 2026-08-10. The temporary
host-based production Citizen cutover is canceled; production will adopt the accepted
Citizen revision as part of its Docker cutover. The shared development VM cannot be
retired until its other projects are migrated, and Phase 2 production Docker work has
not started.

Target: migrate this application to Citizen 2.0 from its Git branch and run the same Docker Compose architecture on a macOS development workstation and the Debian DigitalOcean production droplet.

## 1. Outcome

Upgrade the application from Citizen 1.x to Citizen 2.0, then replace the project's development VM and the production host-installed Node, PostgreSQL, and Nginx runtimes with Docker Compose. This project is the first end-to-end consumer of Citizen 2.0's project configuration module and will produce a focused migration record for later Citizen projects.

```text
Browser
  |
  v
proxy (Nginx; host ports 80/443)
  |
  v
app (Node/Citizen; internal port 8080)
  |
  v
db (PostgreSQL; internal port 5432)
  |
  v
named PostgreSQL volume
```

The result must provide:

- Development on macOS with Docker Desktop and no project-specific VM.
- Production on the existing Debian DigitalOcean droplet with Docker Engine.
- Citizen 2.0 on Node.js 24 LTS, with Citizen installed directly over HTTPS from `jaysylvester/citizen#2.0` and the resolved Git commit recorded in `package-lock.json`.
- Typed framework and nonsecret application configuration in committed `citizen.config.js`, secrets and deployment inputs in the ignored project-root `.env`, and no active Citizen JSON files.
- Separate development and production configuration, databases, certificates, and volumes.
- Direct migration from each environment's live PostgreSQL database.
- Development HTTPS through `mkcert`, without copying certificates from the VM.
- Production HTTPS through the existing Let's Encrypt certificate and host Certbot renewal.
- Preservation of the effective production Nginx routes and redirects.
- A clone/bootstrap README for macOS, with clearly labeled guidance for future Linux and Windows hosts.
- Friendly development lifecycle commands that distinguish stopping retained containers from destroying containers while preserving volumes.
- Editor-visible development Citizen logs and a verified, developer-invoked PostgreSQL backup/restore path whose archives live outside Docker.
- Removal of the retired host Nginx, PostgreSQL, and Node runtimes after production acceptance.

Execute the migration in two separately accepted phases. Phase 1 moves development to Docker and proves the Citizen 2.0 application there, while production continues using its existing host-installed application, Nginx, PostgreSQL, and Certbot. Phase 2 begins only after that development baseline is proven and moves the Debian production infrastructure and the accepted Citizen revision to Docker together. Production deployment remains SSH to the droplet and `git pull`; its runtime commands change when production adopts Compose. DNS and the DigitalOcean server do not change.

## 2. Scope Boundaries

### Included

- Dockerfiles, Compose files, Nginx configuration, and minimal helper scripts needed to run this project.
- Migration of this application from Citizen 1.x to the direct Citizen 2.0 branch, including a Node.js 24 LTS runtime and the required application code changes.
- Execution of Citizen's own test suite at the exact branch commit consumed by this project.
- A concise, reusable Citizen 2.0 migration record containing mappings, problems found, upstream fixes, and verification results for later projects.
- A development override and a production override.
- Migration of the existing development and production databases with `pg_dump` and `pg_restore`.
- Classification and conversion of each environment's existing ignored Citizen JSON, followed by recoverable archival outside the active Citizen 2.0 application.
- Development and production cutover, validation, rollback, and one-time cleanup commands.
- Postico endpoint changes.
- Replacement of the current certificate-copy workflow with generated development certificates, with Nginx as the sole development TLS endpoint.
- Developer-invoked development PostgreSQL backup and guarded restore commands, including an isolated restore drill.

### Excluded

- Credential rotation.
- Application features, schema changes, or dependency upgrades other than Citizen 2.0 and changes strictly required by Citizen 2.0 or Node.js 24.
- Custom health routes.
- A shared proxy or port registry for other projects.
- Containerized Certbot in this migration.
- Zero-downtime production migration; a maintenance window is acceptable.
- Scheduled backups, retention automation, remote replication, or a general disaster-recovery system. The focused development logical backup/restore commands added during acceptance are included.
- General server hardening, monitoring, CI/CD, orchestration, horizontal scaling, or disaster-recovery projects.
- A generalized Citizen codemod or migration service. This project records evidence for that later work but does not build tooling for every Citizen application.

Do not introduce a behavior change merely because it would be a useful improvement. Record it as a follow-up unless Docker cannot work correctly without it.

## 3. Citizen 2.0 and Configuration Constraints

Use the merged `2.0` branch directly until a later decision switches this project to a registry release. The implementation reviewed on 2026-08-10 was commit `c6610ace80046f294ac85d358a75fd6f3880f6fd`, whose 38-test native suite passed under Node.js 22 and Node.js 24. At each dependency refresh, record the branch commit and require the same two-major test matrix before updating this project's lockfile.

The implementation must follow Citizen 2.0's actual configuration behavior:

- Citizen resolves configuration when `citizen` is imported, before `app.start()`.
- Citizen loads exactly the project-root `.env`, then imports the optional project-root `citizen.config.js`; values already present in `process.env` take precedence over matching `.env` values.
- Each checkout has its own ignored project-root `.env`. Development bind-mounts it read-only at `/site/.env` so Citizen loads it natively. Production uses it for Compose interpolation and secret sources but does not inject or mount the whole file. Never copy it into an image or grant it to `assets` or `proxy`.
- Commit `citizen.config.js` as ordinary application source. It default-exports a plain object with Citizen framework settings under `citizen` and typed nonsecret application settings beside them. Keep secrets out of `app.config`.
- Put stable database and mail values in the top-level `db` and `mail` members. Database/role names remain deployment inputs because Compose also needs them. Development reads passwords from Citizen-loaded `.env`; production reads the two password files supplied through `DB_PASSWORD_FILE` and `MAIL_AUTH_PASS_FILE`.
- Do not configure `citizen.cors` unless inventory identifies a real browser client on another origin. With Citizen's default unset CORS configuration, ordinary and same-origin requests proceed, while cross-origin requests and preflights receive `403` with no CORS response headers. The legacy global allow-origin policy was carried forward only as a preserve-behavior migration step; this application and its same-origin BrowserSync proxy do not require it.
- Citizen no longer maps or logs `CITIZEN_*` settings. Remove all obsolete variables rather than leaving ignored names that conceal an incomplete migration.
- `app.start(options)` accepts application-only configuration, which Citizen merges beside `app.config.citizen`. It rejects a `citizen` member so runtime code cannot override framework settings.
- Any `app/config/*.json` file causes Citizen 2.0 startup to fail. Legacy JSON files remain protected migration inputs or rollback artifacts only and must be archived outside, then removed from, the active checkout before development startup or an image build. The migrated project does not retain Git or Docker ignore rules for the retired path.
- `CITIZEN_APP_PATH` is the sole Citizen-owned bootstrap variable. This layout does not need it because the image preserves Citizen's expected sibling layout and starts from `/site`:

```text
/site/app
/site/web
/site/logs
/site/node_modules/citizen
```

- The shared `app/start.js` reads `web/min/site.css` and `web/min/site.js` during startup. Both files must exist in the app image, and their paths use `app.config.citizen.directories.app`.
- Production Citizen logging needs a writable persistent `/site/logs` mount.
- Development and production both use `app/start.js`. The mode resolved by Citizen selects the development mail logger and direct `DB_PASSWORD`, or the production Nodemailer transport and password secret files. `NODE_ENV` lives in each deployment's `.env` and supplies Citizen's default mode.
- File watching through Docker Desktop must use polling for both Citizen and Gulp.
- Put Citizen's typed `development.watcher.usePolling=true` and `development.watcher.interval=500` settings in `citizen.config.js`. Keep Gulp's separate process-environment polling inputs scoped to `assets`.
- Do not run continuous app or proxy HTTP health checks merely to populate Docker health status. They generated two synthetic Citizen requests every ten seconds in development, produced misleading Nginx child-process notices, and had no configured recovery or alerting consumer. Keep the quiet PostgreSQL readiness check for app startup ordering and use the explicit smoke test for end-to-end HTTP acceptance.
- Do not add continuous app/proxy probes in production by default. Add a production probe only with a concrete consumer and response policy, such as external alerting or orchestration that will act on the result; prefer an external public-path monitor when the goal is to cover DNS, TLS, Nginx, Citizen, and the database together.
- Citizen 2.0 reads the standardized `Forwarded` header and also falls back to the existing `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto` headers. Verify correct HTTPS/host/client metadata through container Nginx in development and again during the Phase 2 production cutover.

### Docker environment design

Use one ignored project-root `.env` in each deployment checkout. The development and production files share a name but live on different hosts and contain their own values:

- `NODE_ENV`.
- Database/role names and the database and mail passwords. Stable database connection and mail identity/transport values live in `citizen.config.js`.
- `POSTGRES_INITDB_ARGS` and `POSTGRES_TIMEZONE` for first-time database initialization with source-compatible locale and time behavior.
- Development only: `BROWSERSYNC_ORIGIN`, the external same-origin HTTPS URL used by the BrowserSync client. This is an assets input, not an application CORS policy.

Pass the file to `docker compose --env-file .env ...` for interpolation in both deployments. Keep `compose.yaml` neutral about application password delivery. Development bind-mounts `.env` read-only at `/site/.env`; production explicitly injects only `NODE_ENV`, `DB_DATABASE`, and `DB_USER` and grants its two password secrets. Production never mounts or injects `.env` wholesale.

The `db` service must not receive the entire file. Keep its common database/user/init/timezone mappings in `compose.yaml`. Development adds `POSTGRES_PASSWORD` from `.env`; production adds `POSTGRES_PASSWORD_FILE=/run/secrets/db-password` and grants only that secret. Development's password is visible to operators with Docker inspection access; production passwords remain outside container environments.

Define production's two top-level secrets by environment-variable name, not by interpolating their values:

```yaml
secrets:
  db-password:
    environment: DB_PASSWORD
  mail-auth-pass:
    environment: MAIL_AUTH_PASS
```

The production Compose wrapper loads the ignored project-root `.env`; Compose materializes those two values as service-scoped files. Do not write `environment: ${DB_PASSWORD}` or `environment: ${MAIL_AUTH_PASS}`: those fields name the source variables, and interpolation would make Compose treat a password as a variable name.

Both accepted deployments run Citizen in Docker, so `citizen.config.js` sets `citizen.http.hostname: ''` and `citizen.http.port: 8080` directly. Host exposure remains controlled by the proxy's loopback/public port mappings and Docker network. Do not add an `APP_HTTP_HOSTNAME` variable or deploy this revision through the temporary host-run production process. The production `.env` uses `NODE_ENV=production`; the database host remains the typed `db` value in `citizen.config.js`.

Run the image directly as a fixed non-root user such as UID/GID `10001:10001`; no privileged configuration-copy entrypoint is needed. Keep `init: true` and direct exec-form Node commands.

Development startup must report `Loaded project environment: /site/.env` followed by `Loaded Citizen configuration: /site/citizen.config.js`, then start in development mode. Production will report that no project `.env` was loaded because it receives an explicit allowlist and secret files. Existing database and mail behavior must work without logging secrets. Citizen settings must appear under `app.config.citizen`; typed database, mail, and runtime application settings must appear beside that namespace.

A development `citizen.config.js` or ordinary `.env` change needs only an app restart because both files are bind-mounted and Citizen reloads them at process start. Rotating `DB_PASSWORD` also requires changing the PostgreSQL role password and recreating the database container's environment; editing `.env` alone does not update an existing data volume.

### CORS cleanup

This focused Phase 1 follow-up was completed on 2026-08-10:

1. Removed `citizen.cors` from `citizen.config.js` and removed `CORS_ALLOW_ORIGIN` from `.env.example` and the protected development `.env`.
2. Added development-only `BROWSERSYNC_ORIGIN=https://dev.jaysylvester.com` and passed it directly to `assets`. BrowserSync remains proxied through the same Nginx origin.
3. Changed `scripts/smoke-test` so cross-origin GET and preflight requests target the supplied `base_url`, send a deliberately different `Origin`, expect HTTP `403`, and reject any `Access-Control-Allow-*` response header. The old independent `https://localhost` target was removed because it ignored a supplied production base URL.
4. Rebuilt/recreated app, assets, and proxy. ESLint, ordinary route/static checks, fail-closed CORS assertions, and BrowserSync client/polling checks passed.
5. Confirmed that the production target builds and starts without any CORS input. Production must not introduce a CORS variable or policy unless its own inventory identifies a concrete cross-origin browser client.

## 4. Repository Artifacts

Phase 1 implemented and committed these artifacts on `maintenance/docker-migration`:

- `Dockerfile` with Node.js 24 development and production targets.
- `.dockerignore`.
- `.gitignore` updated to track `package-lock.json` and ignore the project-root `.env` and generated development certificates.
- `compose.yaml` for common `db`, `app`, and `proxy` services.
- `compose.dev.yaml` for macOS development.
- `docker/nginx/Dockerfile` and development Nginx configuration.
- Project-root `.env.example`, sanitized and containing application/deployment and Docker/PostgreSQL initialization placeholders.
- Project-root `citizen.config.js`, committed and copied into both runtime images, with a development bind mount so configuration edits require only a restart.
- `scripts/dev-cert` to create/check the development `mkcert` certificate.
- `scripts/dev-up` to run the certificate check and start development Compose.
- `scripts/dev-db-backup` to create and verify protected logical backups outside Docker.
- `scripts/dev-db-restore` to validate, confirm, and atomically restore one explicit archive while preserving prior service state.
- `scripts/smoke-test` for the small set of existing development routes and Citizen's expected default rejection of a cross-origin preflight.
- Friendly `package.json` scripts for build, start, stop, restart, destroy, status, logs, smoke testing, database backup, and database restore.
- `package.json` updated for Node.js 24 and the direct Citizen branch dependency.
- A tracked `package-lock.json`, with its existing `.gitignore` entry removed, resolving the reviewed Citizen branch commit so container installs can use `npm ci`.
- `docs/migrations/citizen-2.md` recording the source-to-target config mapping, exact Citizen commit, test results, issues found, upstream fixes, and reusable lessons.
- A real project `README.md` containing the tested macOS development instructions required by section 8.

Add and commit these production-specific artifacts on `maintenance/docker-migration` during Phase 2, after inventorying the effective production configuration. After review and local acceptance, fast-forward `main` to the completed migration branch as the production release gate:

- `compose.production.yaml` for Debian production.
- The production Nginx configuration, preserving the inventoried redirects and other application-relevant behavior.
- Production cases in `scripts/smoke-test` that exercise the inventoried public behavior.
- `scripts/reload-production-proxy` as the Certbot deploy hook.
- The production deployment, Postico, Certbot, and retired-runtime notes required in the README.

Do not add generalized HTTP-manifest, `/proc` inspection, or permanent database-comparison harnesses unless implementation reveals a concrete problem that cannot be handled by focused commands. The developer-invoked backup/restore scripts are justified by accidental named-volume deletion; their restore path must be tested against a disposable project and volume without adding a permanent test framework.

Keep ignored and untracked:

- Project-root `.env` in every checkout.
- `docker/dev-certs/*`.
- Database dumps, runtime log contents, and Let's Encrypt material.

Use distinct Compose project names and database volumes:

| Environment | Compose project | PostgreSQL volume |
| --- | --- | --- |
| Development | `jaysylvester-dev` | `jaysylvester-dev-postgres` |
| Production | `jaysylvester-production` | `jaysylvester-production-postgres` |

Both environment overrides may publish PostgreSQL as `127.0.0.1:5432:5432` for Postico. Never publish it on `0.0.0.0`.

If another development project already owns ports 80, 443, or 5432, stop that project while working on this one or assign this project a different loopback-only database port. Designing shared workstation infrastructure is outside this plan.

## 5. Compose and Image Design

### Database

- Use a supported PostgreSQL target major proven by a test restore before either final volume is created.
- If the source major is still supported, prefer it to avoid combining migration with an upgrade.
- If the source major is unsupported, the cross-major logical restore is a required compatibility step, not permission to alter schema, data, encoding, or locale unnecessarily.
- Store data in the named volume.
- Use `pg_isready` for health.
- Initialize the database name, role, and reused password from the ignored environment file only when the volume is empty. Pass only the explicit `POSTGRES_*` values required by the database service; do not mount the whole file there.
- PostgreSQL fixes encoding, `lc_collate`, `lc_ctype`, and its default server timezone when `initdb` first creates the volume. Before the first `db` start, put the inventoried locale values into each environment's `POSTGRES_INITDB_ARGS` and its timezone into `POSTGRES_TIMEZONE`, confirm the target image provides both, and test them with the selected PostgreSQL image. If a source locale or timezone is unavailable, choose and rehearse the compatible target before creating either final volume; discovering this during cutover is too late.
- Do not use `resources/data.sql`; it is an untrusted historical initialization file.

### Application

- Build Node.js 24 development and production targets from the same Dockerfile and lockfile.
- Install Citizen from `git+https://github.com/jaysylvester/citizen.git#2.0`; the lockfile's resolved commit is the reproducible build input.
- The dependency-install build stage needs Git and CA certificates to resolve the direct HTTPS dependency. Do not carry Git into the final runtime image solely for this purpose.
- Run `node app/start.js` in both environments. Keep the development and production image commands identical; select their database-password and mail behavior from `app.config.citizen.mode` after Citizen resolves configuration.
- Put typed framework settings under `citizen` in the root `citizen.config.js`; put typed nonsecret database and mail settings beside that namespace. Keep secrets and deployment-specific values in `.env` without changing their values.
- Pass the application-owned cache buster through the shared `app.start({ cacheBuster })` call. Do not pass a `citizen` override there.
- Use `app.config.citizen.*` and view `config.citizen.*` for framework settings.
- Construct the PostgreSQL pools from `app.config.db` and the environment-appropriate password. Construct mail/contact behavior from `app.config.mail` and the environment-appropriate password. Do not add a generic environment helper or validation layer.
- Move application utility modules that predate Citizen's helper convention into `app/helpers/<module>.js` when they are semantically helpers, and consume them through `app.helpers.<module>`. Mount and watch that directory in development so Citizen supplies native discovery and hot module replacement. Do not confuse Citizen's top-level `app.log()` API with auto-discovered `app.helpers` modules.
- Leave `citizen.cors` unset so Citizen's fail-closed default rejects cross-origin requests. Add CORS later only for an inventoried browser client on another origin, scoped to the required origins, methods, and routes.
- Do not arbitrarily change pool sizes, mail settings, or other application behavior. Removing the unused legacy CORS allowance is an explicitly reviewed migration correction.
- Connect to PostgreSQL at `db:5432`.
- Expose port 8080 only on the Compose network.
- Set `citizen.http.hostname: ''` and `citizen.http.port: 8080` in `citizen.config.js` for both Docker environments. Host publishing remains the proxy's responsibility.
- Retain the independent `pg_isready` database check because the app must not start before PostgreSQL accepts connections. Let proxy depend on app with `service_started`; do not continuously request an application route from either app or proxy.
- Mount writable persistent logs. Use the named log volume in production, but override it in development with the ignored repository-root `logs/` bind mount so development email and error logs are visible in the editor.
- Copy `citizen.config.js` to `/site/citizen.config.js` in the image and bind-mount it read-only in development. Bind-mount development `.env` read-only at `/site/.env` so Citizen loads it natively; use production `.env` only as the Compose interpolation/secret source. Never copy `.env` into an image or mount it in production.
- Do not add a tracked `.gitkeep` or a startup-only `mkdir` solely for Citizen logs. Citizen creates a missing logs directory immediately before its first file write; the development bind mount also establishes the host path when Compose starts.
- In the development override, bind-mount the whole checkout `app/` directory at `/site/app` and bind-mount `web/` separately. This keeps startup files and Citizen-managed source synchronized with the editor while leaving image-owned Linux dependencies visible at `/site/node_modules`. Never mount the repository root at `/site`. Keep legacy `app/config/*.json` outside the active checkout. Do not add ignore rules for that retired path; the clean checkout, explicit pre-start check, and Citizen rejection remain visible.

### Nginx

- Use one proxy image with environment-specific server configuration.
- Require each Compose overlay to select its Nginx configuration explicitly; the shared Compose file and proxy Dockerfile must not default to development.
- `docker/nginx/dev.conf` is development-only and must not be copied or treated as the starting template for production. Phase 2 creates a separate production configuration from the protected effective production `nginx -T` capture.
- Serve static files and send dynamic requests to `http://app:8080`.
- Copy production static files into the image; bind-mount `web/` read-only in development.
- Preserve the reviewed current redirects, static routing, TLS behavior, headers, error handling, and `web/shoplc/` content.
- Compare the effective source configuration for `try_files`, named fallbacks, gzip, static expiration, and static access-log behavior. The retired development VM used a 30-day static expiry; Docker development intentionally replaces that with `Cache-Control: no-store` to prevent stale rebuilt bundles. That historical development value is not a production requirement.
- Inventory and record the exact effective production static-expiry and cache-header behavior before writing the production configuration, then preserve that production behavior. Do not infer a production value from either `dev.conf` or the retired development VM.
- Do not add proxy headers, caching changes, or other Nginx behavior unless required for container networking or explicitly found in the effective source configuration.
- Set a correct standardized `Forwarded` header in the new proxy configuration while preserving any inventoried `X-Forwarded-*` behavior relied on by the application.
- Serve `/.well-known/acme-challenge/` from `/var/www/certbot` in production and redirect other HTTP traffic to HTTPS.

Nginx resolves the literal `app` hostname when its workers start and can retain the old container IP after `app` is recreated. Therefore every production workflow that recreates `app` must recreate `proxy` afterward. Development Nginx also resolves `assets` for BrowserSync, so recreate `proxy` after recreating either development container. `depends_on` handles startup order, not later recreation.

### Development asset development

The development override should include an `assets` service using the development image so macOS does not need a host Node installation. It runs the existing Gulp watcher with bind mounts for `app/` and `web/`.

Do not attach the application's full `.env` or development certificate to `assets`; it does not need database, mail, or TLS inputs. Map only the public BrowserSync origin and Gulp watcher values it consumes.

Return each Gulp transform stream from its task so one-shot builds and dependent watcher work do not report completion before files are written.

Copy development-tool configuration such as `eslint.config.js` into the development image stage when the corresponding tools run inside Docker. Keep it out of the shared runtime stage so it is not included in the production image.

Update Gulp and the development proxy only as needed to:

- Run BrowserSync over plain HTTP on port 3000 inside the Compose network with its UI disabled.
- Proxy `/browser-sync/` through development Nginx, including the Socket.IO upgrade, so the browser uses the existing trusted HTTPS origin.
- Use a same-origin BrowserSync client URL and set its `socket.domain` to the public development HTTPS origin; snippet mode otherwise embeds BrowserSync's internal listener port in the generated client.
- Enable polling for every watcher so Docker Desktop file changes are detected.
- Keep BrowserSync ports unpublished and grant the certificate only to Nginx.

Do not rebuild and commit new front-end output merely to establish a Docker-era baseline. Existing tracked bundles remain authoritative unless the required Gulp changes actually alter them and that difference is reviewed separately.

## 6. Phase 1 — Citizen 2.0 and Development Docker Deployment

Phase 1 ends with the development environment running through Docker Desktop, the development database restored into Docker PostgreSQL, development HTTPS and file watching accepted, and the custom development VM retired when its other workloads permit. Production remains unchanged until Phase 2 moves its application and infrastructure to the accepted Docker/Citizen baseline together.

### Coordinate the shared application migration

Create the Docker and Citizen 2.0 work on a dedicated migration branch while it is under development. For this project, that branch is `maintenance/docker-migration`:

`[WORKSTATION — macOS]`

```sh
cd /absolute/path/to/jaysylvester.com
git status --short
git switch -c maintenance/docker-migration
git push -u origin maintenance/docker-migration
```

If the migration branch already exists, switch to it instead of creating it. Apply any intervening production hotfix to the production branch first, then merge that commit into the migration branch and repeat the affected development checks.

Do not merge the container-oriented migration branch into `main` during Phase 1. Complete revised development Citizen 2.0/Docker acceptance, then add and review the production artifacts on that same migration branch during Phase 2. Fast-forward `main` only after the complete production definition passes local review. Production receives the application and infrastructure changes together when the production checkout pulls `main` during the maintenance window.

### Inventory the development VM

Save inventory output outside Git. Do not print secret JSON contents into the record.

If the migration agent cannot answer an interactive SSH password prompt, have
the operator establish a shared SSH control/master connection in their own
terminal and reuse that authenticated socket for inventory and `scp`. A
control-only SSH command can appear to do nothing after authentication because
it is intentionally holding the connection open; verify it with a harmless
remote `hostname` command before copying protected inputs. Never record or pass
the password through command arguments or logs.

`[DEVELOPMENT VM]`

```sh
hostname
cat /etc/os-release
node --version
nginx -v
psql --version
sudo systemctl status nginx postgresql --no-pager
ps -ef | grep -E '[n]ode|[n]pm'
sudo ss -lntp
sudo -u postgres psql -Atqc "SELECT version();"
sudo -u postgres psql -Atqc "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database WHERE datistemplate = false ORDER BY datname;"
sudo -u postgres psql -d jaysylvester -Atqc "SHOW server_encoding; SHOW lc_collate; SHOW lc_ctype; SHOW timezone;"
sudo -u postgres psql -d jaysylvester -Atqc "SELECT extname FROM pg_extension ORDER BY extname;"
```

Record the exact application start/stop command and the path of the working Citizen JSON.

Capture effective Nginx configuration outside Git:

```sh
sudo nginx -t
umask 077
sudo nginx -T > /tmp/jaysylvester-dev-nginx.txt 2>&1
sudo chown "$(id -un):$(id -gn)" /tmp/jaysylvester-dev-nginx.txt
```

Before the VM is eventually deleted, confirm that no other project, database, cron job, shared directory, or service still relies on it. This is a deletion gate, not a request to design the migrations for those other projects here.

### Inventory the production application runtime

Record the current production application runtime for the later coordinated Docker cutover without changing the application, Nginx, PostgreSQL, Certbot, or database during Phase 1:

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
hostname
cat /etc/os-release
git status --short
git branch --show-current
git rev-parse HEAD
command -v node npm
node --version
npm --version
node -p "require('./node_modules/citizen/package.json').version"
systemctl list-units --type=service --all | grep -Ei 'citizen|node|jay'
sudo systemctl cat REPLACE_ME_APP_SERVICE
sudo nginx -T 2>/dev/null | grep -nE 'proxy_pass|proxy_set_header[[:space:]]+(Forwarded|X-Forwarded)'
sudo -u postgres psql -d jaysylvester -Atqc "SHOW server_encoding; SHOW lc_collate; SHOW lc_ctype; SHOW timezone;"
```

Record the exact production branch, application service name and user, `ExecStart`, working directory, Citizen JSON path, Nginx upstream hostname/port, PostgreSQL connection values, and existing deployment/restart commands. Do not print the JSON or its credentials into the inventory record.

### Migrate Citizen and implement Docker in development

#### Pin and test the Citizen branch

Use an existing Citizen checkout or clone the direct branch next to this project:

`[WORKSTATION — macOS]`

```sh
CITIZEN_REPO=/absolute/path/to/citizen
if test -d "$CITIZEN_REPO/.git"; then
  git -C "$CITIZEN_REPO" status --short
  git -C "$CITIZEN_REPO" fetch origin 2.0
  git -C "$CITIZEN_REPO" switch 2.0
  git -C "$CITIZEN_REPO" pull --ff-only
else
  git clone --branch 2.0 https://github.com/jaysylvester/citizen.git "$CITIZEN_REPO"
fi
git -C "$CITIZEN_REPO" log -1 --format='%H %cs %s'
```

Run Citizen's tests with both the framework's minimum Node.js major and the application's deployed Node.js major without writing Linux dependencies into the host checkout:

```sh
for NODE_IMAGE in node:22-bookworm node:24-bookworm; do
  docker run --rm -v "$CITIZEN_REPO:/src:ro" "$NODE_IMAGE" sh -c \
    'cp -a /src /tmp/citizen && cd /tmp/citizen && npm install && npm test'
done
```

Before updating this project's dependency, confirm the checked-out branch includes and passes the upstream tests for project-root `.env` loading, process-environment precedence, namespaced Citizen settings, typed application settings, application-only `app.start(options)`, `NODE_ENV` mode fallback, legacy JSON rejection, and the process-only `CITIZEN_APP_PATH` bootstrap rule.

Rerun Citizen's entire suite and record the tested commit in `docs/migrations/citizen-2.md`. The application supplies Docker Desktop polling explicitly through the typed config module. If later application testing exposes a Citizen defect, follow an upstream-test-first flow and refresh this project's lockfile afterward. Do not patch framework code inside this application's image.

#### Update the dependency and migrate application code

The root lockfile is currently ignored. Preserve it, remove only the `package-lock.json` entry from `.gitignore`, and intentionally update the Citizen dependency under the deployed Node.js 24 runtime:

```sh
cd /absolute/path/to/jaysylvester.com
git check-ignore -v package-lock.json
${EDITOR:-vi} .gitignore
docker run --rm -v "$PWD:/site" -w /site node:24-bookworm \
  npm install --package-lock-only --save-exact 'citizen@git+https://github.com/jaysylvester/citizen.git#2.0'
git add .gitignore package.json package-lock.json
git diff --cached --check
git status --short
```

The branch name remains in `package.json`; `package-lock.json` records the exact Git commit consumed by reproducible `npm ci` builds. Record and compare that commit with the tested Citizen checkout before proceeding. This Citizen/lockfile update is intentional; do not update other dependency ranges unless Node.js 24 or Citizen 2.0 demonstrably requires it.

Implement these application changes as a dedicated reviewable commit before the database migration:

- Change this application's `engines.node` to `>=22.0.0`, matching Citizen's minimum. Test that minimum explicitly, while deploying this application on Node.js 24 LTS.
- In the shared start file, construct the PostgreSQL pool from `app.config.db`. Development adds `DB_PASSWORD`; production adds the password read from the file at `DB_PASSWORD_FILE`.
- In that same file, use the local file logger in development and construct the production Nodemailer transport from `app.config.mail` plus the password read from `MAIL_AUTH_PASS_FILE`. In the contact controller, use the names and addresses in `app.config.mail`.
- Remove the generic environment helper; application configuration does not belong in Citizen's auto-discovered helper namespace.
- Add a committed root `citizen.config.js` containing typed Citizen settings under `citizen` and typed nonsecret `db` and `mail` application settings beside it. Read `DB_DATABASE` and `DB_USER` directly from `process.env`; enable log polling only in development for the Docker Desktop bind mount.
- Use `app.config.citizen.directories.app` in the shared start file.
- Use `app.config.citizen.mode` and view `config.citizen.mode`.
- Pass the application-owned cache buster to `app.start({ cacheBuster })` and consume it from `config.cacheBuster`; do not retain it in the helper toolbox.
- Do not translate the legacy global CORS policy unless a real cross-origin consumer is inventoried. This project leaves `citizen.cors` unset and verifies Citizen's fail-closed default.

Run searches after the edit. They must show framework reads under the Citizen namespace and application reads under their top-level namespaces; there must be no flat framework read or secret embedded in `citizen.config.js`:

```sh
rg -n 'app\.config\.(citizen|db|mail)|config\.(citizen|cacheBuster)' app citizen.config.js
rg -n 'DB_PASSWORD|MAIL_AUTH_PASS' citizen.config.js && exit 1 || true
grep -RInE 'app\.start\([[:space:]]*\{' app || true
```

Exercise current routes, the contact form, default cross-origin rejection, development logging, and cache-buster paths under Citizen 2.0 before attributing any failure to Docker.

#### Convert development configuration

Copy the authoritative development JSON from the VM to protected storage outside Git, then translate it without printing its values:

`[DEVELOPMENT DOCKER HOST — macOS]`

```sh
cd /absolute/path/to/jaysylvester.com
MIGRATION_INPUT_DIR="$HOME/Documents/REPLACE_ME_PROJECT-docker-migration-dev"
install -d -m 0700 "$MIGRATION_INPUT_DIR"
DEV_CONFIG_ARCHIVE="$MIGRATION_INPUT_DIR/citizen1-dev.json"
umask 077
scp REPLACE_ME_VM_SSH_ALIAS:/var/www/jaysylvester.com/app/config/REPLACE_ME_CURRENT_CONFIG.json "$DEV_CONFIG_ARCHIVE"
cp .env.example .env
chmod 600 .env "$DEV_CONFIG_ARCHIVE"
${EDITOR:-vi} .env
```

Use this mapping, preserving the source values unless the Docker target requires the stated change:

| Citizen 1.x source | Citizen 2.0 target |
| --- | --- |
| `host` | Remove; deployment selection now comes from Compose |
| `citizen.http.hostname` | `citizen.config.js`: `citizen.http.hostname: ''` |
| `citizen.http.port` | `citizen.config.js`: `citizen.http.port: 8080` |
| `citizen.layout.controller` | `citizen.config.js`: `citizen.layout.controller` |
| `citizen.templateEngine` | `citizen.config.js`: `citizen.templateEngine` |
| startup mode | `.env`: `NODE_ENV=development` |
| Docker Desktop watcher requirement | `citizen.config.js`: `citizen.development.watcher.usePolling: true` and `interval: 500` |
| `db.*` | `citizen.config.js`: typed top-level `db`, with `.env` database/role names and password delivery |
| `mail.*` | `citizen.config.js`: typed top-level `mail`, with `.env`/Compose secret password delivery |
| `citizen.cors` | Do not migrate the unused global allowance. Leave unset so cross-origin requests and preflights fail closed unless an actual external browser client is inventoried. |

Also set `POSTGRES_INITDB_ARGS` from the development VM's inventoried encoding, `lc_collate`, and `lc_ctype`, and set `POSTGRES_TIMEZONE` from `SHOW timezone`; verify those values exist in the selected PostgreSQL image before `dc up -d db` creates the development volume.

Keep the existing credentials. Do not rotate or normalize values during conversion. The sanitized project-root `.env.example` must document every required variable and the PostgreSQL initialization argument shape without containing real values.

Also update the real protected development `.env` during this conversion: remove obsolete `CITIZEN_*` names, `CORS_ALLOW_ORIGIN`, and stable DB/mail settings now committed in `citizen.config.js`; add `NODE_ENV=development` and `BROWSERSYNC_ORIGIN=https://dev.jaysylvester.com`; preserve database/role names, passwords, PostgreSQL initialization inputs, and asset watcher values. Updating only `.env.example` is insufficient because Citizen loads the real file.

After the development environment has been verified, archive any workstation `app/config/*.json` outside the active checkout and remove it from `app/config`. Citizen 2.0 deliberately refuses to start when one is present:

```sh
find app/config -maxdepth 1 -type f -name '*.json' -print 2>/dev/null
git check-ignore -v .env docker/dev-certs/dev-key.pem
git status --short
```

The `find` command must produce no files before starting the development app or building/testing it outside Docker. The legacy JSON archive remains outside the checkout; no permanent Git or Docker ignore rule is needed for the retired source path.

#### Build and validate the artifacts

Implement the Phase 1 artifacts listed in section 4, then run:

```sh
./scripts/dev-compose config --quiet
./scripts/dev-compose build --pull app proxy assets
```

Confirm from the rendered Compose configuration and images that:

- Only loopback-bound proxy ports 80/443 and the loopback Postico port are published in development; BrowserSync port 3000 remains internal to Compose and its UI is disabled.
- `app` receives development `.env` only through the read-only `/site/.env` bind; `db` receives only its explicitly mapped PostgreSQL settings including `POSTGRES_PASSWORD`; `assets` and `proxy` receive neither the application environment nor its secrets.
- No environment file, legacy JSON, private key, dump, or host `node_modules` is in an image layer. The development runtime `.env` bind does not change that image-layer requirement.
- The app image contains Node.js 24, Citizen 2.0 at the recorded Git commit, `web/min/site.css`, `web/min/site.js`, and Linux `node_modules`.
- No `app/config/*.json` exists in the app image.
- The application runs non-root, receives typed Citizen/database/mail configuration from `/site/citizen.config.js`, reads only passwords through the deployment-specific mechanism without logging them, and can write `/site/logs`.
- The development image contains the repository `.browserslistrc` so containerized Autoprefixer uses the same targets as host builds.
- Citizen reports that it loaded `/site/.env`, loads `/site/citizen.config.js`, and starts in development mode.
- Container Nginx passes `nginx -t`, supplies `Forwarded`, and contains the reviewed redirects and locations.

Update `docs/migrations/citizen-2.md` with the application diff categories, test results, any upstream Citizen commits, and lessons that apply to the next project. Do not include environment values or secrets.

#### Configure development HTTPS

Install Docker Desktop and `mkcert` on macOS:

```sh
brew install --cask docker
brew install mkcert
brew install nss
open -a Docker
docker version
docker compose version
mkcert -install
```

`nss` is needed only for Firefox's separate trust store.

Update macOS `/etc/hosts` so development resolves to the workstation rather than the retired VM:

```text
127.0.0.1 dev.jaysylvester.com
```

```sh
sudoedit /etc/hosts
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
dscacheutil -q host -a name dev.jaysylvester.com
```

`scripts/dev-cert` must generate ignored `docker/dev-certs/dev-cert.pem` and `dev-key.pem` for `dev.jaysylvester.com`, `localhost`, `127.0.0.1`, and `::1`. It should reuse a valid certificate and regenerate an expired or missing one. Never copy or mount mkcert's CA private key.

Keep the ignored leaf certificate at host mode `0644` and its private key at `0600`.
Only the Nginx container mounts them; its root master process reads the key before
unprivileged workers handle requests. Never mount the mkcert CA key or weaken its mode.

Run:

```sh
./scripts/dev-cert
openssl x509 -in docker/dev-certs/dev-cert.pem -noout -checkhost dev.jaysylvester.com
```

Development Nginx alone mounts the generated leaf certificate and terminates TLS. BrowserSync remains plain HTTP on the private Compose network and is reachable only through Nginx's `/browser-sync/` location. Remove `_dev-certs` only after Nginx works with the generated certificate.

### Migrate development

#### Dump the authoritative VM database

`[DEVELOPMENT VM]`

```sh
MIGRATION_DIR=REPLACE_ME_PROTECTED_DEVELOPMENT_STAGING_DIRECTORY
sudo install -d -m 0700 -o "$(id -un)" -g "$(id -gn)" "$MIGRATION_DIR"
sudo -u postgres pg_dump -Fc --no-owner --no-acl -d jaysylvester > "$MIGRATION_DIR/jaysylvester.dump"
cd "$MIGRATION_DIR"
sha256sum jaysylvester.dump > jaysylvester.dump.sha256
sha256sum -c jaysylvester.dump.sha256
pg_restore --list jaysylvester.dump >/dev/null
```

Transfer the dump outside the Git checkout:

`[DEVELOPMENT DOCKER HOST — macOS]`

```sh
mkdir -p /absolute/private/path/docker-migration-dev
chmod 700 /absolute/private/path/docker-migration-dev
scp REPLACE_ME_VM_SSH_ALIAS:REPLACE_ME_PROTECTED_DEVELOPMENT_STAGING_DIRECTORY/jaysylvester.dump /absolute/private/path/docker-migration-dev/
scp REPLACE_ME_VM_SSH_ALIAS:REPLACE_ME_PROTECTED_DEVELOPMENT_STAGING_DIRECTORY/jaysylvester.dump.sha256 /absolute/private/path/docker-migration-dev/
chmod 600 /absolute/private/path/docker-migration-dev/jaysylvester.dump /absolute/private/path/docker-migration-dev/jaysylvester.dump.sha256
cd /absolute/private/path/docker-migration-dev
shasum -a 256 -c jaysylvester.dump.sha256
```

#### Restore into a new development volume

`[DEVELOPMENT DOCKER HOST — macOS]`

```sh
cd /absolute/path/to/jaysylvester.com
dc() { ./scripts/dev-compose "$@"; }
dc config --quiet
if docker volume inspect jaysylvester-dev-postgres >/dev/null 2>&1; then
  echo 'Target volume already exists; identify and back it up before continuing.' >&2
else
  dc up -d db
  dc exec -T db pg_isready -U jaysylvester -d jaysylvester
  dc exec -T db pg_restore -U jaysylvester -d jaysylvester --exit-on-error --single-transaction --no-owner --no-privileges < /absolute/private/path/docker-migration-dev/jaysylvester.dump
  dc exec -T db psql -U jaysylvester -d jaysylvester -v ON_ERROR_STOP=1 -c 'ANALYZE;'
fi
```

Compare the source and target using concise SQL checks:

- All expected tables, views, sequences, indexes, constraints, and extensions exist.
- Row counts for `case_studies`, `screens`, and `work_history` match.
- Maximum IDs and current sequence values match.
- Representative application queries return the expected rows.

Do not validate against `resources/data.sql`.

The archive is a one-time migration input. It is not mounted into Compose and is
not replayed by `dev-up` or `docker compose up`. After the one-time restore,
PostgreSQL reads and writes `/var/lib/postgresql/data` in the named volume. A
normal `down` preserves that volume; `down --volumes` or an explicit volume
removal deletes the active database.

When a PostgreSQL major upgrade is part of the restore, use version-appropriate
catalog queries during comparison. In PostgreSQL 17, database collation and
character type are available as `pg_database.datcollate` and
`pg_database.datctype`; do not assume every source-major `SHOW` command exists
unchanged on the target.

#### Start and accept development Docker

```sh
cd /absolute/path/to/jaysylvester.com
./scripts/dev-up --build
./scripts/dev-compose ps
./scripts/dev-compose logs --tail=200 db app proxy assets
```

Confirm:

- Citizen reports `Loaded project environment: /site/.env`, `Loaded Citizen configuration: /site/citizen.config.js`, and development mode.
- The running image uses Node.js 24 and the recorded Citizen 2.0 Git commit.
- Database and mail consumers use typed application configuration plus passwords from Citizen-loaded `.env`, without logging values, and `app.config.citizen.cors` remains unset.
- No `app/config/*.json` exists inside the container.
- The app responds through Nginx with the required `Forwarded` header behavior.
- `https://dev.jaysylvester.com` is trusted without `curl -k` or a browser exception.
- After automated HTTP checks pass, open the trusted hostname in a normal browser and record manual rendering acceptance. If browser automation is unavailable, manual acceptance is the required fallback rather than skipping the visual check.
- Existing routes, static files, and `web/shoplc/` work.
- CSS/JavaScript rebuild and BrowserSync reload work after a source edit.
- A controller/view edit is detected through polling.
- The development contact flow uses the migrated mail/address configuration and writes its normal development email log without sending mail. Inspect the project-specific expected message count; this application writes one recipient copy and one site-owner copy per submission.
- The ignored root-level `logs/email.log` and `logs/error.log` are visible directly in the editor. No named-volume extraction or root shell should be required to read development logs.
- With browsers idle, the app and proxy logs remain idle; PostgreSQL readiness checks do not create Citizen requests.
- A cross-origin request and preflight receive `403` with no `Access-Control-Allow-*` response headers; ordinary and same-origin requests continue to work.
- Postico connects to `127.0.0.1:5432` with the existing development credentials.
- Data survives `./scripts/dev-compose down` followed by `./scripts/dev-up`.

#### Establish development lifecycle and recovery

Expose the raw Compose workflow through consistent, project-development npm commands:

```sh
npm run dev:build
npm run dev:start
npm run dev:stop
npm run dev:restart
npm run dev:destroy
npm run dev:status
npm run dev:logs
npm run dev:test
```

Route every development caller through a single `scripts/dev-compose` wrapper containing the `.env`, project-name, and Compose-file arguments. The npm lifecycle commands, startup helper, and both database scripts must call that wrapper rather than copying the Compose prefix.

`dev:stop` must use `docker compose stop`, retaining the containers for a fast
next `dev:start`. `dev:destroy` must use `docker compose down` without
`--volumes`, removing containers and the project network while preserving the
PostgreSQL volume and development logs. `dev:status` should include stopped containers.
Reserve volume deletion for an explicit, separately reviewed recovery or test
operation; neither friendly command removes it.

Add a logical backup path independent of the Docker volume:

```sh
npm run dev:start
npm run dev:db:backup
npm run dev:db:restore -- /absolute/path/to/verified-backup.dump
```

The backup command must:

- require the existing development database to be running so it cannot silently initialize and archive an empty replacement volume;
- default to a project-specific directory under the protected migration-input parent, with parent/backup directory mode `0700` and archive/checksum mode `0600`;
- write `pg_dump --format=custom --no-owner --no-privileges` through a temporary file with `umask 077`;
- reject an empty result, validate it with `pg_restore --list`, and only then publish the timestamped archive and SHA-256 checksum; and
- leave both the original migration dump and later development backups outside Git, the checkout, images, containers, and named volumes.

The restore command must accept exactly one readable archive, start only the
database temporarily when necessary, validate the archive before changing data,
require the user to type `RESTORE` in an interactive terminal, and use these
restore flags:

```text
--clean --if-exists --exit-on-error --single-transaction --no-owner --no-privileges
```

Stop running app/proxy connections for the restore, run
`ANALYZE`, and return app, proxy, and database services to their prior running
state even when validation or restore fails or the script receives `HUP`, `INT`,
or `TERM`. If the restore script started a previously stopped database, it must
stop it again regardless of whether app or proxy had been running.

Before accepting these commands, create one real protected backup and restore it
into a separately named temporary Compose project/volume. Compare the same
schema, row counts, maximum IDs, sequence values, and representative queries,
then inspect the temporary volume's Compose project label before removing only
that test project with `down --volumes`. Never test the destructive path against
the accepted development volume merely to prove the script.

After acceptance, shut down the old project's VM services and observe the Docker setup. Delete the VM only after its migration dump is stored somewhere independent of that VM and every other workload on the VM has been migrated or retired.

#### Retire the development VM

Once the deletion gate is clear:

1. Stop the old application, Nginx, and PostgreSQL in the VM.
2. Power off the VM with `sudo poweroff`.
3. Run development Docker through the agreed observation period and confirm the protected dump is still readable.
4. Delete the powered-off VM and its virtual disks/snapshots using the VM product that created it. Record that product and its exact deletion command during inventory; do not guess it in advance.
5. Remove the obsolete VM SSH alias, shared-folder entry, port-forwarding rule, and any hosts entry pointing `dev.jaysylvester.com` to the VM.
6. Confirm `dev.jaysylvester.com` still resolves to `127.0.0.1` and development Docker still passes the smoke test.

### Create the single production rollback snapshot

Because downtime is acceptable and no production files, configuration, packages, or database data will change between phases, use one powered-off DigitalOcean snapshot as the rollback for every production change in this plan.

Verify the current site, stop the Droplet cleanly, and wait for it to power off:

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
git status --short
git rev-parse HEAD
sudo -u postgres psql -d jaysylvester -Atqc "SELECT current_timestamp;"
sudo shutdown -h now
```

`[DIGITALOCEAN CONTROL PANEL]`

1. Open the existing Droplet's **Backups & Snapshots** page.
2. Create a snapshot named `jaysylvester-pre-citizen2-docker-REPLACE_ME_DATE`.
3. Wait until the snapshot is complete and record its name in the migration notes.
4. Turn the same Droplet back on.
5. Confirm its existing public IP, SSH access, application, Nginx, PostgreSQL, and HTTPS all work.

Do not create a new Droplet for rollback. Restoring this snapshot onto the same existing Droplet overwrites its disk with the captured state while the Droplet retains its IP and metadata. Keep this snapshot until both phases, cleanup, reboot, and final acceptance are complete. If the assumption of no production changes between phases becomes false, stop and replace it with a fresh powered-off snapshot before continuing.

### Defer the production application change

Do not deploy the project-config-module revision through the existing host process.
It intentionally sets Citizen's HTTP binding for the private container network and
expects the Docker deployment environment. Keep production on its pre-migration
revision until the app, proxy, and database move to Docker together in Phase 2. The
production inventory and powered-off snapshot remain the preparation and rollback
inputs for that cutover.

### Phase 1 acceptance gate

Phase 1 was accepted on 2026-08-09 after the revised project-config-module criteria passed in development; the protected development database dump is independent of the VM. Production remains on its existing application and host services until the coordinated Phase 2 Docker cutover; do not deploy the container-only Citizen configuration through the host service.

## 7. Phase 2 — Production Deployment

Phase 2 starts from the accepted development Docker application while production still runs its pre-migration host stack. It inventories and prepares the Debian infrastructure, adds the production Compose overlay, migrates the live production database, switches Nginx and the app to Docker with the accepted Citizen revision, preserves Let's Encrypt, and finally removes the retired host runtimes. The existing production stack can remain in service indefinitely before this phase begins.

### Operator-presence gates

Most inventory, implementation, builds, configuration review, and automated tests can proceed without continuous operator involvement once access is available. The operator must be present for these explicit gates:

1. Authenticate to the production host and provide `sudo` access when the SSH session cannot reuse credentials.
2. Confirm the powered-off DigitalOcean rollback snapshot in the control panel before any production mutation. If the existing snapshot is absent or stale, create and verify a replacement before installing Docker, changing Certbot, or modifying production files.
3. Supply or verify the protected production `.env` values without copying secrets into Git, chat, logs, or shell history.
4. Review the complete branch diff and approve the fast-forward merge from `maintenance/docker-migration` into `main` and the push of `main`.
5. Start the maintenance window and approve stopping the host application, Nginx, and PostgreSQL, pulling the new `main`, and restoring the production dump into Docker.
6. Perform or confirm the human-facing acceptance checks: public browsing, production contact and confirmation email delivery, Postico over SSH, and the certificate details.
7. Choose rollback through the DigitalOcean control panel if acceptance fails. If acceptance succeeds, separately approve the pre-cleanup reboot rehearsal, later destructive host-runtime purge, final reboot, and eventual snapshot deletion.

The operator does not need to remain present while images build, the production overlay is authored, static configuration is reviewed, or automated tests run. Stop at each gate rather than carrying approval from one gate into the next.

### Inventory the production Debian droplet

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
hostname
cat /etc/os-release
test "$(. /etc/os-release && printf '%s' "$ID")" = debian
git status --short
git branch --show-current
test "$(git branch --show-current)" = main
git rev-parse HEAD
node --version
node -p "require('./node_modules/citizen/package.json').version"
nginx -v
psql --version
sudo certbot --version
sudo systemctl status nginx postgresql --no-pager
systemctl list-units --type=service --all | grep -Ei 'citizen|node|jay'
ps -ef | grep -E '[n]ode|[n]pm'
sudo ss -lntp
df -h
sudo -u postgres psql -Atqc "SELECT version();"
sudo -u postgres psql -d jaysylvester -Atqc "SHOW server_encoding; SHOW lc_collate; SHOW lc_ctype; SHOW timezone;"
sudo -u postgres psql -d jaysylvester -Atqc "SELECT extname FROM pg_extension ORDER BY extname;"
```

Record the exact production deployment branch, current Citizen application unit/process command, active legacy JSON path, normal host deployment commands, and current Git/Citizen revisions. Confirm the legacy JSON remains available to the running pre-migration app and that the recorded DigitalOcean snapshot exists. The protected production `.env` for the target containers is prepared separately and is not activated until cutover.

Capture the complete effective Nginx configuration and certificate setup:

```sh
sudo nginx -t
sudo install -d -m 0700 REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/nginx-before-docker
sudo sh -c 'nginx -T > REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/nginx-before-docker/effective.txt 2>&1'
sudo certbot certificates
sudo find /etc/letsencrypt/renewal -maxdepth 1 -type f -name '*.conf' -print
sudo grep -RE '^(authenticator|installer|webroot_path)[[:space:]]*=' /etc/letsencrypt/renewal
sudo systemctl list-timers --all | grep -Ei 'certbot|letsencrypt'
sudo certbot reconfigure --help >/dev/null
sudo certbot renew --help all | grep -F -- '--run-deploy-hooks'
```

If either Certbot feature check fails, upgrade Certbot through its existing supported installation channel during preparation, before the maintenance window, and repeat the checks.

Review the development and production Nginx captures and list only application-relevant behavior to reproduce:

- Server names and canonical-host redirects.
- HTTP-to-HTTPS and legacy redirects, including status codes and query-string behavior.
- Static root, `try_files`, named locations, MIME/gzip/cache behavior, and `web/shoplc/`.
- Proxy headers and other site-specific proxy settings already active.
- TLS certificate paths and important security headers.
- ACME challenge handling.

Production is authoritative for public behavior. Record its exact static expiry and emitted cache headers explicitly, even if the result is 30 days, and do not derive them from development's `no-store` policy or the retired development VM's 30-day value. Do not copy unrelated Debian-wide Nginx defaults or module-loading files into the image.

### Implement and review the production overlay

Copy the protected effective Nginx capture to a protected workstation path outside Git, then update the accepted `maintenance/docker-migration` branch and confirm that current `main` is still its ancestor. Continue the production implementation on the migration branch; do not introduce a second short-lived production branch. If `main` has advanced independently, reconcile it on the workstation, rerun affected development checks, and review the result before continuing:

`[WORKSTATION — macOS]`

```sh
mkdir -p /absolute/private/path/docker-migration-production
chmod 700 /absolute/private/path/docker-migration-production
scp REPLACE_ME_PRODUCTION_SSH:REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/nginx-before-docker/effective.txt /absolute/private/path/docker-migration-production/
cd /absolute/path/to/jaysylvester.com
git fetch origin main maintenance/docker-migration
git switch maintenance/docker-migration
git pull --ff-only origin maintenance/docker-migration
git merge-base --is-ancestor origin/main HEAD
git status --short
```

Implement `compose.production.yaml`, a new production Nginx configuration derived from the effective production capture—not from `docker/nginx/dev.conf`—the Certbot reload hook, the focused production smoke-test cases, and the production README sections. Confirm the production overlay injects only `NODE_ENV`, `DB_DATABASE`, and `DB_USER` into `app`, sets `DB_PASSWORD_FILE` and `MAIL_AUTH_PASS_FILE`, grants the matching secrets, and gives `db` only its explicit `POSTGRES_*` inputs plus `POSTGRES_PASSWORD_FILE`. It must not use `env_file`, mount `.env`, override the config module's container binding, or give application secrets to `assets` or `proxy`. Use the effective configuration to preserve redirects, locations, headers, static behavior including the inventoried cache policy, and ACME handling; do not copy unrelated host-wide Nginx content.

Set `restart: unless-stopped` for production `db`, `app`, and `proxy` in the production overlay. Development keeps its existing explicit lifecycle. Enabling Docker at boot is not sufficient by itself; the production containers must have restart policies so the accepted stack returns after a Droplet reboot.

Render and build the production definitions on the Mac with a temporary, non-secret review environment outside Git:

```sh
cp .env.example /tmp/jaysylvester-production-review.env
${EDITOR:-vi} /tmp/jaysylvester-production-review.env
docker compose --env-file /tmp/jaysylvester-production-review.env -p jaysylvester-production-review -f compose.yaml -f compose.production.yaml config --quiet
docker compose --env-file /tmp/jaysylvester-production-review.env -p jaysylvester-production-review -f compose.yaml -f compose.production.yaml build app proxy
rm /tmp/jaysylvester-production-review.env
git diff --check
git status --short
git add compose.production.yaml docker/nginx scripts/reload-production-proxy scripts/smoke-test README.md citizen.config.js Dockerfile compose.yaml .env.example
git diff --cached --check
git commit -m "Add production Docker deployment"
git push origin maintenance/docker-migration
```

Use syntactically valid placeholders and dummy passwords in the temporary review file, not production credentials. In addition to rendering and building, perform one focused production-target app startup with those dummy Compose secrets and prove the application's direct file reads obtain both passwords while the values remain absent from the rendered app environment and `docker inspect`. Review the staged file list before committing in case the implementation changed a different focused file. Re-run the development smoke test after these shared-file changes; Phase 2 must not regress the accepted Phase 1 environment.

### Prepare production

Before running any command in this section that changes the production host, confirm in the DigitalOcean control panel that the powered-off pre-migration snapshot is complete, current for the accepted rollback assumptions, and restorable onto the existing Droplet. Stop and replace it if production state has changed since it was created.

#### Install Docker Engine on Debian

Use Docker's official Debian repository:

```sh
sudo apt update
sudo apt install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Compare these commands with Docker's current Debian instructions immediately before running them, and update the README if Docker has changed its repository setup.

Verify:

```sh
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
sudo docker run --rm hello-world
```

Confirm the DigitalOcean and Debian firewalls expose only the intended public ports, especially SSH, 80, and 443. PostgreSQL must remain loopback-only.

#### Verify the snapshot and production environment

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
git status --short
git fetch origin maintenance/docker-migration
git diff --stat HEAD origin/maintenance/docker-migration
find app/config -maxdepth 1 -type f -name '*.json' -print
```

Stop if the tracked worktree is dirty. A legacy production JSON file is expected while the pre-migration host app remains active; record its path without printing it and remove it only during the maintenance-window cutover after the snapshot is confirmed. In the DigitalOcean control panel, confirm `jaysylvester-pre-citizen2-docker-REPLACE_ME_DATE` is complete and available before continuing.

Prepare the ignored project-root production `.env` by translating the inventoried legacy JSON without printing its values. It must contain `NODE_ENV=production`, the database and role names, the existing database/mail passwords, and the rehearsed `POSTGRES_INITDB_ARGS` and `POSTGRES_TIMEZONE`. Do not add the development-only `BROWSERSYNC_ORIGIN` or the retired `CORS_ALLOW_ORIGIN`. Stable host/port/pool/mail values are committed in `citizen.config.js`. Protect `.env` with mode `0600`. Compose will use it for interpolation and as the source of the two production secrets; it must not be passed wholesale to `app`.

Verify the final target database volume is absent without starting Compose:

```sh
if sudo docker volume inspect jaysylvester-production-postgres >/dev/null 2>&1; then
  echo 'Target production volume already exists; identify and back it up before continuing.' >&2
else
  echo 'Target production volume is absent as required.'
fi
```

#### Prepare Certbot for container Nginx

Keep Certbot on the Debian host. The proxy mounts `/etc/letsencrypt` read-only and shares `/var/www/certbot` as the HTTP-01 webroot.

```sh
CERT_NAME=REPLACE_ME_CERT_NAME
sudo install -d -m 0755 /var/www/certbot/.well-known/acme-challenge
sudo certbot certificates
sudo test -r "/etc/letsencrypt/live/$CERT_NAME/fullchain.pem"
sudo test -r "/etc/letsencrypt/live/$CERT_NAME/privkey.pem"
```

The DigitalOcean snapshot contains the original renewal configuration and hooks. No separate Certbot rollback archive is required.

If the existing renewal configuration uses the Nginx authenticator, add the same ACME location to the current host Nginx server before cutover and verify it publicly:

```nginx
location ^~ /.well-known/acme-challenge/ {
    root /var/www/certbot;
    try_files $uri =404;
}
```

```sh
sudo nginx -t
sudo systemctl reload nginx
printf '%s\n' docker-migration-test | sudo tee /var/www/certbot/.well-known/acme-challenge/docker-migration-test >/dev/null
curl -fsS http://jaysylvester.com/.well-known/acme-challenge/docker-migration-test
sudo rm /var/www/certbot/.well-known/acme-challenge/docker-migration-test
```

Do not install the container reload hook until container Nginx is running.

#### Merge the reviewed migration into `main`

After the production overlay, dummy-secret checks, and development regression checks pass, review the complete migration diff and fast-forward `main` to `maintenance/docker-migration`. This is the release gate for all Citizen 2.0 and Docker changes; do not merge only the production overlay or omit the accepted Phase 1 commits:

`[WORKSTATION — macOS]`

```sh
cd /absolute/path/to/jaysylvester.com
git fetch origin main maintenance/docker-migration
git switch maintenance/docker-migration
git pull --ff-only origin maintenance/docker-migration
git merge-base --is-ancestor origin/main HEAD
git diff --stat origin/main...HEAD
git log --oneline origin/main..HEAD
git status --short
git switch main
git pull --ff-only origin main
git merge --ff-only maintenance/docker-migration
git push origin main
```

The merge must fast-forward because the migration branch should contain every intervening `main` commit. If it does not, stop and reconcile the branches on the workstation, rerun affected development checks, and retry; do not resolve application conflicts on the droplet. Keep `maintenance/docker-migration` until production acceptance and cleanup are complete.

Do not pull the new `main` into the active production checkout before the maintenance window. Unlike an inert overlay-only change, it includes the container-oriented Citizen configuration and application environment contract. Keep the existing host application revision running until the coordinated cutover below.

### Production cutover

Downtime is acceptable. Pause manual Postico changes until cutover validation completes.

#### Stop the host stack and dump PostgreSQL

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
APP_SERVICE=REPLACE_ME_RECORDED_APP_SERVICE
test "$(git branch --show-current)" = main
sudo systemctl stop "$APP_SERVICE"
git pull --ff-only origin main
OLD_PRODUCTION_CONFIG=app/config/REPLACE_ME_CURRENT_PRODUCTION_CONFIG.json
PRODUCTION_ENV_SOURCE=/absolute/protected/path/production.env
rm -- "$OLD_PRODUCTION_CONFIG"
install -m 0600 "$PRODUCTION_ENV_SOURCE" .env
pdc() { sudo docker compose --env-file .env -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
pdc config --quiet
pdc build --pull app proxy
pdc run --rm --no-deps --entrypoint node app --version
pdc run --rm --no-deps --entrypoint node app -p "require('./node_modules/citizen/package.json').version"
pdc run --rm --no-deps --entrypoint sh app -c "test -r /site/citizen.config.js && test -r /run/secrets/db-password && test -r /run/secrets/mail-auth-pass && ! find /site/app/config -maxdepth 1 -type f -name '*.json' -print 2>/dev/null | grep ."
sudo systemctl stop nginx
sudo systemctl is-active "$APP_SERVICE" nginx || true
MIGRATION_DIR="REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/docker-migration-$(date -u +%Y%m%dT%H%M%SZ)"
sudo install -d -m 0700 -o "$(id -un)" -g "$(id -gn)" "$MIGRATION_DIR"
sudo -u postgres pg_dump -Fc --no-owner --no-acl -d jaysylvester > "$MIGRATION_DIR/jaysylvester-production.dump"
cd "$MIGRATION_DIR"
sha256sum jaysylvester-production.dump > jaysylvester-production.dump.sha256
sha256sum -c jaysylvester-production.dump.sha256
pg_restore --list jaysylvester-production.dump >/dev/null
sudo systemctl stop postgresql
sudo ss -lntp | grep -E ':(80|443|5432)[[:space:]]' || true
```

If the application is not managed by systemd, use the recorded stop command instead. The image checks must report Node.js 24, the Citizen commit accepted in development, both root configuration files, and no JSON path. Confirm the tracked lockfile resolves the commit recorded in `docs/migrations/citizen-2.md`.

Do not remove the stopped host services until Docker has passed acceptance and reboot checks. The DigitalOcean snapshot remains the authoritative rollback.

#### Restore and start Docker

```sh
cd /var/www/jaysylvester.com
pdc() { sudo docker compose --env-file .env -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
pdc up -d db
pdc exec -T db pg_isready -U jaysylvester -d jaysylvester
pdc exec -T db pg_restore -U jaysylvester -d jaysylvester --exit-on-error --single-transaction --no-owner --no-privileges < "$MIGRATION_DIR/jaysylvester-production.dump"
pdc exec -T db psql -U jaysylvester -d jaysylvester -v ON_ERROR_STOP=1 -c 'ANALYZE;'
pdc up -d app proxy
pdc ps
pdc logs --tail=200 db app proxy
```

Run the same concise schema, row-count, maximum-ID, sequence, extension, and representative-query comparison used in development.

Validate:

- Citizen reports the optional/process-environment message, loads `/site/citizen.config.js`, and starts in production mode.
- The running container uses Node.js 24 and the same recorded Citizen 2.0 Git commit tested in development.
- Database and mail consumers use typed `app.config` values plus the explicit nonsecret deployment allowlist and password secret files. Password values are absent from app/database container environments; Citizen applies the typed config module with CORS unset; no legacy JSON exists inside the container; Node is non-root; logs are writable; PostgreSQL is healthy; and app/proxy are running.
- All inventoried redirects have the same status and destination.
- Existing application routes, static assets, `web/shoplc/`, 404 behavior, and HTTPS work.
- The public certificate name, chain, and expiry are correct.
- Production contact and confirmation email work with the explicit configuration inputs and existing credentials.
- Cross-origin requests and preflights fail closed with `403` and no CORS response headers unless Phase 2 inventories and documents a real production cross-origin consumer.
- Postico reaches remote `127.0.0.1:5432` through the existing SSH connection.

Suggested external checks:

```sh
./scripts/smoke-test https://jaysylvester.com
curl -fsSI http://jaysylvester.com/
curl -fsS -o /dev/null https://jaysylvester.com/
```

#### Complete Certbot integration

If the certificate currently uses the Nginx authenticator, verify that the installed Certbot supports `reconfigure`, then switch that existing certificate to the shared webroot. Do not hand-edit renewal files:

```sh
sudo certbot reconfigure --help >/dev/null
sudo certbot reconfigure --cert-name REPLACE_ME_CERT_NAME --webroot --webroot-path /var/www/certbot
```

Install the minimal deploy hook only after proxy is running:

```sh
sudo install -m 0755 scripts/reload-production-proxy /etc/letsencrypt/renewal-hooks/deploy/reload-jaysylvester-proxy
sudo certbot renew --dry-run --run-deploy-hooks
sudo systemctl list-timers --all | grep -Ei 'certbot|letsencrypt'
```

The hook must use the fixed production Compose project/files and run `nginx -s reload` inside `proxy`. It does not need a permanent host-Nginx fallback. Snapshot restoration returns the original renewal behavior automatically.

After all checks pass, disable the stopped host services so a reboot cannot make them compete for ports:

```sh
sudo systemctl disable "$APP_SERVICE" nginx postgresql
sudo systemctl enable docker
```

#### Rehearse reboot recovery before cleanup

Before deleting any host runtime or data, reboot once with the stopped host services disabled and the production containers configured with `restart: unless-stopped`:

```sh
sudo reboot
```

Reconnect and verify that Docker restored the stack without a manual `compose up`:

```sh
cd /var/www/jaysylvester.com
APP_SERVICE=REPLACE_ME_RECORDED_APP_SERVICE
pdc() { sudo docker compose --env-file .env -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
pdc ps
pdc exec -T db pg_isready -U jaysylvester -d jaysylvester
./scripts/smoke-test https://jaysylvester.com
sudo certbot certificates
sudo systemctl list-timers --all | grep -Ei 'certbot|letsencrypt'
sudo ss -lntp | grep -E ':(80|443|5432)[[:space:]]'
sudo systemctl is-enabled docker
sudo systemctl is-enabled "$APP_SERVICE" nginx postgresql || true
```

Confirm public HTTPS, email, and Postico still work. If the containers did not return automatically or a retired service reclaimed a port, stop and correct the production overlay or service state before cleanup.

### Production rollback

This rollback applies to an unacceptable Phase 2 Docker cutover. Because the site and database do not change between the snapshot and cutover, do not reconstruct packages, Git revisions, configuration, Certbot, or PostgreSQL manually.

`[DIGITALOCEAN CONTROL PANEL]`

1. Open the existing Droplet and choose the restore action for `jaysylvester-pre-citizen2-docker-REPLACE_ME_DATE`.
2. Confirm that the restore will overwrite the existing Droplet's disk.
3. Wait for restoration to complete, then power on that same Droplet if necessary.
4. Confirm the Droplet still has its existing public IP.
5. Verify SSH, the public site, HTTPS, Nginx, PostgreSQL, the application service, and Postico.

This restores the whole server to its pre-migration condition, including Citizen 1.x, the original Node runtime, Git checkout, JSON configuration, Nginx, PostgreSQL data, Certbot configuration, systemd units, and removal of any Docker state created later. Do not create a replacement Droplet, because a newly created Droplet does not inherit the original IP from the snapshot.

### Normal use after migration

#### Development

```sh
cd /absolute/path/to/jaysylvester.com
npm run dev:start
npm run dev:status
npm run dev:logs
npm run dev:stop
```

Use `npm run dev:stop` for the normal fast stop/start cycle and
`npm run dev:destroy` only when the containers and project network should be
removed. Both preserve the PostgreSQL named volume. Use `npm run dev:db:backup`
while the database is running, and restore one explicit archive with
`npm run dev:db:restore -- /absolute/path/to/backup.dump`.

After editing development `.env` or `citizen.config.js`, restart app. Both files are bind-mounted, Citizen reads them at process start, and a restart preserves the container IP, so proxy does not need recreation. A database-password rotation must also update the PostgreSQL role and recreate the database container's environment; editing `.env` alone is not sufficient:

```sh
dc() { ./scripts/dev-compose "$@"; }
dc restart app
npm run dev:test
```

In production, an `.env` change requires recreating each service whose explicit environment or secret source changed. Recreate app followed by proxy for application/mail changes; rotate the PostgreSQL role before recreating `db` for a database-password change. A config-module change is an image change in production and follows the normal build plus app/proxy recreation. Do not refresh the Citizen branch implicitly during deployment: test the new Citizen commit upstream, update this project's lockfile and migration record in a reviewed development commit, and deploy that commit through the normal sequence.

#### Production deployment

```sh
cd /var/www/jaysylvester.com
git status --short
git pull --ff-only
pdc() { sudo docker compose --env-file .env -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
pdc config --quiet
pdc build app proxy
pdc up -d --no-deps --force-recreate app
pdc ps app
pdc logs --tail=100 app
pdc up -d --no-deps --force-recreate proxy
pdc ps
./scripts/smoke-test https://jaysylvester.com
```

This ordered app-then-proxy recreation prevents Nginx from retaining the deleted app container's IP. `--no-deps` ensures routine deployments do not recreate PostgreSQL.

#### Postico

Development:

- Host `127.0.0.1`, port `5432`.
- Existing development database, user, and password.

Production:

- Keep the existing SSH host/tunnel.
- Remote database host `127.0.0.1`, port `5432`.
- Existing production database, user, and password.

Development logical backup/restore uses the friendly development commands above.
Production database backup remains governed by the Phase 2 cutover and the
eventual production operations policy; do not point the development helper scripts at
production.

### Remove retired production services

Perform cleanup only after:

- Docker production has passed the application, database, HTTPS, email, Postico, and Certbot checks.
- Docker survives a droplet reboot.
- The final migration dump and checksum remain readable.
- The DigitalOcean snapshot is still available for whole-server rollback.

#### Remove host runtimes

First identify exact installed packages and review a simulated purge:

```sh
dpkg -l | grep -E '^(ii)[[:space:]]+(nginx|postgresql|nodejs|npm)'
sudo apt-get -s purge REPLACE_ME_EXACT_NGINX_POSTGRESQL_NODE_PACKAGES
```

After confirming that the simulation removes only the retired host runtime:

```sh
sudo apt-get purge REPLACE_ME_EXACT_NGINX_POSTGRESQL_NODE_PACKAGES
```

Remove the retired custom application unit after confirming its exact path is under `/etc/systemd/system`:

```sh
APP_UNIT_PATH="$(systemctl show -p FragmentPath --value "$APP_SERVICE")"
case "$APP_UNIT_PATH" in
  /etc/systemd/system/*) sudo rm -- "$APP_UNIT_PATH" ;;
  *) echo "Unexpected app unit path: $APP_UNIT_PATH; inspect it instead of deleting it." >&2 ;;
esac
sudo rm -rf -- "/etc/systemd/system/$APP_SERVICE.d"
sudo systemctl daemon-reload
```

If inventory found a NodeSource or PostgreSQL apt source used only by the removed host packages, remove that exact source/key file as well. Do not remove Docker's repository or Certbot's installation source.

Do not run an unreviewed `apt autoremove`. Do not remove Docker, Certbot, SSH, the firewall, or shared system accounts such as `www-data`.

Confirm the following exact paths contain only retired host data, then remove them:

```sh
sudo du -sh /var/lib/postgresql /etc/postgresql /etc/nginx /var/log/postgresql /var/log/nginx 2>/dev/null || true
sudo rm -rf -- /var/lib/postgresql /etc/postgresql /etc/nginx /var/log/postgresql /var/log/nginx
```

Remove the host-installed application `node_modules` and any application-specific host Node runtime after confirming the production container uses the explicit nonsecret environment plus readable password secret files and contains no `app/config/*.json`:

```sh
cd /var/www/jaysylvester.com
rm -rf -- /var/www/jaysylvester.com/node_modules
```

Remove a host Node runtime only when the production inventory proves it was dedicated to this application; use its exact inventoried package or installation path rather than assuming the canceled `/opt/node24` layout. The Docker build excludes host `node_modules` and installs the locked Linux dependency tree inside its image. The DigitalOcean snapshot contains the removed host dependency tree and runtime if rollback is required.

The Docker app uses its persistent logs mount rather than the checkout's retired host log files. Remove the old host log files after confirming the container logs are writable; preserve the directory itself if the repository expects it.

Preserve:

- `/var/lib/docker` and all Docker volumes.
- `/etc/letsencrypt`, `/var/www/certbot`, Certbot, its timer, and the container reload hook.
- `/var/www/jaysylvester.com`, project-root `.env`, `.env.example`, `docs/migrations/citizen-2.md`, and the tracked Citizen 2.0 lockfile.
- The migration dump until final acceptance.

#### Final verification

```sh
sudo reboot
```

Reconnect and run:

```sh
cd /var/www/jaysylvester.com
pdc() { sudo docker compose --env-file .env -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
pdc ps
pdc exec -T db pg_isready -U jaysylvester -d jaysylvester
./scripts/smoke-test https://jaysylvester.com
sudo certbot certificates
sudo systemctl list-timers --all | grep -Ei 'certbot|letsencrypt'
sudo ss -lntp | grep -E ':(80|443|5432)[[:space:]]'
command -v nginx node npm postgres psql || true
systemctl list-unit-files | grep -E 'nginx|postgresql|REPLACE_ME_APP_UNIT_PATTERN' || true
```

The last two commands should produce no retired host runtime or unit. Confirm Postico still connects through SSH. Record in the README that Node, Nginx, and PostgreSQL now run only in Docker while Certbot intentionally remains on the Debian host.

After final acceptance, keep or delete `jaysylvester-pre-citizen2-docker-REPLACE_ME_DATE` according to the desired rollback window. Deleting it ends whole-server rollback and stops its snapshot storage charge.

## 8. README Requirements

Replace the current placeholder README during implementation. It must contain:

### Supported macOS path

- Install Docker Desktop and `mkcert` with Homebrew.
- Clone the repository.
- Copy the sanitized project-root `.env.example` to ignored project-root `.env`, supply the environment's protected values, and obtain an authoritative database dump; Git does not supply credentials or data.
- Add the development hostname to `/etc/hosts`.
- Run `scripts/dev-up` and restore the database on a first clone.
- Use Postico at `127.0.0.1:5432`.
- Explain Citizen 2.0's native development `.env` plus committed `citizen.config.js` model, the expected loaded-environment and loaded-config startup messages, development HTTPS, Gulp/BrowserSync, editor-visible logs, normal stop versus destroy semantics, logical database backup/restore, and restart-only `.env`/config-module changes.

### Future Linux host differences

- Install Docker Engine and Compose using that distribution's official instructions.
- Install `mkcert` and its browser trust dependency.
- Update `/etc/hosts` and account for firewall/low-port rules.
- Verify bind-mount ownership and, if necessary, supply a Linux UID/GID override for files written by the assets service.
- Mark this path as untested until it is actually exercised.

### Future Windows host differences

- Use Docker Desktop with WSL 2 and keep the checkout in the WSL filesystem.
- Run repository shell commands in WSL.
- Install/trust `mkcert` in the Windows browser trust store and document whether the Windows or WSL hosts file supplies name resolution.
- Preserve LF line endings and executable bits for shell scripts.
- Mark this path as untested until it is actually exercised.

### Production

- During the interval between phases, clearly state that production remains on its pre-migration host application and services and must not pull the container-oriented Citizen revision before the maintenance-window cutover.
- Debian host architecture and required ignored inputs.
- SSH, `git pull`, ordered app/proxy Compose deployment, and smoke test.
- Direct Citizen branch dependency behavior: ordinary deploys use the locked commit; consuming a newer branch commit requires upstream tests, a deliberate lockfile refresh, and an updated migration record.
- Postico through SSH to remote loopback port 5432.
- Host Certbot/webroot/timer/deploy-hook arrangement.
- The fact that host Node, Nginx, and PostgreSQL were removed after migration.

When Phase 2 completes, replace the pre-migration host-application procedure with the Compose procedure rather than leaving two apparently active production methods.

Keep the README task-focused. Do not turn the future-host notes into separately engineered and tested deployment systems during this migration.

## 9. Acceptance Criteria

### Phase 1 is complete when

- Development runs on the Mac through Docker Desktop with no dependency on the old VM.
- Citizen's native test suite passes under both Node.js 22 and Node.js 24 at the exact direct-branch commit resolved by this project's lockfile.
- The development image uses Node.js 24 and Citizen 2.0 directly from `2.0`; no unpublished framework patch exists only in this repository or image.
- Development bind-mounts the protected project-root `.env` read-only at `/site/.env`, Citizen loads committed `/site/citizen.config.js`, framework settings are exposed under `app.config.citizen`, and typed nonsecret database/mail settings are exposed beside it.
- No `.env` is present in an image layer; the development app alone receives the runtime bind. `/site/citizen.config.js` is copied into the image and bind-mounted for development editing. Secret values do not appear in Git, image layers, logs, `app.config`, `assets`, or `proxy`.
- The shared `app.start()` call receives only the application-owned cache buster; active framework reads use `app.config.citizen`/`config.citizen`, and application reads use `app.config.db`/`app.config.mail`.
- No `app/config/*.json` exists in the development Citizen 2.0 container; the development source JSON was converted without credential rotation and archived recoverably.
- Node runs non-root, Citizen can write editor-visible development logs through the ignored root bind mount, and development source mounts do not mask image-owned `/site/node_modules`.
- The development Docker database was restored from the live VM database with schema, row counts, maximum IDs, sequences, extensions, and representative queries matching.
- The development database volume was initialized with the reviewed source encoding, `lc_collate`, `lc_ctype`, and timezone; `resources/data.sql` was not used.
- Existing development routes, static content, `web/shoplc/`, email logging, `Forwarded` behavior, and HTTPS work as before; Citizen's unset CORS default rejects cross-origin requests and preflights with `403` and no allow headers.
- Contact-form owner delivery is awaited before success; the visitor confirmation follows sequentially, and a confirmation-only failure is logged without producing an error page that encourages a duplicate owner submission.
- No continuous app/proxy health check generates synthetic Citizen requests; the explicit smoke test proves the end-to-end path, while `pg_isready` gates app startup on PostgreSQL readiness.
- Development HTTPS is trusted without certificate copying, proxy ports 80/443 are bound to loopback, and source watching plus BrowserSync work through Docker Desktop.
- Containerized asset builds use the tracked browser targets and match host-build targeting.
- Development PostgreSQL is reachable by Postico only through loopback and its data survives container recreation.
- Development artifacts and Docker resources use `dev` identifiers; environment prose uses “development,” reserving `local` for Citizen's response namespace, `localhost`, and genuine workstation or loopback semantics.
- Normal `dev:stop` retains containers, explicit `dev:destroy` removes containers/network without volumes, and a verified logical backup exists outside Docker. That backup restores successfully into an isolated temporary project/volume with focused data comparisons matching.
- `package-lock.json` is tracked, records the tested Citizen Git commit, and builds pass with `npm ci`.
- `docs/migrations/citizen-2.md` and the macOS README instructions contain no secrets and record the development migration evidence.
- Required secrets, dumps, and private keys are absent from Git and image layers.
- Production remains on its pre-migration host application, Nginx, PostgreSQL, and Certbot until Phase 2; its original JSON is preserved in the DigitalOcean rollback snapshot.
- The container-oriented Citizen revision is not deployed to the host process. It reaches production only in the reviewed Docker cutover.
- The development VM is deleted only after its remaining workloads and backups are accounted for.

### Phase 2 is complete when

- Production runs the app, Nginx, and PostgreSQL through Docker Compose on Debian using the Citizen 2.0 application revision accepted in development plus the reviewed production overlay.
- Production injects only the explicit nonsecret application environment, supplies database and mail passwords through service-scoped Compose secret files, and exposes neither password through app/database container environments, rendered configuration, logs, `assets`, or `proxy`.
- A focused dummy-secret production-target startup was accepted before deployment, and the live production startup uses the same direct password-file reads.
- The production JSON converted during Phase 2 is absent from the Citizen 2.0 container, with the original retained in the DigitalOcean snapshot and no credential rotation.
- The production Docker database was restored from the live host database with its initialization settings and focused data comparisons matching.
- Existing public routes, static content, `web/shoplc/`, redirects, 404 behavior, email, proxy headers, and HTTPS work as before; CORS remains unset and fail-closed unless a real production cross-origin consumer was inventoried during Phase 2.
- Production Let's Encrypt renewal succeeds and reloads container Nginx.
- Production PostgreSQL is reachable by Postico only through the existing SSH tunnel and survives container recreation.
- Routine production app deployment recreates proxy afterward and does not recreate the database.
- The powered-off pre-migration DigitalOcean snapshot remains available through the rollback window and restores the existing Droplet in place.
- The README documents the final Debian production, deployment, Postico, Certbot, and cleanup procedures.
- Retired production host runtimes and data are removed only after the Docker stack, migration dump, reboot, and Certbot checks pass.

## 10. Scope-Control Rationale for Reviewers

This plan was deliberately reduced after earlier reviews expanded it beyond the migration's needs. Its approved purpose now has two connected parts: migrate this application to the direct Citizen 2.0 branch as the first real-project validation, and move the application plus its two databases into Docker. It must preserve behavior, remove the custom development VM, reproduce production, maintain HTTPS, capture reusable Citizen migration evidence, and retire the replaced production services. It is not a general infrastructure-modernization program.

The two-phase boundary is deliberate. Phase 1 proves the shared application baseline in development Docker while the existing production host remains untouched. Because the accepted config module uses a container-only HTTP binding and mounted project environment, the production application and infrastructure adopt that revision together in Phase 2. Do not add an interim hostname variable or a second host-compatible configuration path merely to preserve the canceled application-only cutover.

Phase 2 contains the infrastructure complications the user explicitly chose to defer: Docker Engine on Debian, the production Compose/Nginx overlay, Citizen/config deployment, live database dump and restore, Certbot integration with container Nginx, and host-runtime cleanup. Reviewers must not pull those tasks into Phase 1.

Production rollback is intentionally one operation: restore the single powered-off DigitalOcean snapshot onto the existing Droplet. The accepted assumptions are that downtime is unimportant and no production state changes between the snapshot and completion of both phases. Do not add parallel runtime archives, dependency archives, configuration archives, Git-detach recovery, targeted service reconstruction, or a second snapshot unless those assumptions change.

The following requested outcomes are not scope creep and must remain:

- Both macOS development and Debian production are containerized.
- This project migrates to Citizen 2.0 and deploys on Node.js 24 using the direct branch, tests Citizen's minimum Node.js 22 support as well, and records findings for later Citizen projects.
- Both live databases are migrated directly.
- Citizen 1.x JSON is fully classified without silent loss: stable typed framework and nonsecret application settings move to `citizen.config.js`, deployment inputs and secrets move to `.env`, legacy JSON is rejected by the new containers, and the original remains in the rollback snapshot.
- Existing Nginx redirects and site behavior are inventoried before replacement.
- Development `mkcert` and production Let's Encrypt continue to provide HTTPS.
- The README supports the tested macOS path and identifies future Linux/Windows differences.
- Retired Nginx, PostgreSQL, and Node packages/data are removed from production after safe acceptance.
- Production app recreation is followed by proxy recreation to avoid Nginx's cached upstream IP.
- Development logical backups are stored outside Docker, verified before publication, and restore-tested against an isolated disposable volume. This is the narrow recovery path for accidental development named-volume deletion, not a scheduled backup platform.

Reviewers should not add a new requirement merely because it is a generally desirable operational practice. An addition belongs in this plan only when at least one of these is true:

1. Docker cannot run the current application correctly without it.
2. It prevents loss or corruption of the two databases during this migration.
3. It preserves behavior that exists in the source environments.
4. It is necessary to complete an outcome explicitly listed above.

Otherwise, record it as a follow-up. In particular, do not reintroduce:

- Cross-project gateways, port registries, or orchestration design.
- New application routes, proxy behavior, pool tuning, caching policy, or dependency upgrades.
- Custom process-inspection frameworks or exhaustive HTTP/database test harnesses.
- Scheduled backup automation, monitoring, retention policy, remote replication, or a general disaster-recovery design. Keep the developer-invoked development logical backup/restore path.
- Extra production hardening unrelated to replacing the three host runtimes.
- Fully implemented Linux and Windows variants before either host is actually used.
- A generalized Citizen migration utility, codemod, or speculative refactor of other projects. Reusable findings are required; implementing the next project's migration is not.

Prefer the smallest check that proves a migration requirement. A successful logical restore plus focused data comparisons and application queries is sufficient; it does not need a permanent database-test framework. Citizen's own configuration log plus a working application is sufficient; it does not need `/proc` parentage assertions. Reviewing the effective Nginx configuration and testing its actual redirects is sufficient; it does not need a generalized response-manifest system.

The direct Citizen test, explicit application configuration consumers, app-only development `.env` bind, committed config module, app-only development source mount, copied build-tool configuration, pre-init PostgreSQL arguments, intentional lockfile transition, powered-off production snapshot, and logical database dump are included under this test. They prevent concrete failures: consuming an untested framework commit, exposing the application environment to unrelated services, hiding edited application or framework-config files behind a stale image, masking Linux dependencies with a repository-root mount, producing host/container asset differences, expensive volume reinitialization, an unreproducible dependency, an incomplete whole-server rollback, and an unusable database migration source. They are narrow protections, not invitations to restore the broader tooling removed from earlier drafts.

Any proposed expansion should identify the concrete migration failure it prevents, the evidence that the risk exists in this project, and why the existing focused check is inadequate. Without that justification, it should remain outside this plan.

## 11. Reuse Checklist for Additional Citizen Projects

This document is an execution record for `jaysylvester.com`, not a file to copy
unchanged. For each additional project, copy the structure and controls while
replacing every application-specific assumption. Start a short migration record
for that project equivalent to `docs/migrations/citizen-2.md`.

### Record project parameters first

Create a non-secret inventory with at least:

| Parameter | Project-specific value to record |
| --- | --- |
| Repository and deployment branch | Checkout paths, current commit, dirty-worktree policy, and production branch |
| Source runtime | Citizen commit/version, Node version, start command, service name/user, and working directory |
| Protected configuration | Active Citizen 1.x JSON path and every framework-owned versus application-owned key |
| Development source host | VM product, SSH alias/command, application root, other workloads, and retirement gate |
| Development hostname and ports | HTTPS hostname, Nginx ports, Postico port, internal BrowserSync route, and conflicts with other migrated projects |
| Database | Database/role names, source PostgreSQL major, size, encoding, collation, character type, timezone, extensions, schemas, tables, sequences, and representative queries |
| Nginx | Effective server blocks, redirects, `try_files`, named locations, proxy headers, gzip, static expiry, access logging, TLS names, and special static trees |
| Application behavior | Focused routes, any real cross-origin browser consumers, contact/email behavior, secure-cookie behavior, log filenames/message count, and watcher-triggered outputs |
| Docker identity | Unique Compose project name, image names, named volumes, and protected backup directory |
| Production | Host type, public/loopback ports, certificate renewal mechanism, rollback snapshot, and cutover window |

Never reuse this project's database name, role, hostname, port assignment,
Compose project name, volume name, certificate names, route list, expected row
counts, or Nginx file without re-inventorying the target project.

### Repeat the migration in this order

1. Create the migration branch and a project-specific protected directory with mode `0700`; copy the source JSON and database dump into it with mode `0600`, checksums, and archive validation.
2. Inventory the effective VM and production runtimes before editing code. Capture `nginx -T`, PostgreSQL metadata including timezone, the actual start/service commands, and all VM retirement dependencies.
3. Audit every Citizen API/configuration reference against both the released Citizen 1.x documentation and the locked Citizen 2.0 branch. Do not infer that stale application code represents a 2.0 breaking change; this project's `app.helpers.log()` call came from an unreleased 2021 branch while released 1.x and 2.0 both document `app.log()`.
4. Classify every legacy JSON value. Move stable typed framework settings under `citizen` in committed `citizen.config.js`; move typed nonsecret application settings beside that namespace; keep deployment inputs and secrets in ignored `.env`; and limit production secret-file handling to the production branch of the shared entrypoint. Do not preserve a legacy CORS allowance by default: inventory actual cross-origin browser clients, otherwise leave CORS unset and verify fail-closed behavior.
5. Run Citizen's full suite at the exact locked commit under its minimum supported Node major and the deployed Node major. Record any upstream change separately before refreshing the application lockfile.
6. Build and inspect the images, confirm `.env`, secret values, and legacy JSON are absent from image layers, prove the fixed non-root user can read required development leaf certificates and write logs, and confirm the app-only source mount does not hide image dependencies.
7. Rehearse the source dump on the selected PostgreSQL image and locale before creating the final volume. Restore once, compare project-specific schema/data/sequence queries, and remember that later starts read the named volume rather than replaying the dump.
8. Reproduce the effective Nginx behavior, create and trust a fresh project-specific mkcert leaf certificate, move the hostname to loopback, and test HTTP redirect, trusted HTTPS, proxy metadata, static caching/compression, routes, expected cross-origin rejection or the specifically inventoried CORS policy, watchers, BrowserSync, and development email logs.
9. Add the friendly lifecycle and guarded logical backup/restore commands. Create a real backup, validate its modes/checksum, restore it into an isolated project/volume, compare the data, and delete only the labeled test resources.
10. Record development acceptance before beginning that project's production Citizen cutover. Keep production Docker as its own later phase unless the project explicitly chooses a different boundary.

### What may be copied after parameterization

- The multi-stage Node 24 Dockerfile pattern and non-root runtime model.
- The common Compose service shape, app-only development `.env` bind, production service-scoped password-secret pattern, PostgreSQL readiness gate, narrow database environment, committed/bind-mounted `citizen.config.js`, named production logs, editor-visible development logs, and app-only development source mount.
- The development certificate, start, smoke, database backup, and database restore script patterns.
- The ignored `.env`/`.env.example` model, direct HTTPS Citizen dependency, tracked lockfile, development restart rule, and production app-then-proxy recreation rule.
- The focused migration-dump, isolated-restore, checksum, and file-permission controls.

Parameterize scripts before reuse; none should retain `jaysylvester-dev`, the
`jaysylvester` database, `dev.jaysylvester.com`, this project's protected path,
or this project's table checks. Give every project unique Compose and volume
names. Because the projects may compete for development ports 80/443, either run one
site stack at a time or deliberately assign different host ports; do not build a
shared cross-project proxy as an incidental part of these migrations.

### Evidence to retain for each project

- Exact Citizen branch commit and framework test matrix.
- Source/target PostgreSQL versions and initialization metadata.
- Protected configuration/dump paths, checksums, and modes without secret values.
- Schema, row-count, maximum-ID, sequence, extension, and representative-query comparisons appropriate to that project.
- Effective Nginx behaviors carried forward and focused HTTP/browser results.
- Contact/development-log and watcher acceptance results.
- Friendly lifecycle behavior, named-volume persistence, backup checksum, and isolated restore-drill result.
- Remaining manual checks, production cutover state, VM retirement blockers, and rollback state.

## 12. References

- Citizen 2.0 branch: <https://github.com/jaysylvester/citizen/tree/2.0>.
- Citizen 1.x-to-2.x guide: <https://github.com/jaysylvester/citizen/blob/2.0/MIGRATION.md>.
- Citizen 2.0 configuration: `node_modules/citizen/README.md` at the commit resolved by this project's lockfile.
- Citizen 2.0 config loader: `node_modules/citizen/init/config.js` at that same commit.
- Official Node.js 24 distribution index: <https://nodejs.org/download/release/latest-v24.x/>.
- Docker Compose production overrides: <https://docs.docker.com/compose/how-tos/production/>.
- Docker Engine on Debian: <https://docs.docker.com/engine/install/debian/>.
- Docker Desktop on macOS: <https://docs.docker.com/desktop/setup/install/mac-install/>.
- DigitalOcean powered-off Droplet snapshots: <https://docs.digitalocean.com/products/snapshots/how-to/snapshot-droplets/>.
- DigitalOcean restore from a snapshot: <https://docs.digitalocean.com/products/snapshots/how-to/create-and-restore-droplets/>.
- mkcert: <https://github.com/FiloSottile/mkcert>.
- Certbot renewal hooks: <https://eff-certbot.readthedocs.io/en/stable/using.html>.
- PostgreSQL `pg_dump`: <https://www.postgresql.org/docs/current/app-pgdump.html>.
- PostgreSQL `pg_restore`: <https://www.postgresql.org/docs/current/app-pgrestore.html>.
- Docker volumes, including backup/restore behavior: <https://docs.docker.com/engine/storage/volumes/>.
