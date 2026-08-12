# Docker and Citizen 2.0 Migration Plan

Status: Phase 1 development Docker acceptance completed on 2026-08-09. The revised
Citizen configuration contract and fail-closed CORS default were accepted on
2026-08-10. Phase 2 completed on 2026-08-12: the existing Droplet was rebuilt with
Debian 13, the verified PostgreSQL 11 dump was restored into PostgreSQL 17, and the
Citizen 2.0 app and Nginx entered production through Docker Compose. Automated and
operator acceptance, the Node crash/restart drill, Certbot renewal dry run, and reboot
recovery all passed. Snapshot `REPLACE_ME_ROLLBACK_SNAPSHOT` and the protected exports
remain available for the rollback window. The shared development VM cannot be retired
until its other projects are migrated.

Target: migrate this application to Citizen 2.0 from its Git branch and run the same Docker Compose architecture on a macOS development workstation and a clean Debian 13 rebuild of the existing DigitalOcean production Droplet.

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
- Production on the existing DigitalOcean Droplet, rebuilt in place from Debian 10 to a clean Debian 13 image and then provisioned with Docker Engine. The rebuild retains the Droplet identity and public IP while replacing its disk.
- Citizen 2.0 on Node.js 24 LTS, with Citizen installed directly over HTTPS from `jaysylvester/citizen#2.0` and the resolved Git commit recorded in `package-lock.json`.
- Typed framework and nonsecret application configuration in committed `citizen.config.js`, secrets and deployment inputs in the ignored project-root `.env`, and no active Citizen JSON files.
- Separate development and production configuration, databases, certificates, and volumes.
- Direct migration from each environment's live PostgreSQL database.
- Development HTTPS through `mkcert`, without copying certificates from the VM.
- Production HTTPS through the existing Let's Encrypt certificate and host Certbot renewal.
- Replacement of the production host's PM2 process supervision with Docker's production restart policy and Compose/Docker status and log commands. Inventory any PM2 behavior beyond crash recovery before removing it.
- Preservation of the effective production Nginx routes and redirects.
- A clone/bootstrap README for macOS, with clearly labeled guidance for future Linux and Windows hosts.
- Friendly development lifecycle commands that distinguish stopping retained containers from destroying containers while preserving volumes.
- Editor-visible development Citizen logs and a verified, developer-invoked PostgreSQL backup/restore path whose archives live outside Docker.
- Elimination of the retired host Nginx, PostgreSQL, Node, and PM2 runtimes through the clean Debian 13 rebuild rather than an in-place package purge.

Execute the migration in two separately accepted phases. Phase 1 moves development to Docker and proves the Citizen 2.0 application there, while production continues using its existing host-installed application, Nginx, PostgreSQL, PM2, and Certbot. Phase 2 begins only after that development baseline is proven. Inventory found Debian 10 after its security-support lifetime and outside Docker Engine's supported Debian releases, so Phase 2 exports all required production state, rebuilds the same Droplet with Debian 13, and restores the accepted application through Docker Compose. Production deployment remains SSH to the same Droplet and `git pull`; DNS and the public IP do not change.

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
- A protected off-host export of the current database, legacy configuration, Nginx, Certbot, SSH-access reference, PM2 state, logs, firewall state, and package inventory before the destructive Droplet rebuild.
- Postico endpoint changes.
- Replacement of the current certificate-copy workflow with generated development certificates, with Nginx as the sole development TLS endpoint.
- Developer-invoked development PostgreSQL backup and guarded restore commands, including an isolated restore drill.

### Excluded

- Credential rotation.
- Application features, schema changes, or dependency upgrades other than Citizen 2.0 and changes strictly required by Citizen 2.0 or Node.js 24.
- Custom health routes.
- A shared proxy or port registry for other projects.
- Containerized Certbot in this migration.
- Sequential in-place Debian 10-to-11-to-12-to-13 upgrades. The approved path is a clean Debian 13 rebuild of the existing Droplet.
- Creation of a replacement Droplet or DNS/IP migration. DigitalOcean rebuilds the existing Droplet and retains its IP.
- Zero-downtime production migration; a maintenance window is acceptable.
- Scheduled backups, retention automation, remote replication, or a general disaster-recovery system. The focused development logical backup/restore commands added during acceptance are included.
- General server hardening, new monitoring or alerting, CI/CD, orchestration, horizontal scaling, or disaster-recovery projects. Reinstalling the existing DigitalOcean metrics agent after the clean rebuild is preservation, not a new monitoring project.
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

