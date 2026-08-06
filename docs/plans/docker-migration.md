# Docker and Citizen 2.0 Migration Plan

Status: Draft

Target: migrate this application to Citizen 2.0 from its Git branch and run the same Docker Compose architecture on a macOS development workstation and the Debian DigitalOcean production droplet.

## 1. Outcome

Upgrade the application from Citizen 1.x to Citizen 2.0, then replace the project's local VM and the production host-installed Node, PostgreSQL, and Nginx runtimes with Docker Compose. This project is the first end-to-end consumer of Citizen 2.0's environment configuration and will produce a focused migration record for later Citizen projects.

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

- Local development on macOS with Docker Desktop and no project-specific VM.
- Production on the existing Debian DigitalOcean droplet with Docker Engine.
- Citizen 2.0 on Node.js 24 LTS, with Citizen installed directly over HTTPS from `jaysylvester/citizen#2.0-env-file-config-revised` and the resolved Git commit recorded in `package-lock.json`.
- Environment-based framework and application configuration with no active Citizen JSON files.
- Separate local and production configuration, databases, certificates, and volumes.
- Direct migration from each environment's live PostgreSQL database.
- Local HTTPS through `mkcert`, without copying certificates from the VM.
- Production HTTPS through the existing Let's Encrypt certificate and host Certbot renewal.
- Preservation of the effective production Nginx routes and redirects.
- A clone/bootstrap README for macOS, with clearly labeled guidance for future Linux and Windows hosts.
- Removal of the retired host Nginx, PostgreSQL, and Node runtimes after production acceptance.

Execute the migration in two separately accepted phases. Phase 1 moves local development to Docker and upgrades the application to Citizen 2.0 in both environments, while production continues using its host-installed Nginx, PostgreSQL, and Certbot. Phase 2 begins only after that application baseline is proven and moves the Debian production infrastructure to Docker. Production deployment remains SSH to the droplet and `git pull` in both phases; only the post-pull runtime commands change when production adopts Compose. DNS and the DigitalOcean server do not change.

## 2. Scope Boundaries

### Included

- Dockerfiles, Compose files, Nginx configuration, and minimal helper scripts needed to run this project.
- Migration of this application from Citizen 1.x to the direct Citizen 2.0 branch, including a Node.js 24 LTS runtime and the required application code changes.
- Execution of Citizen's own test suite at the exact branch commit consumed by this project.
- A concise, reusable Citizen 2.0 migration record containing mappings, problems found, upstream fixes, and verification results for later projects.
- A development override and a production override.
- Migration of the existing local and production databases with `pg_dump` and `pg_restore`.
- Classification and conversion of each environment's existing ignored Citizen JSON, followed by recoverable archival outside the active Citizen 2.0 application.
- Local and production cutover, validation, rollback, and one-time cleanup commands.
- Postico endpoint changes.
- Replacement of the current BrowserSync certificate-copy workflow with generated local certificates.

### Excluded

- Credential rotation.
- Application features, schema changes, or dependency upgrades other than Citizen 2.0 and changes strictly required by Citizen 2.0 or Node.js 24.
- Custom health routes.
- A shared proxy or port registry for other projects.
- Containerized Certbot in this migration.
- Zero-downtime production migration; a maintenance window is acceptable.
- A new recurring database-maintenance system. Only migration backups and Postico connection changes are documented here.
- General server hardening, monitoring, CI/CD, orchestration, horizontal scaling, or disaster-recovery projects.
- A generalized Citizen codemod or migration service. This project records evidence for that later work but does not build tooling for every Citizen application.

Do not introduce a behavior change merely because it would be a useful improvement. Record it as a follow-up unless Docker cannot work correctly without it.

## 3. Citizen 2.0 and Configuration Constraints