Do not install PM2 in the application image. The container runs `node app/start.js` directly, and production sets `restart: unless-stopped` so Docker restarts the container when Node exits unexpectedly and restores it after Docker starts at boot. Use Compose logs/status plus Docker restart counts and resource statistics in place of `pm2 logs`, `pm2 status`, and `pm2 monit`. This replaces PM2's supervision only; if inventory finds cluster mode, memory thresholds, scheduled restarts, alerts, or another PM2-specific policy, preserve or deliberately retire that concrete behavior separately rather than assuming the restart policy covers it.

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
command -v pm2 || true
pm2 --version
node -p "require('./node_modules/citizen/package.json').version"
systemctl list-units --type=service --all | grep -Ei 'citizen|node|pm2|jay'
systemctl list-unit-files | grep -Ei '^pm2|citizen|node|jay'
ps -eo user,pid,ppid,args | grep -E '[P]M2|[p]m2'
sudo -u REPLACE_ME_PM2_OWNER env PM2_HOME=REPLACE_ME_PM2_HOME pm2 status
sudo systemctl cat REPLACE_ME_APP_SERVICE
sudo nginx -T 2>/dev/null | grep -nE 'proxy_pass|proxy_set_header[[:space:]]+(Forwarded|X-Forwarded)'
sudo -u postgres psql -d jaysylvester -Atqc "SHOW server_encoding; SHOW lc_collate; SHOW lc_ctype; SHOW timezone;"
```

Record the exact production branch, PM2 owner and home, application name, application service/startup unit, `ExecStart`, working directory, Citizen JSON path, Nginx upstream hostname/port, PostgreSQL connection values, and existing deployment/restart commands. Inspect the applicable PM2 ecosystem/startup configuration without copying its environment into the inventory. Determine whether PM2 provides only crash recovery/status/logs or also cluster mode, multiple instances, memory limits, scheduled restarts, file watching, log rotation, alerts, or another behavior that must be mapped explicitly. Do not print the JSON, PM2 environment, or credentials into the inventory record.

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
2. Create the snapshot. The completed rollback snapshot is named `REPLACE_ME_ROLLBACK_SNAPSHOT`.
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

Phase 2 starts from the accepted development Docker application while production still runs its pre-migration Debian 10 host stack. Inventory on 2026-08-11 found Debian 10 Buster on `amd64`, Git 2.20.1, Node.js 22.11.0, Citizen 1.0.1, PostgreSQL 11.16, Certbot 0.31.0, PM2 5.3.1 supervising one unwatched fork-mode application process, and DigitalOcean's `do-agent.service` enabled and running. Debian 10 is no longer security-supported by Debian and is not a supported target for the current Docker Engine Debian repository. The approved Phase 2 path therefore exports the authoritative host state, rebuilds the same Droplet with Debian 13, and restores the accepted application, database, certificates, DigitalOcean metrics agent, and operating procedures onto the clean host.

### Operator-presence gates

Most inventory, implementation, builds, configuration review, and automated tests can proceed without continuous operator involvement once access is available. The operator must be present for these explicit gates:

1. Authenticate to the production host and provide `sudo` access when the SSH session cannot reuse credentials.
2. Confirm the powered-off DigitalOcean rollback snapshot in the control panel and provide its exact name. If production state changes after that snapshot, replace it immediately before the rebuild.
3. Supply or verify the protected production `.env` values without copying secrets into Git, chat, logs, or shell history.
4. Review the complete branch diff and approve the fast-forward merge from `maintenance/docker-migration` into `main` and the push of `main`.
5. Start the maintenance window and approve stopping PM2/the application and Nginx, taking and exporting the final PostgreSQL dump, and rebuilding the existing Droplet with Debian 13. The rebuild is destructive to the current disk but retains the Droplet and public IP.
6. Authenticate to the rebuilt host, recreate the `jay` account and `sudo` access, and verify the new SSH host key through the DigitalOcean console before replacing the old known-host entry.
7. Perform or confirm the human-facing acceptance checks: public browsing, production contact and confirmation email delivery, Postico over SSH, and the certificate details.
8. Choose rollback through the DigitalOcean control panel if acceptance fails. If acceptance succeeds, separately approve the reboot rehearsal and eventual snapshot deletion.

The operator does not need to remain present while images build, the production overlay is authored, static configuration is reviewed, or automated tests run. Stop at each gate rather than carrying approval from one gate into the next.

### Inventory the production Debian droplet

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
hostname
cat /etc/os-release
test "$(. /etc/os-release && printf '%s' "$ID")" = debian
git status --short
git symbolic-ref --short HEAD
test "$(git symbolic-ref --short HEAD)" = main
git rev-parse HEAD
node --version
node -p "require('./node_modules/citizen/package.json').version"
command -v pm2 || true
pm2 --version
/usr/sbin/nginx -v
psql --version
sudo certbot --version
sudo systemctl status nginx postgresql --no-pager
systemctl list-units --type=service --all | grep -Ei 'citizen|node|pm2|jay'
systemctl list-unit-files | grep -Ei '^pm2|citizen|node|jay'
ps -eo user,pid,ppid,args | grep -E '[P]M2|[p]m2|[n]ode|[n]pm'
sudo -u jay env PM2_HOME=/home/jay/.pm2 /usr/local/bin/pm2 status
sudo ss -lntp
df -h
sudo -u postgres psql -Atqc "SELECT version();"
sudo -u postgres psql -d jaysylvester -Atqc "SHOW server_encoding; SHOW lc_collate; SHOW lc_ctype; SHOW timezone;"
sudo -u postgres psql -d jaysylvester -Atqc "SELECT extname FROM pg_extension ORDER BY extname;"
```

Record the exact production deployment branch, current Citizen application command, PM2 application name, owner, home, startup behavior, active legacy JSON path, normal host deployment commands, and current Git/Citizen revisions. Inventory found PM2 user `jay`, home `/home/jay/.pm2`, one live fork-mode application named `start`, no watching, no cluster/memory/scheduled-restart policy, and no systemd or cron startup entry. Its saved list also contained a stale `start-dev` entry and did not match the live list; do not restore it. Confirm the legacy JSON remains available to the running pre-migration app and that the recorded DigitalOcean snapshot exists. The protected production `.env` for the target containers is prepared separately and is not activated until cutover.

Capture the complete effective Nginx configuration and certificate setup:

```sh
sudo /usr/sbin/nginx -t
sudo install -d -m 0700 REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/nginx-before-docker
sudo sh -c '/usr/sbin/nginx -T > REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/nginx-before-docker/effective.txt 2>&1'
sudo certbot certificates
sudo find /etc/letsencrypt/renewal -maxdepth 1 -type f -name '*.conf' -print
sudo grep -RE '^(authenticator|installer|webroot_path)[[:space:]]*=' /etc/letsencrypt/renewal
sudo systemctl list-timers --all | grep -Ei 'certbot|letsencrypt'
sudo certbot --version
```

The Debian 10 Certbot is version 0.31 and uses the Nginx authenticator. Do not upgrade it on the disk that will be replaced. Restore its certificate state onto Debian 13, install current Certbot there, and use the current supported reconfiguration command after container Nginx serves the webroot.

Review the development and production Nginx captures and list only application-relevant behavior to reproduce:

- Server names and canonical-host redirects.
- HTTP-to-HTTPS and legacy redirects, including status codes and query-string behavior.
- Static root, `try_files`, named locations, MIME/gzip/cache behavior, and `web/shoplc/`.
- Proxy headers and other site-specific proxy settings already active.
- TLS certificate paths and important security headers.
- ACME challenge handling.

Production is authoritative for public behavior. Record its exact static expiry and emitted cache headers explicitly, even if the result is 30 days, and do not derive them from development's `no-store` policy or the retired development VM's 30-day value. Do not copy unrelated Debian-wide Nginx defaults or module-loading files into the image.

The captured production configuration used 30-day static expiry, gzip, a 16 MB request limit, the recorded security headers, canonical redirects, seven legacy rewrites, and one `Forwarded` header. Preserve those effective behaviors. It also enabled OCSP stapling while Nginx reported that the certificate supplied no OCSP responder URL; omit that ineffective directive and its external resolver list from the container configuration rather than preserving a startup warning. Use current Nginx HTTP/2 syntax without changing the public protocol behavior.

### Implement and review the production overlay

Use the protected effective Nginx capture inside `REPLACE_ME_PROTECTED_PRODUCTION_EXPORT_DIRECTORY/REPLACE_ME_PRELIMINARY_EXPORT_DIRECTORY/`, then update the accepted `maintenance/docker-migration` branch and confirm that current `main` is still its ancestor. Continue the production implementation on the migration branch; do not introduce a second short-lived production branch. If `main` has advanced independently, reconcile it on the workstation, rerun affected development checks, and review the result before continuing:

`[WORKSTATION — macOS]`

```sh
cd /absolute/path/to/jaysylvester.com
git fetch origin main maintenance/docker-migration
git switch maintenance/docker-migration
git pull --ff-only origin maintenance/docker-migration
git merge-base --is-ancestor origin/main HEAD
git status --short
```