Use the `2.0-env-file-config-revised` branch directly until a later decision switches this project to a registry release. At each dependency refresh, record the branch commit and require Citizen's native test suite to pass under both Node.js 22 (Citizen's declared minimum major) and Node.js 24 (this application's deployed LTS major) before updating this project's lockfile.

The implementation must follow Citizen 2.0's actual configuration behavior:

- Citizen resolves configuration when `citizen` is imported, before `app.start()`.
- Citizen optionally loads exactly the project-root `.env`, found as the parent of the configured application directory; values already present in `process.env` take precedence.
- Each checkout has its own ignored project-root `.env`: local values on the Mac and production values on the Droplet. During Phase 1, host production lets Citizen load that file natively. Docker Compose uses the same file for interpolation and injects it into `app` through `env_file`; it does not copy or bind-mount the secret file into the image or container filesystem.
- Only `CITIZEN_*` variables are validated, coerced, and copied into the flat framework configuration under `app.config`.
- Application-owned database and mail variables remain strings in `process.env`. Read them directly at the existing consumers, coerce numeric values where the PostgreSQL or other APIs require numbers, and do not log secrets. The global CORS policy is framework-owned and supplied as a JSON object through `CITIZEN_CORS`.
- `app.start()` accepts no arguments.
- Any `app/config/*.json` file causes Citizen 2.0 startup to fail. Legacy JSON files remain protected migration inputs or rollback artifacts only and must be excluded from the image and all active Citizen 2.0 mounts.
- `CITIZEN_DIRECTORIES__APP` is process-only. This layout does not need to override it because the image preserves Citizen's expected sibling layout:

```text
/site/app
/site/web
/site/logs
/site/node_modules/citizen
```

- `app/start.js` and `app/start-dev.js` read `web/min/site.css` and `web/min/site.js` during startup. Both files must exist in the app image, and their paths must change from `app.config.citizen.directories.app` to `app.config.directories.app`.
- Production Citizen logging needs a writable persistent `/site/logs` mount.
- Local development uses `app/start-dev.js` and explicitly sets `CITIZEN_MODE=development`; production uses `app/start.js` and `CITIZEN_MODE=production`.
- File watching through Docker Desktop must use polling for both Citizen and Gulp.
- The Citizen branch state reviewed on 2026-08-05 supports scoped Chokidar polling through `CITIZEN_DEVELOPMENT__WATCHER__USE_POLLING` and `CITIZEN_DEVELOPMENT__WATCHER__INTERVAL`. Use those framework settings locally instead of Chokidar's process-global `CHOKIDAR_*` overrides. Do not set them in production, where no source tree is bind-mounted or watched for hot module replacement.
- The existing `/` route is sufficient for a container health probe. Do not add an application route for health checks.
- Citizen 2.0 reads the standardized `Forwarded` header and also falls back to the existing `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto` headers. Verify correct HTTPS/host/client metadata during the Phase 1 host cutover; prefer the documented standardized header in new container Nginx without treating it as a prerequisite for host production when the existing headers pass.

### Docker environment design

Use one ignored project-root `.env` in each deployment checkout. The local and production files share a name but live on different hosts and contain their own values:

- `CITIZEN_*` framework settings.
- Application-owned `DB_*` and `MAIL_*` settings, plus the framework-owned `CITIZEN_CORS` JSON policy.
- `POSTGRES_INITDB_ARGS` and `POSTGRES_TIMEZONE` for first-time database initialization with source-compatible locale and time behavior.

Pass the file in two distinct ways when using Docker:

1. `docker compose --env-file .env ...` supplies Compose interpolation.
2. The `app` service's `env_file: .env` injects the same file into `process.env`.

The `db` service must not receive the entire file. Map only `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, and `POSTGRES_INITDB_ARGS` into its corresponding `POSTGRES_*` environment values, plus the non-secret `POSTGRES_TIMEZONE` into `TZ`, through Compose interpolation.

Keep host-safe production endpoints in the Droplet's `.env` during Phase 1: the existing loopback Citizen binding and `DB_HOST=127.0.0.1` (or the inventoried equivalent). In Phase 2, `compose.production.yaml` overrides only the container-network values for `app`, such as `CITIZEN_HTTP__HOSTNAME=""` and `DB_HOST=db`. The protected credentials and all other application settings remain unchanged, so the same file supports host production before cutover and Compose afterward.

Run the image directly as a fixed non-root user such as UID/GID `10001:10001`; no privileged configuration-copy entrypoint is needed. Keep `init: true` and direct exec-form Node commands.

Citizen's startup log must show the expected mode and applied `CITIZEN_*` environment with no unknown-variable warning. Existing database and mail behavior must work with the direct `process.env` reads; missing required values should produce a clear error at their initialization or use site without dumping the environment. Citizen must apply the validated global `CITIZEN_CORS` policy.

Editing either environment file requires recreating `app` so Compose injects the new process environment. Recreate `proxy` afterward because it can retain the old app container's IP.

## 4. Repository Artifacts

Implement and commit these Phase 1 artifacts on `docker-citizen2-migration`:

- `Dockerfile` with Node.js 24 development and production targets.
- `.dockerignore`.
- `.gitignore` updated to track `package-lock.json` and ignore the project-root `.env` and generated local certificates.
- `compose.yaml` for common `db`, `app`, and `proxy` services.
- `compose.local.yaml` for macOS development.
- `docker/nginx/Dockerfile` and local Nginx configuration.
- Project-root `.env.example`, sanitized and containing Citizen, application, and Docker/PostgreSQL initialization placeholders.
- `scripts/local-cert` to create/check the local `mkcert` certificate.
- `scripts/local-up` to run the certificate check and start local Compose.
- `scripts/smoke-test` for the small set of existing local routes and CORS/preflight cases.
- `package.json` updated for Node.js 24 and the direct Citizen branch dependency.
- A tracked `package-lock.json`, with its existing `.gitignore` entry removed, resolving the reviewed Citizen branch commit so container installs can use `npm ci`.
- `docs/migrations/citizen-2.md` recording the source-to-target config mapping, exact Citizen commit, test results, issues found, upstream fixes, and reusable lessons.
- A real project `README.md` containing the tested macOS development instructions required by section 8.

Add and commit these production-specific artifacts on a new production-Docker branch during Phase 2, after inventorying the effective production configuration:

- `compose.production.yaml` for Debian production.
- The production Nginx configuration, preserving the inventoried redirects and other application-relevant behavior.
- Production cases in `scripts/smoke-test` that exercise the inventoried public behavior.
- `scripts/reload-production-proxy` as the Certbot deploy hook.
- The production deployment, Postico, Certbot, and retired-runtime notes required in the README.

Do not add HTTP-manifest, `/proc` inspection, database-comparison, or disposable-restore scripts unless implementation reveals a concrete problem that cannot be handled by the commands in this plan.

Keep ignored and untracked:

- Project-root `.env` in every checkout.
- `docker/local-certs/*`.
- Database dumps, logs, and Let's Encrypt material.

Use distinct Compose project names and database volumes:

| Environment | Compose project | PostgreSQL volume |
| --- | --- | --- |
| Local | `jaysylvester-local` | `jaysylvester-local-postgres` |
| Production | `jaysylvester-production` | `jaysylvester-production-postgres` |

Both environment overrides may publish PostgreSQL as `127.0.0.1:5432:5432` for Postico. Never publish it on `0.0.0.0`.

If another local project already owns ports 80, 443, or 5432, stop that project while working on this one or assign this project a different loopback-only database port. Designing shared workstation infrastructure is outside this plan.

## 5. Compose and Image Design

### Database

- Use a supported PostgreSQL target major proven by a test restore before either final volume is created.
- If the source major is still supported, prefer it to avoid combining migration with an upgrade.
- If the source major is unsupported, the cross-major logical restore is a required compatibility step, not permission to alter schema, data, encoding, or locale unnecessarily.
- Store data in the named volume.
- Use `pg_isready` for health.
- Initialize the database name, role, and reused password from the ignored environment file only when the volume is empty.
- PostgreSQL fixes encoding, `lc_collate`, `lc_ctype`, and its default server timezone when `initdb` first creates the volume. Before the first `db` start, put the inventoried locale values into each environment's `POSTGRES_INITDB_ARGS` and its timezone into `POSTGRES_TIMEZONE`, confirm the target image provides both, and test them with the selected PostgreSQL image. If a source locale or timezone is unavailable, choose and rehearse the compatible target before creating either final volume; discovering this during cutover is too late.
- Do not use `resources/data.sql`; it is an untrusted historical initialization file.

### Application

- Build Node.js 24 development and production targets from the same Dockerfile and lockfile.
- Install Citizen from `git+https://github.com/jaysylvester/citizen.git#2.0-env-file-config-revised`; the lockfile's resolved commit is the reproducible build input.
- The dependency-install build stage needs Git and CA certificates to resolve the direct HTTPS dependency. Do not carry Git into the final runtime image solely for this purpose.
- Run `node app/start-dev.js` locally and `node app/start.js` in production.
- Convert framework settings to `CITIZEN_*` names and application settings to explicit `DB_*`/`MAIL_*` variables without changing their values.
- Remove all arguments from both `app.start()` calls.
- Replace `app.config.citizen.*` and view `config.citizen.*` references with Citizen 2.0's flat framework paths.
- Replace `app.config.db` and `app.config.mail` consumers with direct `process.env` reads at their existing use sites, coercing numeric database options with `Number(...)`.
- Preserve the old global CORS behavior through Citizen 2.0's `CITIZEN_CORS` JSON object. Use controller/action overrides only for a reviewed route-specific difference.
- Do not arbitrarily change pool sizes, mail settings, CORS behavior, or other application behavior.
- Connect to PostgreSQL at `db:5432`.
- Expose port 8080 only on the Compose network.
- Use the existing `/` route for a lightweight Node-based health check; also retain the independent database health check.
- Mount writable persistent logs.
- In the local override, bind-mount only `app/controllers`, `app/models`, `app/views`, `app/toolbox`, and `web/` into `app`. Never mount the repository root or the whole `app/` directory over `/site`: the root would mask Linux `node_modules`, and the whole app mount could expose a legacy JSON file that Citizen 2.0 deliberately rejects.

### Nginx

- Use one proxy image with environment-specific server configuration.
- Serve static files and send dynamic requests to `http://app:8080`.
- Copy production static files into the image; bind-mount `web/` read-only locally.
- Preserve the reviewed current redirects, static routing, TLS behavior, headers, error handling, and `web/shoplc/` content.
- Do not add proxy headers, caching changes, or other Nginx behavior unless required for container networking or explicitly found in the effective source configuration.
- Set a correct standardized `Forwarded` header in the new proxy configuration while preserving any inventoried `X-Forwarded-*` behavior relied on by the application.
- Serve `/.well-known/acme-challenge/` from `/var/www/certbot` in production and redirect other HTTP traffic to HTTPS.

Nginx resolves the literal `app` hostname when its workers start and can retain the old container IP after `app` is recreated. Therefore every production workflow that recreates `app` must recreate `proxy` afterward. `depends_on` does not handle later app recreation.

### Local asset development

The local override should include an `assets` service using the development image so macOS does not need a host Node installation. It runs the existing Gulp watcher with bind mounts for the editable app directories and `web/`.

Do not attach the application's full `.env` to `assets`; it does not need database or mail credentials. Map only the BrowserSync certificate/host settings and watcher values it consumes.

Update Gulp only as needed to:

- Read BrowserSync key/certificate paths supplied by the local container.
- Use the generated `mkcert` certificate.
- Enable polling for every watcher so Docker Desktop file changes are detected.
- Keep BrowserSync ports 3000 and 8282 loopback-only.

Do not rebuild and commit new front-end output merely to establish a Docker-era baseline. Existing tracked bundles remain authoritative unless the required Gulp changes actually alter them and that difference is reviewed separately.

## 6. Phase 1 — Citizen 2.0 and Local Docker Deployment

Phase 1 ends with the application running locally through Docker Desktop, the local database restored into Docker PostgreSQL, local HTTPS and file watching accepted, and the custom local VM retired when its other workloads permit. It also performs a one-time production application cutover to Node.js 24 LTS, Citizen 2.0, and environment configuration while leaving production Nginx, PostgreSQL, Certbot, ports, and database data on the Debian host.

### Coordinate the shared application migration

Create the Docker and Citizen 2.0 work on a dedicated migration branch while it is under development:

`[WORKSTATION — macOS]`

```sh
cd /absolute/path/to/jaysylvester.com
git status --short
git switch -c docker-citizen2-migration
git push -u origin docker-citizen2-migration
```

If the migration branch already exists, switch to it instead of creating it. Apply any intervening production hotfix to the production branch first, then merge that commit into the migration branch and repeat the affected local checks.

Do not merge the migration branch until local Citizen 2.0/Docker acceptance passes and the production host has been prepared for the same Citizen 2.0 application. The merge and the one-time production application cutover are the final steps of Phase 1. After that cutover, ordinary application commits developed locally can be pulled into production without waiting for production Docker.

### Inventory the local VM

Save inventory output outside Git. Do not print secret JSON contents into the record.

`[LOCAL VM]`

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
sudo nginx -T > /tmp/jaysylvester-local-nginx.txt 2>&1
sudo chown "$(id -un):$(id -gn)" /tmp/jaysylvester-local-nginx.txt
```

Before the VM is eventually deleted, confirm that no other project, database, cron job, shared directory, or service still relies on it. This is a deletion gate, not a request to design the migrations for those other projects here.

### Inventory the production application runtime

Phase 1 changes only the production application runtime. Record its current state without changing Nginx, PostgreSQL, Certbot, or the database:

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

### Migrate Citizen and implement Docker locally

#### Pin and test the Citizen branch

Use an existing Citizen checkout or clone the direct branch next to this project:

`[WORKSTATION — macOS]`

```sh
CITIZEN_REPO=/absolute/path/to/citizen
if test -d "$CITIZEN_REPO/.git"; then
  git -C "$CITIZEN_REPO" status --short
  git -C "$CITIZEN_REPO" fetch origin 2.0-env-file-config-revised
  git -C "$CITIZEN_REPO" switch 2.0-env-file-config-revised
  git -C "$CITIZEN_REPO" pull --ff-only
else
  git clone --branch 2.0-env-file-config-revised https://github.com/jaysylvester/citizen.git "$CITIZEN_REPO"
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

Before updating this project's dependency, confirm the checked-out branch includes and passes the upstream tests proving that these values reach `app.config.development.watcher` with Boolean and numeric types:

```dotenv
CITIZEN_DEVELOPMENT__WATCHER__USE_POLLING=true
CITIZEN_DEVELOPMENT__WATCHER__INTERVAL=500
```

Also confirm the suite proves that Citizen loads only the project-root `.env`, ignores an `app/.env`, preserves process-environment precedence, and exposes non-`CITIZEN_*` application variables only through `process.env`.

Rerun Citizen's entire suite and record the tested commit in `docs/migrations/citizen-2.md`. The implementation deliberately keeps `usePolling` absent from runtime defaults so Chokidar retains its platform behavior unless the variable is explicitly set. If later application testing exposes a Citizen defect, follow an upstream-test-first flow and refresh this project's lockfile afterward. Do not patch framework code inside this application's image.

#### Update the dependency and migrate application code

The root lockfile is currently ignored. Preserve it, remove only the `package-lock.json` entry from `.gitignore`, and intentionally update the Citizen dependency under the deployed Node.js 24 runtime:

```sh
cd /absolute/path/to/jaysylvester.com
git check-ignore -v package-lock.json
${EDITOR:-vi} .gitignore
docker run --rm -v "$PWD:/site" -w /site node:24-bookworm \
  npm install --package-lock-only --save-exact 'citizen@git+https://github.com/jaysylvester/citizen.git#2.0-env-file-config-revised'
git add .gitignore package.json package-lock.json
git diff --cached --check
git status --short
```

The branch name remains in `package.json`; `package-lock.json` records the exact Git commit consumed by reproducible `npm ci` builds. Record and compare that commit with the tested Citizen checkout before proceeding. This Citizen/lockfile update is intentional; do not update other dependency ranges unless Node.js 24 or Citizen 2.0 demonstrably requires it.

Implement these application changes as a dedicated reviewable commit before the database migration:

- Change this application's `engines.node` to `>=22.0.0`, matching Citizen's minimum. Test that minimum explicitly, while deploying this application on Node.js 24 LTS.
- In `app/start.js` and `app/start-dev.js`, build each existing PostgreSQL `Pool` configuration directly from `process.env.DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_MAX`, and `DB_CONNECTION_TIMEOUT_MILLIS`. Wrap the port, pool maximum, and timeout in `Number(...)` at construction.
- In `app/start.js`, build the existing Nodemailer transport directly from `process.env.MAIL_SERVICE`, `MAIL_AUTH_USER`, and `MAIL_AUTH_PASS`.
- In the contact controller, replace the existing `app.config.mail` address reads with direct `process.env.MAIL_NAME`, `MAIL_ADDRESS`, and `MAIL_ADDRESS_NO_REPLY` reads.
- Translate the legacy `citizen.cors` object directly to the `CITIZEN_CORS` JSON value; do not duplicate the global policy in controller/action configuration.
- Change `app.config.citizen.directories.app` to `app.config.directories.app` in both start files.
- Change `app.config.citizen.mode` and view `config.citizen.mode` to `app.config.mode` and `config.mode`.
- Replace every `app.config.db` and `app.config.mail` read with the direct `process.env` access described above.
- Remove the arguments from both `app.start()` calls.
- Preserve the legacy global CORS policy through `CITIZEN_CORS`; retain controller/action CORS configuration only where it represented a route-specific override.

Run searches after the edit; each must return no active legacy use:

```sh
grep -RInE 'app\.config\.citizen|config\.citizen|app\.config\.(db|mail)' app --exclude='*.map' || true
grep -RInE 'app\.start\([[:space:]]*\{' app || true
```

Exercise current routes, the contact form, CORS behavior, development logging, and cache-buster paths under Citizen 2.0 before attributing any failure to Docker.

#### Convert local configuration

Copy the authoritative local JSON from the VM to protected storage outside Git, then translate it without printing its values:

`[LOCAL DOCKER HOST — macOS]`

```sh
cd /absolute/path/to/jaysylvester.com
LOCAL_CONFIG_ARCHIVE=/absolute/private/path/citizen1-local.json
umask 077
scp REPLACE_ME_VM_SSH_ALIAS:/var/www/jaysylvester.com/app/config/REPLACE_ME_CURRENT_CONFIG.json "$LOCAL_CONFIG_ARCHIVE"
cp .env.example .env
chmod 600 .env "$LOCAL_CONFIG_ARCHIVE"
${EDITOR:-vi} .env
```

Use this mapping, preserving the source values unless the Docker target requires the stated change:

| Citizen 1.x source | Citizen 2.0 target |
| --- | --- |
| `host` | Remove; deployment selection now comes from Compose |
| `citizen.http.hostname` | `CITIZEN_HTTP__HOSTNAME=""` |
| `citizen.http.port` | `CITIZEN_HTTP__PORT=8080` |
| `citizen.layout.controller` | `CITIZEN_LAYOUT__CONTROLLER` |
| `citizen.templateEngine` | `CITIZEN_TEMPLATE_ENGINE` |
| startup mode | `CITIZEN_MODE=development` |
| Docker Desktop watcher requirement | `CITIZEN_DEVELOPMENT__WATCHER__USE_POLLING=true` and `CITIZEN_DEVELOPMENT__WATCHER__INTERVAL=500` |
| `db.*` | Corresponding `DB_*` variables read directly by the pool constructors; add `DB_HOST=db` |
| `mail.*` | Corresponding `MAIL_*` variables read directly by the transport/contact consumers |
| `citizen.cors` | `CITIZEN_CORS` JSON object, used as the framework's global baseline |

Also set `POSTGRES_INITDB_ARGS` from the local VM's inventoried encoding, `lc_collate`, and `lc_ctype`, and set `POSTGRES_TIMEZONE` from `SHOW timezone`; verify those values exist in the selected PostgreSQL image before `dc up -d db` creates the local volume.

Keep the existing credentials. Do not rotate or normalize values during conversion. The sanitized project-root `.env.example` must document every required variable and the PostgreSQL initialization argument shape without containing real values.

After the local environment has been verified, archive any workstation `app/config/*.json` outside the active checkout and remove it from `app/config`. Citizen 2.0 deliberately refuses to start when one is present:

```sh
find app/config -maxdepth 1 -type f -name '*.json' -print 2>/dev/null
git check-ignore -v .env docker/local-certs/dev-key.pem
git status --short
```

The `find` command must produce no files before testing a whole application directory outside Docker. Docker builds and local app mounts must exclude legacy JSON regardless.

#### Build and validate the artifacts

Implement the Phase 1 artifacts listed in section 4, then run:

```sh
docker compose --env-file .env -p jaysylvester-local -f compose.yaml -f compose.local.yaml config --quiet
docker compose --env-file .env -p jaysylvester-local -f compose.yaml -f compose.local.yaml build --pull app proxy assets
```

Confirm from the rendered Compose configuration and images that:

- Only proxy ports 80/443 and loopback Postico/BrowserSync ports are published.
- `app` receives `.env` through `env_file`, while `db` receives only its mapped `POSTGRES_*` values.
- No environment file, legacy JSON, private key, dump, or host `node_modules` is in an image layer.
- The app image contains Node.js 24, Citizen 2.0 at the recorded Git commit, `web/min/site.css`, `web/min/site.js`, and Linux `node_modules`.
- No `app/config/*.json` exists in the app image.
- The application runs non-root, constructs database/mail settings from direct `process.env` reads without logging secrets, receives the global CORS policy through `CITIZEN_CORS`, and can write `/site/logs`.
- Citizen reports the expected mode and applied `CITIZEN_*` variables.
- Container Nginx passes `nginx -t`, supplies `Forwarded`, and contains the reviewed redirects and locations.

Update `docs/migrations/citizen-2.md` with the application diff categories, test results, any upstream Citizen commits, and lessons that apply to the next project. Do not include environment values or secrets.

#### Configure local HTTPS

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

Update macOS `/etc/hosts` so local development resolves to the workstation rather than the retired VM:

```text
127.0.0.1 dev.jaysylvester.com
```

```sh
sudoedit /etc/hosts
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
dscacheutil -q host -a name dev.jaysylvester.com
```

`scripts/local-cert` must generate ignored `docker/local-certs/dev-cert.pem` and `dev-key.pem` for `dev.jaysylvester.com`, `localhost`, `127.0.0.1`, and `::1`. It should reuse a valid certificate and regenerate an expired or missing one. Never copy or mount mkcert's CA private key.

Run:

```sh
./scripts/local-cert
openssl x509 -in docker/local-certs/dev-cert.pem -noout -checkhost dev.jaysylvester.com
```

The local Nginx and BrowserSync services mount the generated leaf certificate. Remove `_dev-certs` only after both work with the generated certificate.

### Migrate local development

#### Dump the authoritative VM database

`[LOCAL VM]`

```sh
MIGRATION_DIR=REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/docker-migration-local
sudo install -d -m 0700 -o "$(id -un)" -g "$(id -gn)" "$MIGRATION_DIR"
sudo -u postgres pg_dump -Fc --no-owner --no-acl -d jaysylvester > "$MIGRATION_DIR/jaysylvester.dump"
cd "$MIGRATION_DIR"
sha256sum jaysylvester.dump > jaysylvester.dump.sha256
sha256sum -c jaysylvester.dump.sha256
pg_restore --list jaysylvester.dump >/dev/null
```

Transfer the dump outside the Git checkout:

`[LOCAL DOCKER HOST — macOS]`

```sh
mkdir -p /absolute/private/path/docker-migration-local
chmod 700 /absolute/private/path/docker-migration-local
scp REPLACE_ME_VM_SSH_ALIAS:REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/docker-migration-local/jaysylvester.dump /absolute/private/path/docker-migration-local/
scp REPLACE_ME_VM_SSH_ALIAS:REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/docker-migration-local/jaysylvester.dump.sha256 /absolute/private/path/docker-migration-local/
cd /absolute/private/path/docker-migration-local
shasum -a 256 -c jaysylvester.dump.sha256
```

#### Restore into a new local volume

`[LOCAL DOCKER HOST — macOS]`

```sh
cd /absolute/path/to/jaysylvester.com
dc() { docker compose --env-file .env -p jaysylvester-local -f compose.yaml -f compose.local.yaml "$@"; }
dc config --quiet
if docker volume inspect jaysylvester-local-postgres >/dev/null 2>&1; then
  echo 'Target volume already exists; identify and back it up before continuing.' >&2
else
  dc up -d db
  dc exec -T db pg_isready -U jaysylvester -d jaysylvester
  dc exec -T db pg_restore -U jaysylvester -d jaysylvester --exit-on-error --single-transaction --no-owner --no-privileges < /absolute/private/path/docker-migration-local/jaysylvester.dump
  dc exec -T db psql -U jaysylvester -d jaysylvester -v ON_ERROR_STOP=1 -c 'ANALYZE;'
fi
```

Compare the source and target using concise SQL checks:

- All expected tables, views, sequences, indexes, constraints, and extensions exist.
- Row counts for `case_studies`, `screens`, and `work_history` match.
- Maximum IDs and current sequence values match.
- Representative application queries return the expected rows.

Do not validate against `resources/data.sql`.

#### Start and accept local Docker

```sh
cd /absolute/path/to/jaysylvester.com
./scripts/local-up --build
dc ps
dc logs --tail=200 db app proxy assets
```

Confirm:

- Citizen reports no container-filesystem `.env`, applies the Compose-injected `CITIZEN_*` process variables, and starts in development mode.
- The running image uses Node.js 24 and the recorded Citizen 2.0 Git commit.
- Database and mail consumers use the expected direct `process.env` values without logging secrets, and Citizen applies the expected `CITIZEN_CORS` object.
- No `app/config/*.json` exists inside the container.
- The app responds through Nginx with the required `Forwarded` header behavior.
- `https://dev.jaysylvester.com` is trusted without `curl -k` or a browser exception.
- Existing routes, static files, and `web/shoplc/` work.
- CSS/JavaScript rebuild and BrowserSync reload work after a source edit.
- A controller/view edit is detected through polling.
- The development contact flow uses the migrated mail/address configuration and writes its normal local email log without sending mail.
- The reviewed CORS requests and preflight behavior match the Citizen 1.x baseline.
- Postico connects to `127.0.0.1:5432` with the existing local credentials.
- Data survives `dc down` followed by `./scripts/local-up`.

After acceptance, shut down the old project's VM services and observe the Docker setup. Delete the VM only after its migration dump is stored somewhere independent of that VM and every other workload on the VM has been migrated or retired.

#### Retire the local VM

Once the deletion gate is clear:

1. Stop the old application, Nginx, and PostgreSQL in the VM.
2. Power off the VM with `sudo poweroff`.
3. Run local Docker through the agreed observation period and confirm the protected dump is still readable.
4. Delete the powered-off VM and its virtual disks/snapshots using the VM product that created it. Record that product and its exact deletion command during inventory; do not guess it in advance.
5. Remove the obsolete VM SSH alias, shared-folder entry, port-forwarding rule, and any hosts entry pointing `dev.jaysylvester.com` to the VM.
6. Confirm `dev.jaysylvester.com` still resolves to `127.0.0.1` and local Docker still passes the smoke test.

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

### Upgrade the production application without Docker

This is a Citizen/application cutover, not the production Docker migration. Host Nginx continues proxying to the same loopback application port, the application continues reading and writing the same host paths, PostgreSQL remains on its current endpoint with no dump or restore, and Certbot remains unchanged.

#### Prepare Node.js 24 and the production environment

Create the protected environment file from the reviewed migration branch without changing the active checkout. The DigitalOcean snapshot already contains the complete Citizen 1.x rollback state:

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
APP_SERVICE=REPLACE_ME_RECORDED_APP_SERVICE
OLD_PRODUCTION_CONFIG=app/config/REPLACE_ME_CURRENT_PRODUCTION_CONFIG.json
MIGRATION_BRANCH=docker-citizen2-migration
git status --short
test -f "$OLD_PRODUCTION_CONFIG"
git fetch origin "$MIGRATION_BRANCH"
umask 077
git show "origin/$MIGRATION_BRANCH:.env.example" > .env
${EDITOR:-vi} .env
APP_USER="$(systemctl show -p User --value "$APP_SERVICE")"
test -n "$APP_USER" || APP_USER=root
sudo chown "$APP_USER" .env
sudo chmod 0600 .env
```

Translate the production JSON using the mapping under **Convert local configuration**, but retain host endpoints:

- `CITIZEN_MODE=production`.
- `CITIZEN_HTTP__HOSTNAME` and `CITIZEN_HTTP__PORT` equal the current host application's Nginx upstream binding.
- `DB_HOST=127.0.0.1` (or the inventoried current host value) and the current PostgreSQL port.
- Existing database, mail, pool, layout, template-engine, CORS, and credential values unchanged.
- No development watcher variables.

Do not include `POSTGRES_INITDB_ARGS` or `POSTGRES_TIMEZONE` merely to run the host application; they are retained in the file for the later Docker database initialization and are not consumed by Citizen or the application.

Install a pinned official Node.js 24 LTS binary under `/opt`. The version below was current in the official Node 24 distribution when this plan was revised; check the official `latest-v24.x` index and update both the version and checksum input if a newer supported Node 24 release is selected:

```sh
NODE_VERSION=v24.19.0
case "$(dpkg --print-architecture)" in
  amd64) NODE_ARCH=x64 ;;
  arm64) NODE_ARCH=arm64 ;;
  *) echo 'Unsupported architecture; select the matching official Node binary.' >&2; exit 1 ;;
esac
cd /tmp
curl -fSLO "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-$NODE_ARCH.tar.xz"
curl -fSLO "https://nodejs.org/dist/$NODE_VERSION/SHASUMS256.txt"
grep " node-$NODE_VERSION-linux-$NODE_ARCH.tar.xz$" SHASUMS256.txt | sha256sum -c -
sudo tar -xJf "node-$NODE_VERSION-linux-$NODE_ARCH.tar.xz" -C /opt
sudo ln -sfn "/opt/node-$NODE_VERSION-linux-$NODE_ARCH" /opt/node24
/opt/node24/bin/node --version
/opt/node24/bin/npm --version
```

The production service will call `/opt/node24/bin/node` explicitly. There is no need to change `/usr/bin/node`.

#### Publish and cut over the Citizen 2.0 application

Once local acceptance passes and the production `.env` has been reviewed, fast-forward the production deployment branch to the migration branch:

`[WORKSTATION — macOS]`

```sh
cd /absolute/path/to/jaysylvester.com
PRODUCTION_BRANCH=REPLACE_ME_RECORDED_PRODUCTION_BRANCH
MIGRATION_BRANCH=docker-citizen2-migration
git fetch origin "$PRODUCTION_BRANCH" "$MIGRATION_BRANCH"
git switch "$MIGRATION_BRANCH"
git merge --ff-only "origin/$PRODUCTION_BRANCH"
git switch "$PRODUCTION_BRANCH"
git pull --ff-only origin "$PRODUCTION_BRANCH"
git merge --ff-only "$MIGRATION_BRANCH"
git push origin "$PRODUCTION_BRANCH"
```

If either merge does not fast-forward, reconcile the branches on the workstation, rerun the affected local tests, and repeat. Do not resolve application conflicts on the droplet.

Perform the short production application cutover:

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
APP_SERVICE=REPLACE_ME_RECORDED_APP_SERVICE
DEPLOY_BRANCH="$(git branch --show-current)"
OLD_PRODUCTION_CONFIG=app/config/REPLACE_ME_CURRENT_PRODUCTION_CONFIG.json
sudo systemctl stop "$APP_SERVICE"
rm -- "$OLD_PRODUCTION_CONFIG"
if test -f package-lock.json && ! git ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
  rm -- package-lock.json
fi
git pull --ff-only origin "$DEPLOY_BRANCH"
PATH=/opt/node24/bin:/usr/local/bin:/usr/bin:/bin npm ci --omit=dev
sudo install -d -m 0755 "/etc/systemd/system/$APP_SERVICE.d"
sudo tee "/etc/systemd/system/$APP_SERVICE.d/citizen2.conf" >/dev/null <<EOF
[Service]
Environment="PATH=/opt/node24/bin:/usr/local/bin:/usr/bin:/bin"
ExecStart=
ExecStart=/opt/node24/bin/node /var/www/jaysylvester.com/app/start.js
EOF
sudo systemctl daemon-reload
sudo systemctl start "$APP_SERVICE"
sudo systemctl status "$APP_SERVICE" --no-pager
curl -fsS https://jaysylvester.com/ >/dev/null
```

Run the focused public route, email, CORS, secure-cookie, and database-read checks. Confirm Nginx and PostgreSQL were never stopped, Citizen reports production mode and the expected applied variables, the app uses Node.js 24 and the locked Citizen commit, no active `app/config/*.json` remains, and no secret is logged.

If the production application is not acceptable, use the single DigitalOcean snapshot rollback procedure below. Do not reconstruct the old runtime manually.

After acceptance, the host-based production deployment remains:

```sh
cd /var/www/jaysylvester.com
git pull --ff-only
PATH=/opt/node24/bin:/usr/local/bin:/usr/bin:/bin npm ci --omit=dev  # only when dependencies changed
sudo systemctl restart REPLACE_ME_APP_SERVICE
```

Application-only work from the new local Docker environment can now ship through this method. Production Docker is not required until Phase 2.

### Phase 1 acceptance gate

Phase 1 is complete when the local acceptance criteria pass, the protected local database dump is independent of the VM, and production runs the same Citizen 2.0 application through its existing host Nginx and PostgreSQL. Normal development can then proceed on macOS and deploy to production through the host-based procedure above for as long as desired.

## 7. Phase 2 — Production Deployment

Phase 2 starts from the working host-based Citizen 2.0 production application established in Phase 1. It inventories and prepares the Debian infrastructure, adds the production Compose overlay, migrates the live production database, switches Nginx and the app to Docker, preserves Let's Encrypt, and finally removes the retired host runtimes. Phase 1 production can remain in service indefinitely before this phase begins.

### Inventory the production Debian droplet

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
hostname
cat /etc/os-release
test "$(. /etc/os-release && printf '%s' "$ID")" = debian
git status --short
git branch --show-current
git rev-parse HEAD
/opt/node24/bin/node --version
/opt/node24/bin/node -p "require('./node_modules/citizen/package.json').version"
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

Record the exact production deployment branch, Citizen 2.0 application unit/process command, project-root `.env` path, normal host deployment commands, and current Git/Citizen revisions. Confirm no `app/config/*.json` is active and confirm the recorded DigitalOcean snapshot still exists.

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

Review the local and production Nginx captures and list only application-relevant behavior to reproduce:

- Server names and canonical-host redirects.
- HTTP-to-HTTPS and legacy redirects, including status codes and query-string behavior.
- Static root, `try_files`, named locations, MIME/gzip/cache behavior, and `web/shoplc/`.
- Proxy headers and other site-specific proxy settings already active.
- TLS certificate paths and important security headers.
- ACME challenge handling.

Production is authoritative for public behavior. Do not copy unrelated Debian-wide Nginx defaults or module-loading files into the image.

### Implement and review the production overlay

Copy the protected effective Nginx capture to a protected workstation path outside Git, then create a short-lived production-Docker branch from the current, deployable Citizen 2.0 production branch and finish the production-specific artifacts listed in section 4:

`[WORKSTATION — macOS]`

```sh
mkdir -p /absolute/private/path/docker-migration-production
chmod 700 /absolute/private/path/docker-migration-production
scp REPLACE_ME_PRODUCTION_SSH:REPLACE_ME_PROTECTED_PRODUCTION_STAGING_DIRECTORY/nginx-before-docker/effective.txt /absolute/private/path/docker-migration-production/
cd /absolute/path/to/jaysylvester.com
PRODUCTION_BRANCH=REPLACE_ME_RECORDED_PRODUCTION_BRANCH
PRODUCTION_DOCKER_BRANCH=docker-production-migration
git switch "$PRODUCTION_BRANCH"
git pull --ff-only origin "$PRODUCTION_BRANCH"
git switch -c "$PRODUCTION_DOCKER_BRANCH"
git status --short
```

Implement `compose.production.yaml`, the production Nginx configuration, the Certbot reload hook, the focused production smoke-test cases, and the production README sections. Use the effective configuration to preserve redirects, locations, headers, static behavior, and ACME handling; do not copy unrelated host-wide Nginx content.

Render and build the production definitions on the Mac with a temporary, non-secret review environment outside Git:

```sh
cp .env.example /tmp/jaysylvester-production-review.env
${EDITOR:-vi} /tmp/jaysylvester-production-review.env
docker compose --env-file /tmp/jaysylvester-production-review.env -p jaysylvester-production-review -f compose.yaml -f compose.production.yaml config --quiet
docker compose --env-file /tmp/jaysylvester-production-review.env -p jaysylvester-production-review -f compose.yaml -f compose.production.yaml build app proxy
rm /tmp/jaysylvester-production-review.env
git diff --check
git status --short
git add compose.production.yaml docker/nginx scripts/reload-production-proxy scripts/smoke-test README.md
git diff --cached --check
git commit -m "Add production Docker deployment"
git push -u origin "$PRODUCTION_DOCKER_BRANCH"
```

If the branch already exists, switch to it rather than creating it. Use syntactically valid placeholders in the temporary review file, not production credentials. Review the staged file list before committing in case the implementation changed a different focused file. Re-run the local smoke test after these shared-file changes; Phase 2 must not regress the accepted Phase 1 environment.

### Prepare production

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
PRODUCTION_DOCKER_BRANCH=docker-production-migration
git status --short
sudo test -r .env
/opt/node24/bin/node --version
/opt/node24/bin/node -p "require('./node_modules/citizen/package.json').version"
git fetch origin "$PRODUCTION_DOCKER_BRANCH"
git diff --stat HEAD "origin/$PRODUCTION_DOCKER_BRANCH"
find app/config -maxdepth 1 -type f -name '*.json' -print
```

Stop if the tracked worktree is dirty or the `find` command returns a JSON file. In the DigitalOcean control panel, confirm `jaysylvester-pre-citizen2-docker-REPLACE_ME_DATE` is complete and available before continuing.

Review the production `.env` without changing its credentials or application behavior. It must still contain the host-safe endpoints used by the running service plus the rehearsed `POSTGRES_INITDB_ARGS` and `POSTGRES_TIMEZONE`. Confirm `compose.production.yaml` overrides `DB_HOST=db` and the Citizen HTTP bind address only inside the app container. Do not rewrite the protected file merely for Docker networking.

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

#### Publish the production Docker overlay

After review, fast-forward the production deployment branch to the production-Docker branch and push it:

`[WORKSTATION — macOS]`

```sh
cd /absolute/path/to/jaysylvester.com
PRODUCTION_BRANCH=REPLACE_ME_RECORDED_PRODUCTION_BRANCH
PRODUCTION_DOCKER_BRANCH=docker-production-migration
git fetch origin "$PRODUCTION_BRANCH" "$PRODUCTION_DOCKER_BRANCH"
git switch "$PRODUCTION_DOCKER_BRANCH"
git merge --ff-only "origin/$PRODUCTION_BRANCH"
git status --short
git switch "$PRODUCTION_BRANCH"
git pull --ff-only origin "$PRODUCTION_BRANCH"
git merge --ff-only "$PRODUCTION_DOCKER_BRANCH"
git push origin "$PRODUCTION_BRANCH"
```

The first merge must fast-forward because the Docker branch should contain every intervening production commit. If it does not, stop and reconcile the branches on the workstation, rerun affected local checks, and retry; do not resolve application conflicts on the droplet.

The Docker files are inert while the host service continues running Citizen 2.0. Production may pull this commit before the maintenance window and continue using the Phase 1 host deployment method. Do not invoke Compose or change the host endpoints until the cutover steps below.

### Production cutover

Downtime is acceptable. Pause manual Postico changes until cutover validation completes.

#### Stop the host stack and dump PostgreSQL

`[PRODUCTION]`

```sh
cd /var/www/jaysylvester.com
APP_SERVICE=REPLACE_ME_RECORDED_APP_SERVICE
DEPLOY_BRANCH="$(git branch --show-current)"
git pull --ff-only origin "$DEPLOY_BRANCH"
sudo systemctl stop "$APP_SERVICE"
pdc() { sudo docker compose --env-file .env -p jaysylvester-production -f compose.yaml -f compose.production.yaml "$@"; }
pdc config --quiet
pdc build --pull app proxy
pdc run --rm --no-deps --entrypoint node app --version
pdc run --rm --no-deps --entrypoint node app -p "require('./node_modules/citizen/package.json').version"
pdc run --rm --no-deps --entrypoint sh app -c "! find /site/app/config -maxdepth 1 -type f -name '*.json' -print 2>/dev/null | grep ."
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

If the application is not managed by systemd, use the recorded stop command instead. The image checks must report Node.js 24, Citizen 2.0, and no JSON path. Confirm the tracked lockfile resolves the same Citizen commit already running on the host and recorded in `docs/migrations/citizen-2.md`.

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

Run the same concise schema, row-count, maximum-ID, sequence, extension, and representative-query comparison used locally.

Validate:

- Citizen reports no container-filesystem `.env`, applies the Compose-injected production `CITIZEN_*` variables, and starts in production mode.
- The running container uses Node.js 24 and the same recorded Citizen 2.0 Git commit tested locally.
- Database and mail consumers use the expected direct `process.env` values, Citizen applies the expected `CITIZEN_CORS` object, no legacy JSON exists inside the container, Node is non-root, logs are writable, and the containers are healthy.
- All inventoried redirects have the same status and destination.
- Existing application routes, static assets, `web/shoplc/`, 404 behavior, and HTTPS work.
- The public certificate name, chain, and expiry are correct.
- Production contact and confirmation email work with the direct `process.env` values and existing credentials.
- The reviewed CORS requests and preflight behavior match the Citizen 1.x baseline.
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

### Production rollback

The same rollback applies to an unacceptable Phase 1 Citizen cutover or Phase 2 Docker cutover. Because the site and database do not change between the snapshot and either phase, do not reconstruct packages, Git revisions, configuration, Certbot, or PostgreSQL manually.

`[DIGITALOCEAN CONTROL PANEL]`

1. Open the existing Droplet and choose the restore action for `jaysylvester-pre-citizen2-docker-REPLACE_ME_DATE`.
2. Confirm that the restore will overwrite the existing Droplet's disk.
3. Wait for restoration to complete, then power on that same Droplet if necessary.
4. Confirm the Droplet still has its existing public IP.
5. Verify SSH, the public site, HTTPS, Nginx, PostgreSQL, the application service, and Postico.

This restores the whole server to its pre-migration condition, including Citizen 1.x, the original Node runtime, Git checkout, JSON configuration, Nginx, PostgreSQL data, Certbot configuration, systemd units, and removal of any Docker state created later. Do not create a replacement Droplet, because a newly created Droplet does not inherit the original IP from the snapshot.

### Normal use after migration

#### Local development

```sh
cd /absolute/path/to/jaysylvester.com
./scripts/local-up
docker compose --env-file .env -p jaysylvester-local -f compose.yaml -f compose.local.yaml logs -f app proxy assets
docker compose --env-file .env -p jaysylvester-local -f compose.yaml -f compose.local.yaml down
```

After editing `.env`, recreate the app so Compose injects the new process environment, then recreate proxy because the app container IP changed:

```sh
dc() { docker compose --env-file .env -p jaysylvester-local -f compose.yaml -f compose.local.yaml "$@"; }
dc up -d --no-deps --force-recreate app
dc up -d --no-deps --force-recreate proxy
./scripts/smoke-test https://dev.jaysylvester.com
```

Do the equivalent targeted app-then-proxy recreation with the production `.env` after a production environment change. Do not refresh the Citizen branch implicitly during deployment: test the new Citizen commit upstream, update this project's lockfile and migration record in a reviewed development commit, and deploy that commit through the normal sequence.

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

Local:

- Host `127.0.0.1`, port `5432`.
- Existing local database, user, and password.

Production:

- Keep the existing SSH host/tunnel.
- Remote database host `127.0.0.1`, port `5432`.
- Existing production database, user, and password.

No ongoing database command-line maintenance workflow is added by this migration.

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

Remove the host-installed Citizen 2.0 `node_modules` and the separately installed Node.js 24 runtime after confirming the production container uses the injected `.env` and contains no `app/config/*.json`:

```sh
cd /var/www/jaysylvester.com
rm -rf -- /var/www/jaysylvester.com/node_modules
NODE24_TARGET="$(readlink -f /opt/node24)"
case "$NODE24_TARGET" in
  /opt/node-v24.*-linux-*) sudo rm -f -- /opt/node24; sudo rm -rf -- "$NODE24_TARGET" ;;
  *) echo "Unexpected Node.js 24 path: $NODE24_TARGET; inspect it instead of deleting it." >&2 ;;
esac
```

The Docker build excludes host `node_modules` and installs the locked Linux dependency tree inside its image. The DigitalOcean snapshot contains the removed host dependency tree and Node runtimes if rollback is required.

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
- Add the local hostname to `/etc/hosts`.
- Run `scripts/local-up` and restore the database on a first clone.
- Use Postico at `127.0.0.1:5432`.
- Explain Citizen 2.0's process-environment model, local HTTPS, Gulp/BrowserSync, normal start/stop, and environment-driven app/proxy recreation.

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

- During the interval between phases, document the host-based Node.js 24/Citizen 2.0 `git pull`, conditional `npm ci`, and application-service restart procedure while clearly stating that Nginx, PostgreSQL, and Certbot are still host services.
- Debian host architecture and required ignored inputs.
- SSH, `git pull`, ordered app/proxy Compose deployment, and smoke test.
- Direct Citizen branch dependency behavior: ordinary deploys use the locked commit; consuming a newer branch commit requires upstream tests, a deliberate lockfile refresh, and an updated migration record.
- Postico through SSH to remote loopback port 5432.
- Host Certbot/webroot/timer/deploy-hook arrangement.
- The fact that host Node, Nginx, and PostgreSQL were removed after migration.

When Phase 2 completes, replace the temporary host-application procedure with the Compose procedure rather than leaving two apparently active production methods.

Keep the README task-focused. Do not turn the future-host notes into separately engineered and tested deployment systems during this migration.

## 9. Acceptance Criteria

### Phase 1 is complete when

- Local development runs on the Mac through Docker Desktop with no dependency on the old VM.
- Citizen's native test suite passes under both Node.js 22 and Node.js 24 at the exact direct-branch commit resolved by this project's lockfile.
- The local image uses Node.js 24 and Citizen 2.0 directly from `2.0-env-file-config-revised`; no unpublished framework patch exists only in this repository or image.
- Citizen applies the local `CITIZEN_*` variables, including scoped polling, while application-owned settings are read directly from `process.env` and remain outside `app.config`.
- Both `app.start()` calls are argument-free; no active `app.config.citizen`, `config.citizen`, `app.config.db`, or `app.config.mail` consumer remains.
- No `app/config/*.json` exists in the local Citizen 2.0 container; the local source JSON was converted without credential rotation and archived recoverably.
- Node runs non-root, Citizen can write its logs, and local source mounts do not mask image-owned `/site/node_modules`.
- The local Docker database was restored from the live VM database with schema, row counts, maximum IDs, sequences, extensions, and representative queries matching.
- The local database volume was initialized with the reviewed source encoding, `lc_collate`, and `lc_ctype`; `resources/data.sql` was not used.
- Existing local routes, static content, `web/shoplc/`, email logging, CORS behavior, `Forwarded` behavior, and HTTPS work as before.
- Local HTTPS is trusted without certificate copying, and source watching plus BrowserSync work through Docker Desktop.
- Local PostgreSQL is reachable by Postico only through loopback and its data survives container recreation.
- `package-lock.json` is tracked, records the tested Citizen Git commit, and builds pass with `npm ci`.
- `docs/migrations/citizen-2.md` and the macOS README instructions contain no secrets and record the local migration evidence.
- Required secrets, dumps, and private keys are absent from Git and image layers.
- Production runs the same locked Citizen 2.0 application under Node.js 24, with its original JSON preserved in the DigitalOcean rollback snapshot and its protected environment loaded by the existing application service.
- Production Nginx, PostgreSQL, Certbot, public ports, and database remain host-installed and unchanged, and application-only work from local Docker can deploy through SSH, `git pull`, conditional `npm ci`, and service restart.
- The local VM is deleted only after its remaining workloads and backups are accounted for.

### Phase 2 is complete when

- Production runs the app, Nginx, and PostgreSQL through Docker Compose on Debian using the locally accepted Citizen 2.0 application revision plus the reviewed production overlay.
- The production JSON converted in Phase 1 remains absent from the Citizen 2.0 container, with the original retained in the DigitalOcean snapshot and no credential rotation.
- The production Docker database was restored from the live host database with its initialization settings and focused data comparisons matching.
- Existing public routes, static content, `web/shoplc/`, redirects, 404 behavior, email, CORS, proxy headers, and HTTPS work as before.
- Production Let's Encrypt renewal succeeds and reloads container Nginx.
- Production PostgreSQL is reachable by Postico only through the existing SSH tunnel and survives container recreation.
- Routine production app deployment recreates proxy afterward and does not recreate the database.
- The powered-off pre-migration DigitalOcean snapshot remains available through the rollback window and restores the existing Droplet in place.
- The README documents the final Debian production, deployment, Postico, Certbot, and cleanup procedures.
- Retired production host runtimes and data are removed only after the Docker stack, migration dump, reboot, and Certbot checks pass.

## 10. Scope-Control Rationale for Reviewers

This plan was deliberately reduced after earlier reviews expanded it beyond the migration's needs. Its approved purpose now has two connected parts: migrate this application to the direct Citizen 2.0 branch as the first real-project validation, and move the application plus its two databases into Docker. It must preserve behavior, remove the custom local VM, reproduce production, maintain HTTPS, capture reusable Citizen migration evidence, and retire the replaced production services. It is not a general infrastructure-modernization program.

The two-phase boundary is deliberate. Phase 1 changes the shared application baseline everywhere: local Docker and the existing production host both move to Node.js 24, Citizen 2.0, and environment configuration. That small production application cutover is required so work developed locally can continue shipping immediately. It does not authorize production Docker work: Nginx, PostgreSQL, Certbot, database data, and their host service topology remain untouched until Phase 2. Do not add backward-compatibility layers or dual Citizen 1.x/2.0 application paths; update the production application runtime once instead.

Phase 2 contains the infrastructure complications the user explicitly chose to defer: Docker Engine on Debian, the production Compose/Nginx overlay, live database dump and restore, Certbot integration with container Nginx, and host-runtime cleanup. Reviewers must not pull those tasks into Phase 1 merely because the production application already uses Citizen 2.0.

Production rollback is intentionally one operation: restore the single powered-off DigitalOcean snapshot onto the existing Droplet. The accepted assumptions are that downtime is unimportant and no production state changes between the snapshot and completion of both phases. Do not add parallel runtime archives, dependency archives, configuration archives, Git-detach recovery, targeted service reconstruction, or a second snapshot unless those assumptions change.

The following requested outcomes are not scope creep and must remain:

- Both macOS development and Debian production are containerized.
- This project migrates to Citizen 2.0 and deploys on Node.js 24 using the direct branch, tests Citizen's minimum Node.js 22 support as well, and records findings for later Citizen projects.
- Both live databases are migrated directly.
- Citizen 1.x JSON is fully classified and converted to Citizen 2.0 framework/application environment variables without silent loss; legacy JSON is rejected by the new containers and retained in the rollback snapshot.
- Existing Nginx redirects and site behavior are inventoried before replacement.
- Local `mkcert` and production Let's Encrypt continue to provide HTTPS.
- The README supports the tested macOS path and identifies future Linux/Windows differences.
- Retired Nginx, PostgreSQL, and Node packages/data are removed from production after safe acceptance.
- Production app recreation is followed by proxy recreation to avoid Nginx's cached upstream IP.

Reviewers should not add a new requirement merely because it is a generally desirable operational practice. An addition belongs in this plan only when at least one of these is true:

1. Docker cannot run the current application correctly without it.
2. It prevents loss or corruption of the two databases during this migration.
3. It preserves behavior that exists in the source environments.
4. It is necessary to complete an outcome explicitly listed above.

Otherwise, record it as a follow-up. In particular, do not reintroduce:

- Cross-project gateways, port registries, or orchestration design.
- New application routes, proxy behavior, pool tuning, caching policy, or dependency upgrades.
- Custom process-inspection frameworks or exhaustive HTTP/database test harnesses.
- Ongoing backup automation, monitoring, retention policy, or general disaster-recovery design.
- Extra production hardening unrelated to replacing the three host runtimes.
- Fully implemented Linux and Windows variants before either host is actually used.
- A generalized Citizen migration utility, codemod, or speculative refactor of other projects. Reusable findings are required; implementing the next project's migration is not.

Prefer the smallest check that proves a migration requirement. A successful logical restore plus focused data comparisons and application queries is sufficient; it does not need a permanent database-test framework. Citizen's own configuration log plus a working application is sufficient; it does not need `/proc` parentage assertions. Reviewing the effective Nginx configuration and testing its actual redirects is sufficient; it does not need a generalized response-manifest system.

The direct Citizen test, explicit application `process.env` conversions, granular local mounts, pre-init PostgreSQL arguments, intentional lockfile transition, powered-off production snapshot, and logical database dump are included under this test. They prevent concrete failures: consuming an untested framework commit, passing string values where numeric database options are required, an unusable local container, expensive volume reinitialization, an unreproducible dependency, an incomplete whole-server rollback, and an unusable database migration source. They are narrow protections, not invitations to restore the broader tooling removed from earlier drafts.

Any proposed expansion should identify the concrete migration failure it prevents, the evidence that the risk exists in this project, and why the existing focused check is inadequate. Without that justification, it should remain outside this plan.

## 11. References

- Citizen 2.0 branch: <https://github.com/jaysylvester/citizen/tree/2.0-env-file-config-revised>.
- Citizen 1.x-to-2.x guide: <https://github.com/jaysylvester/citizen/blob/2.0-env-file-config-revised/MIGRATION.md>.
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