Implement `compose.production.yaml`, a new production Nginx configuration derived from the effective production capture—not from `docker/nginx/dev.conf`—the Certbot reload hook, the focused production smoke-test cases, and the production README sections. Confirm the production overlay injects only `NODE_ENV`, `DB_DATABASE`, and `DB_USER` into `app`, sets `DB_PASSWORD_FILE` and `MAIL_AUTH_PASS_FILE`, grants the matching secrets, and gives `db` only its explicit `POSTGRES_*` inputs plus `POSTGRES_PASSWORD_FILE`. It must not use `env_file`, mount `.env`, override the config module's container binding, or give application secrets to `assets` or `proxy`. Use the effective configuration to preserve redirects, locations, headers, static behavior including the inventoried cache policy, and ACME handling; do not copy unrelated host-wide Nginx content.

Set `restart: unless-stopped` for production `db`, `app`, and `proxy` in the production overlay. Development keeps its existing explicit lifecycle. Enabling Docker at boot is not sufficient by itself; the production containers must have restart policies so the accepted stack returns after a Droplet reboot. Do not add PM2 to the image: the direct Node process must determine container health by exiting, allowing Docker to perform the restart.

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

### Prepare the destructive rebuild

The powered-off rollback snapshot is complete and recorded as `REPLACE_ME_ROLLBACK_SNAPSHOT`. Before changing the Droplet, confirm that exact snapshot remains available. The rebuild preserves the existing Droplet and public IP but replaces the entire disk. Do not begin it until both the preliminary export and the maintenance-window database dump exist off-host and pass checksums.

#### Create and verify the protected off-host export

The preliminary export must contain the live custom-format PostgreSQL dump and list, effective `nginx -T`, `/etc/letsencrypt` plus the current ACME webroot, Certbot inventory, the legacy Citizen JSON, `jay`'s authorized keys, PM2 state and logs, Citizen logs, firewall state, APT sources, host/service inventory, and PostgreSQL encoding/locale/timezone/schema metadata. Create it with `umask 077`; use directory mode `0700` and file mode `0600`; never print the JSON, passwords, private keys, or PM2 environment.

Copy it to `REPLACE_ME_PROTECTED_PRODUCTION_EXPORT_DIRECTORY/`, verify every checksum, and prove a current PostgreSQL client can list the archive. Generate a separate mode-`0600` `production.env` from the legacy JSON without printing values. It contains only `NODE_ENV=production`, database name/user/password, mail password, `POSTGRES_IMAGE=postgres:17-bookworm`, `POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=en_US.UTF-8`, `POSTGRES_TIMEZONE=Etc/UTC`, and the loopback Postico port. It does not contain BrowserSync, Gulp, CORS, or stable typed application settings.

The 2026-08-12 preliminary export `REPLACE_ME_PRELIMINARY_EXPORT_DIRECTORY` passed all checksums and PostgreSQL archive validation. Its PostgreSQL 11 source contained 6 case studies (maximum ID and sequence 17), 59 screens (maximum ID and sequence 137), and 12 work-history rows (maximum ID and sequence 28). The disposable PostgreSQL 17 restore matched all values plus UTF-8, `en_US.UTF-8`, `Etc/UTC`, and `plpgsql`.

The maintenance-window freeze produced `REPLACE_ME_FINAL_EXPORT_DIRECTORY`. Its protected off-host copy passed every SHA-256 check, PostgreSQL 17 listed the archive successfully, and its encoding, locale, timezone, extension, row counts, maximum IDs, and sequence states matched the preliminary export. PM2, Nginx, the PostgreSQL 11 cluster, and ports 80/443/5432 were confirmed stopped afterward. An earlier attempt showed that Debian's aggregate `postgresql.service` did not stop the cluster; its rollback trap restored the public site, the attempt was marked `-failed`, and the successful retry used `postgresql@11-main` explicitly.

#### Merge the reviewed migration into `main`

After the production overlay, dummy-secret startup, disposable production restore, production Nginx/HTTPS tests, PM2-replacement crash drill, and development regression checks pass, review the complete migration diff and fast-forward `main` to `maintenance/docker-migration`:

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

The merge must fast-forward. If `main` advanced independently, reconcile it on the workstation and rerun affected checks. Keep the migration branch through final acceptance. The Debian 10 checkout must not pull the new `main`; the clean Debian 13 host clones it after rebuild.

### Production cutover and Debian 13 rebuild

Downtime is acceptable. Pause Postico and any other database changes until validation completes.

#### Freeze the old host and export the final database

`[PRODUCTION — Debian 10]`

```sh
cd /var/www/jaysylvester.com
test "$(git symbolic-ref --short HEAD)" = main
git status --short
pm2 stop start
sudo systemctl stop nginx
FINAL_DIR="REPLACE_ME_PROTECTED_FINAL_DUMP_DIRECTORY"
install -d -m 0700 "$FINAL_DIR"
sudo -u postgres pg_dump -Fc --no-owner --no-acl -d jaysylvester > "$FINAL_DIR/jaysylvester-production.dump"
chmod 0600 "$FINAL_DIR/jaysylvester-production.dump"
pg_restore --list "$FINAL_DIR/jaysylvester-production.dump" > "$FINAL_DIR/jaysylvester-production.dump.list"
chmod 0600 "$FINAL_DIR/jaysylvester-production.dump.list"
cd "$FINAL_DIR"
sha256sum jaysylvester-production.dump jaysylvester-production.dump.list > SHA256SUMS
chmod 0600 SHA256SUMS
sha256sum -c SHA256SUMS
sudo systemctl stop postgresql@11-main
sudo ss -lntp | grep -E ':(80|443|5432)[[:space:]]' || true
```

Stop the inventoried PostgreSQL 11 cluster unit explicitly. On this Debian 10 host,
stopping the aggregate `postgresql.service` leaves `postgresql@11-main` and port 5432
running.

Copy the entire final directory into the protected workstation directory, enforce 0700/0600 again, verify its checksums and archive, and repeat the source aggregate counts. If any production state changed after the recorded snapshot, power off and replace the snapshot now. Do not rebuild until the final off-host checks pass.

#### Rebuild the existing Droplet

`[DIGITALOCEAN CONTROL PANEL — OPERATOR REQUIRED]`

1. Open the existing Droplet's rebuild action and select the current Debian 13 x64 image.
2. Confirm the action targets the existing Droplet and will retain its public IP while replacing its disk.
3. Confirm the rollback snapshot and both protected exports are available.
4. Start the rebuild and wait for completion. Do not create a replacement Droplet.
5. Use the DigitalOcean console to obtain the new SSH host-key fingerprints and initial root access.

On the workstation, compare the console fingerprints before removing the exact old `jaysylvester.com` and IP entries from `known_hosts`. Do not accept a changed key based only on the SSH prompt.

#### Bootstrap Debian 13

Log in through the verified root access, create `jay`, set its password for `sudo`, install the exported `authorized_keys` with directory mode `0700` and file mode `0600`, add the account to `sudo`, and prove a second SSH session works before closing root access. Apply only reviewed SSH settings; do not restore the Debian 10 `sshd_config` wholesale.

Update Debian, install Git, Certbot, CA certificates, curl, and wget, then install Docker Engine from Docker's current official Debian repository instructions. Verify the official instructions immediately before execution.

```sh
sudo apt update
sudo apt full-upgrade
sudo apt install ca-certificates curl wget git certbot
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
sudo systemctl enable --now docker certbot.timer
sudo docker version
sudo docker compose version
sudo docker run --rm hello-world
```

The old host had DigitalOcean's `do-agent.service` enabled and running. Reinstall the current metrics agent using DigitalOcean's official instructions rather than restoring its Debian 10 files. Also install the separate Droplet agent so the normal browser console is available without the password-only Recovery Console:

```sh
wget -qO /tmp/install-droplet-agent.sh https://repos-droplet.digitalocean.com/install.sh
sudo bash /tmp/install-droplet-agent.sh
rm /tmp/install-droplet-agent.sh
curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
sudo systemctl is-enabled droplet-agent do-agent
sudo systemctl is-active droplet-agent do-agent
```

Recheck both official installation URLs immediately before running these commands. The metrics agent preserves existing Droplet metrics; it does not add a new application-health check or replace external alert configuration. The Droplet agent provides console access and is not the metrics agent.

Recreate only the required host directories and checkout:

```sh
sudo install -d -m 0755 -o jay -g jay /var/www/jaysylvester.com
git clone --branch main https://github.com/jaysylvester/jaysylvester.com.git /var/www/jaysylvester.com
sudo install -d -m 0700 -o jay -g jay REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY
sudo install -d -m 0755 /var/www/certbot/.well-known/acme-challenge
```

Restore the protected Certbot archive at `/` as root and verify `jaysylvester.com` covers both apex and `www`. Restore the protected `production.env` as `/var/www/jaysylvester.com/.env` owned by `jay`, mode `0600`; restore the final dump beneath `REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/`, mode `0600`. Do not restore host Node, PM2, Nginx, PostgreSQL, their units, the legacy JSON, old APT sources, or the old SSH daemon configuration.

Recreate only the inventoried firewall policy. The old host had no UFW or nftables rules; confirm the attached DigitalOcean firewall and the rebuilt host expose only SSH, HTTP, and HTTPS publicly. Docker publishes PostgreSQL only on `127.0.0.1`.

#### Restore and start Docker

```sh
cd /var/www/jaysylvester.com
pdc() { sudo docker compose --env-file .env -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
pdc config --quiet
if sudo docker volume inspect jaysylvester-production-postgres >/dev/null 2>&1; then
  echo 'Unexpected production PostgreSQL volume; stop and inspect it.' >&2
  exit 1
fi
pdc build --pull app proxy
pdc run --rm --no-deps --entrypoint node app --version
pdc run --rm --no-deps --entrypoint node app -p "require('./node_modules/citizen/package.json').version"
pdc run --rm --no-deps --entrypoint sh app -c "test -r /site/citizen.config.js && test -r /run/secrets/db-password && test -r /run/secrets/mail-auth-pass && ! find /site/app/config -maxdepth 1 -type f -name '*.json' -print 2>/dev/null | grep ."
pdc up -d db
pdc exec -T db pg_isready -U jaysylvester -d jaysylvester
pdc exec -T db pg_restore -U jaysylvester -d jaysylvester --exit-on-error --single-transaction --no-owner --no-privileges < REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/REPLACE_ME_FINAL_EXPORT_DIRECTORY/jaysylvester-production.dump
pdc exec -T db psql -U jaysylvester -d jaysylvester -v ON_ERROR_STOP=1 -c 'ANALYZE;'
pdc up -d app proxy
pdc ps
pdc logs --tail=200 db app proxy
```

Repeat the schema, row-count, maximum-ID, sequence, extension, locale, timezone, and representative-query comparisons. Validate routes, legacy and canonical redirects, 30-day static caching, `web/shoplc/`, static 404s, security headers, TLS, the contact and confirmation emails, fail-closed CORS, secret isolation, non-root Node, writable logs, and Postico through SSH. Run production smoke cases with:

```sh
SMOKE_PRODUCTION=true ./scripts/smoke-test https://jaysylvester.com
```

After the app remains stable for at least ten seconds, repeat the reviewed Node-child crash drill and require the Docker restart count to increase before the smoke test passes again. This proves the PM2 keepalive replacement; it does not claim alerting or hang detection.

#### Complete Certbot integration

The restored renewal configuration uses the old Nginx authenticator. With container Nginx serving `/var/www/certbot`, use the current Certbot-supported command to reconfigure the existing `jaysylvester.com` certificate for webroot; do not hand-edit the renewal file. Then install the deploy hook and test renewal:

```sh
sudo certbot reconfigure --cert-name jaysylvester.com --webroot --webroot-path /var/www/certbot
sudo install -m 0755 scripts/reload-production-proxy /etc/letsencrypt/renewal-hooks/deploy/reload-jaysylvester-proxy
sudo certbot renew --dry-run --run-deploy-hooks --no-random-sleep-on-renew
sudo systemctl list-timers --all | grep -Ei 'certbot|letsencrypt'
```

If the installed Certbot uses a different documented reconfiguration command, use that supported command and update the README. Confirm the public ACME test path before reconfiguration and remove only the test file afterward.

#### Rehearse reboot recovery

```sh
sudo reboot
```

Reconnect and prove Docker restored `db`, `app`, and `proxy` without `compose up`; repeat database readiness, smoke, certificate, email, Postico, ports, Docker service, Certbot timer, `droplet-agent.service`, and `do-agent.service` checks. Confirm host commands `node`, `npm`, `pm2`, `nginx`, `postgres`, and `psql` are absent. The clean rebuild itself removed the retired runtimes, so no production package purge or legacy-data deletion follows.

The live rehearsal booted kernel `6.12.101+deb13-amd64`; all three existing containers returned through `restart: unless-stopped`, PostgreSQL was healthy with the restored counts, and the complete public smoke test passed without running `compose up`. Docker restart counts reset when the daemon restarted, so the pre-reboot `0` to `1` Node crash-drill evidence and the independent post-reboot service-state evidence are recorded separately.

### Production rollback

This rollback applies to an unacceptable Debian 13 rebuild or Docker cutover. Because the snapshot is the authoritative whole-disk rollback, do not reconstruct the Debian 10 packages, Git revision, configuration, Certbot, PostgreSQL, or PM2 manually.

`[DIGITALOCEAN CONTROL PANEL]`

1. Open the existing Droplet and choose the restore action for `REPLACE_ME_ROLLBACK_SNAPSHOT`.
2. Confirm that the restore will overwrite the existing Droplet's disk.
3. Wait for restoration to complete, then power on that same Droplet if necessary.
4. Confirm the Droplet still has its existing public IP.
5. Obtain the restored SSH host-key fingerprints from the console, replace only the exact rebuilt-host entries in `known_hosts`, and verify SSH, the public site, HTTPS, Nginx, PostgreSQL, PM2/application startup, and Postico.

This restores the whole server to the snapshot condition, including Debian 10, Citizen 1.x, the original Node/PM2 runtime, Git checkout, JSON configuration, Nginx, PostgreSQL data, Certbot configuration, and removal of the Debian 13/Docker disk state. Do not create a replacement Droplet. If the snapshot was refreshed immediately before rebuild as required after any state change, its database is authoritative; otherwise use the separately verified final dump only through a separately reviewed recovery procedure.

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
SMOKE_PRODUCTION=true ./scripts/smoke-test https://jaysylvester.com
```

This ordered app-then-proxy recreation prevents Nginx from retaining the deleted app container's IP. `--no-deps` ensures routine deployments do not recreate PostgreSQL.

Use these Docker equivalents for the former PM2 operational views:

```sh
pdc ps app
pdc logs --tail=100 --follow app
sudo docker inspect --format '{{.RestartCount}}' "$(pdc ps -q app)"
sudo docker stats --no-stream "$(pdc ps -q app)"
```

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

### Post-rebuild retention and cleanup

The clean Debian 13 rebuild removes the retired host Node, PM2, Nginx, PostgreSQL, their data directories, startup state, and obsolete APT sources as part of replacing the disk. Do not add purge or broad filesystem-removal commands to the rebuilt host.

Preserve:

- `/var/lib/docker` and the production PostgreSQL and Citizen-log volumes.
- `/etc/letsencrypt`, `/var/www/certbot`, Certbot, its timer, and the container reload hook.
- DigitalOcean's installed `droplet-agent.service` and `do-agent.service`, and their enabled/running states.
- `/var/www/jaysylvester.com`, its mode-`0600` `.env`, and the tracked Citizen lockfile and migration record.
- The final verified production dump on the rebuilt host and workstation through the acceptance and rollback window.
- The protected preliminary export on the workstation until the same window ends.

After the reboot rehearsal and final acceptance, remove the temporary export directory and script from the old disk only implicitly through the rebuild; do not copy PM2 state, old logs, legacy JSON, or Debian 10 host configuration onto the new host. Remove any temporary bootstrap copies from the rebuilt host after their installed destinations and checksums are verified.

Keep the powered-off pre-rebuild snapshot for the chosen rollback window. Deleting it ends whole-server rollback and stops its storage charge; that is a separate operator decision after production has remained accepted.

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
- Docker's `restart: unless-stopped` supervision in place of PM2, including Compose/Docker commands for status, logs, restart count, and one-shot resource statistics. Record any intentionally retained PM2-specific behavior; do not imply that a restart policy supplies alerting or hang detection.
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
- Production remains on its pre-migration host application, PM2, Nginx, PostgreSQL, and Certbot until Phase 2; its original JSON is preserved in the DigitalOcean rollback snapshot and protected off-host export.
- The container-oriented Citizen revision is not deployed to the host process. It reaches production only in the reviewed Docker cutover.
- The development VM is deleted only after its remaining workloads and backups are accounted for.

### Phase 2 is complete when

- The existing Droplet runs a clean supported Debian 13 image with its original public IP; production runs the app, Nginx, and PostgreSQL through Docker Compose using the Citizen 2.0 application revision accepted in development plus the reviewed production overlay.
- The app image runs Node directly without PM2; `restart: unless-stopped` is active, the focused Node crash drill increments the Docker restart count and restores the public app, and the reboot rehearsal restores all three production services without a manual `compose up`. Any PM2 behavior beyond supervision was inventoried and either preserved explicitly or intentionally retired.
- Production injects only the explicit nonsecret application environment, supplies database and mail passwords through service-scoped Compose secret files, and exposes neither password through app/database container environments, rendered configuration, logs, `assets`, or `proxy`.
- A focused dummy-secret production-target startup was accepted before deployment, and the live production startup uses the same direct password-file reads.
- The production JSON converted during Phase 2 is absent from the Debian 13 checkout and Citizen 2.0 container, with the original retained only in the protected export and rollback snapshot and no credential rotation.
- The final maintenance-window database dump was copied off-host and verified before rebuild; the production Docker database was restored from it with UTF-8, `en_US.UTF-8`, UTC, schema, row counts, maximum IDs, sequence states, extensions, and representative queries matching.
- Existing public routes, static content, `web/shoplc/`, redirects, 404 behavior, email, proxy headers, and HTTPS work as before; CORS remains unset and fail-closed unless a real production cross-origin consumer was inventoried during Phase 2.
- Production Let's Encrypt renewal succeeds and reloads container Nginx.
- DigitalOcean's console and metrics agents are installed from their current official sources and remain enabled and active after reboot.
- Production PostgreSQL is reachable by Postico only through the existing SSH tunnel and survives container recreation.
- Routine production app deployment recreates proxy afterward and does not recreate the database.
- The powered-off pre-migration DigitalOcean snapshot remains available through the rollback window and restores the existing Droplet in place.
- The README documents the Debian 13 rebuild, final production deployment, Docker equivalents for PM2 operations, Postico, Certbot, retention, and rollback procedures.
- Host Node, PM2, Nginx, and PostgreSQL are absent because the old disk was replaced; no legacy runtime purge is performed on the clean host.

## 10. Scope-Control Rationale for Reviewers

This plan was deliberately reduced after earlier reviews expanded it beyond the migration's needs. Its approved purpose now has two connected parts: migrate this application to the direct Citizen 2.0 branch as the first real-project validation, and move the application plus its two databases into Docker. It must preserve behavior, remove the custom development VM, reproduce production, maintain HTTPS, capture reusable Citizen migration evidence, and retire the replaced production services. It is not a general infrastructure-modernization program.

The two-phase boundary is deliberate. Phase 1 proves the shared application baseline in development Docker while the existing production host remains untouched. Because the accepted config module uses a container-only HTTP binding and mounted project environment, the production application and infrastructure adopt that revision together in Phase 2. Do not add an interim hostname variable or a second host-compatible configuration path merely to preserve the canceled application-only cutover.

Phase 2 contains the infrastructure complications the user explicitly chose to defer: the protected production export, clean Debian 13 rebuild of the same Droplet, Docker Engine installation, production Compose/Nginx overlay, Citizen/config deployment, live database dump and restore, Certbot restoration and integration, SSH bootstrap, and reboot validation. Reviewers must not pull those tasks into Phase 1.

Production rollback remains one operation: restore the powered-off DigitalOcean snapshot onto the existing Droplet. The protected preliminary export and final database dump are required inputs to the destructive clean rebuild, not an alternate hand-built rollback system. Do not reconstruct Debian 10 piecemeal from them. If production state changes after the snapshot, replace the snapshot immediately before rebuild so whole-disk rollback remains authoritative.

The following requested outcomes are not scope creep and must remain:

- Both macOS development and Debian production are containerized.
- This project migrates to Citizen 2.0 and deploys on Node.js 24 using the direct branch, tests Citizen's minimum Node.js 22 support as well, and records findings for later Citizen projects.
- Both live databases are migrated directly.
- Citizen 1.x JSON is fully classified without silent loss: stable typed framework and nonsecret application settings move to `citizen.config.js`, deployment inputs and secrets move to `.env`, legacy JSON is rejected by the new containers, and the original remains in the rollback snapshot.
- Existing Nginx redirects and site behavior are inventoried before replacement.
- Development `mkcert` and production Let's Encrypt continue to provide HTTPS.
- The README supports the tested macOS path and identifies future Linux/Windows differences.
- Retired Nginx, PostgreSQL, Node, and PM2 packages/data disappear with the replaced Debian 10 disk and are not restored onto Debian 13.
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
- Debian release lifecycle: <https://www.debian.org/releases/>.
- Docker Desktop on macOS: <https://docs.docker.com/desktop/setup/install/mac-install/>.
- DigitalOcean powered-off Droplet snapshots: <https://docs.digitalocean.com/products/snapshots/how-to/snapshot-droplets/>.
- DigitalOcean same-Droplet rebuilds: <https://docs.digitalocean.com/products/droplets/how-to/rebuild/>.
- DigitalOcean restore from a snapshot: <https://docs.digitalocean.com/products/snapshots/how-to/create-and-restore-droplets/>.
- DigitalOcean metrics agent installation: <https://docs.digitalocean.com/products/monitoring/how-to/install-metrics-agent/>.
- DigitalOcean Droplet agent installation: <https://docs.digitalocean.com/products/droplets/how-to/manage-agent/>.
- mkcert: <https://github.com/FiloSottile/mkcert>.
- Certbot renewal hooks: <https://eff-certbot.readthedocs.io/en/stable/using.html>.
- PostgreSQL `pg_dump`: <https://www.postgresql.org/docs/current/app-pgdump.html>.
- PostgreSQL `pg_restore`: <https://www.postgresql.org/docs/current/app-pgrestore.html>.
- Docker volumes, including backup/restore behavior: <https://docs.docker.com/engine/storage/volumes/>.
