# jaysylvester.com

Personal site built with citizen 2.0. Development and production run Node.js,
PostgreSQL, and Nginx through Docker Compose.

## Development

Open <https://dev.jaysylvester.com>. The local hostname must resolve to
`127.0.0.1`; `scripts/dev` creates or refreshes its ignored `mkcert` certificate.
On the first start with no database volume, it also asks for a `postgres`
administrator password at a hidden prompt. The one-off initializer creates the
existing `jaysylvester` application role with the password already in `.env`,
then is removed before the normal database starts. Normal db receives no password
inputs or initialization hook.

Keep `DB_PASSWORD` and configured `MAIL_AUTH_PASS` in the ignored local `.env`,
including when `NODE_ENV=development`. Development logs mail; production-mode mail
uses the configured key. Credential presence alone does not enable sending.
Citizen loads `.env` for native execution and the development app. The shared
`app.helpers.secrets.readSecret('MAIL_AUTH_PASS')` helper uses a nonempty
`MAIL_AUTH_PASS_FILE` path when supplied, otherwise `MAIL_AUTH_PASS`, in either mode.
An unreadable explicit file fails without falling back. Docker production reads host
`.env` through Compose and mounts only the password files into app. Local production-mode
testing can keep the development Compose stack and its local database; restart app
after changing `NODE_ENV`. Use credentials appropriate to that local environment.

```sh
./scripts/build                 # Prepare/build development images only
./scripts/dev start             # Sync dependencies, build, and start with live logs
./scripts/dev start -d          # Same preparation, then run in the background
./scripts/dev stop              # Stop while retaining containers
./scripts/dev restart           # Build/recreate app, proxy, assets; db only if named
./scripts/dev status
./scripts/dev logs              # Follow retained and new logs
./scripts/dev test
./scripts/dev destroy           # Remove containers/network; keep volumes
./scripts/dev postgres-password # Change the postgres password at hidden prompts
./scripts/dev compose ARGS      # Raw development Compose command
```

`start` and `restart` automatically synchronize `package-lock.json` when package
declarations change, using npm inside the Docker dependency-tools image. Host Node
and npm are not required for dependency preparation. Changed dependencies are
refreshed; unchanged declarations keep their locked versions. Each start requests
a Docker build, which reuses cached layers until package or image inputs change.
Review and commit resulting lockfile changes alongside `package.json`.

`restart` runs detached, rebuilding development images and recreating only the
selected services. With no names it selects `app`, `proxy`, and `assets`; PostgreSQL
is included only when `db` is named explicitly. `restart db` alone remains an in-place
database restart. To restart without dependency preparation, use the raw Compose
command (`./scripts/dev compose restart app`).

`./scripts/build` (or `./scripts/dev build`) prepares dependencies and builds images
without starting services or needing runtime `.env` values. `./scripts/build production`
builds the production target locally using the same preparation. Start and restart
call this wrapper; app and assets share `jaysylvester-app:development`, while production
uses `jaysylvester-app:production`. Proxy tags follow the same split. Compose uses these
prebuilt images with `pull_policy: never`; raw `./scripts/dev compose up --build` no
longer builds them. Use the build/start wrapper instead.

A mixed `./scripts/dev restart app db` builds/recreates app and restarts db in place.
The default selects app/proxy/assets and leaves db alone. `destroy` accepts no arguments
and preserves named volumes. Host Node/npm is not needed for these shell commands.

The Gulp watcher keeps its existing behavior. To regenerate all root assets manually
while the assets service is running:

```sh
./scripts/dev compose exec assets npm run assets:build
```

Review the compiler output, test, and commit the generated files. Production copies
those committed files; the image build does not introduce asset compilation.

All three projects declare Citizen as `git+https://github.com/jaysylvester/citizen.git#2.0`.
To fetch the latest commit from that branch, update its lock entry, build, and start:

```sh
./scripts/dev start --update citizen       # Attached; add -d for the background
./scripts/build --update citizen           # Refresh/build without starting services
```

`--update PACKAGE` works for any declared root dependency and can be repeated, for
example `--update citizen --update pg`. npm refreshes the requested packages within
their declared specifications; unrelated roots stay locked where npm permits.
The command prints the old/new Git commits (or reports an unchanged resolution).
An ordinary start keeps the existing lock commit for an unchanged branch. Review,
test, and commit refreshed lockfiles; production deployment installs those tested
commits and does not fetch the branch. `--locked` rejects `--update`.

To confirm the installed Citizen revision or browse its files:

```sh
./scripts/dev compose exec app npm ls citizen
./scripts/dev compose cp app:/site/node_modules/citizen /tmp/jaysylvester-citizen
```

The copied directory is an inspection snapshot. Compare commit hashes when checking
Git dependencies; the package version may remain unchanged between branch commits.

`start` remains attached; Ctrl+C stops the stack. Run status, tests, and other
commands from another terminal. Host Node and npm are not required, although
the existing npm development commands remain as aliases.

Application source, `citizen.config.js`, and `.env` are mounted into the app.
After changing `.env` or `citizen.config.js`, restart the app and rerun the smoke
test:

```sh
./scripts/dev restart app
./scripts/dev test
```

Development Nginx refreshes Docker DNS, so app/assets containers can be recreated
without recreating the proxy. Static development responses use no-store.

citizen file logs are available under `logs/`. Postico connects to
`127.0.0.1:${DB_CLIENT_PORT:-5432}`.

Use `postgres` for administration; keep its password in Postico/password manager.
The existing `jaysylvester` app login and password remain, with CRUD-only privileges.
Existing environments need the [role migration](docs/migrations/database-app-role.md)
before using the separated Compose configuration.

### Running alongside other projects

Only one stack can own loopback 80/443, so two projects cannot both publish them.
To run several dev stacks at once, set `DEV_EDGE=true` in `.env`. `scripts/dev` then
adds `compose.dev.edge.yaml`, which drops the proxy's published ports and joins the
shared `dev-edge` network as `jaysylvester-proxy`; a single edge proxy in
`~/Projects/dev-edge` (outside every repository) owns 80/443 and forwards each
`dev.*` hostname to its project by TLS server name. `scripts/dev start` starts the
edge for you if it isn't running, and Docker restarts it after a reboot; see
`~/Projects/dev-edge/README.md` for the manual commands and how to add a project.

Leave `DEV_EDGE` unset to run this project standalone with its own published ports.
A fresh clone needs nothing from the edge, but a running edge already owns 80/443;
`scripts/dev` will tell you to enable the edge or stop it instead of failing with a
generic port error. Each project's `DB_CLIENT_PORT` must differ (5432 here) so the
databases can be published at the same time. The edge overlay requires a Docker
Compose release that supports `!reset`; `npm run test:compose` checks that syntax.

Repository checks:

```sh
npm run lint
npm run test:dev
npm run test:db
npm run test:compose
npm run test:prod
```

Without host Node/npm, run lint and mocked script tests in the development image:

```sh
# Read current host scripts; no service/database is started by these checks.
docker run --rm --volume "$PWD/scripts:/site/scripts:ro" jaysylvester-app:development npm run lint
docker run --rm --volume "$PWD/scripts:/site/scripts:ro" jaysylvester-dependency-tools:development \
  node --test scripts/test-dev.mjs scripts/test-db.mjs scripts/test-prod.mjs
```

The test command uses the dependency-tools image because the offline Git test needs
Git and npm there; lint uses the development dependencies in the app image.
`test:compose` renders configuration through the host Docker CLI; it also needs Node
available where that CLI runs. See the [alignment acceptance record](docs/alignment-acceptance.md)
for checks, exceptions, and completed production acceptance.

### Database backup and restore

Backups are stored in a protected directory outside the repository. Set
`DEV_DB_BACKUP_PARENT` to override the default location.

```sh
./scripts/dev db-backup
./scripts/dev stop
export POSTGRES_VOLUME=jaysylvester-postgres-restore-YYYYMMDD
./scripts/dev db-restore /absolute/path/to/backup.dump
```

Backups are protected custom-format archives, validated and accompanied by SHA-256
checksums. Failed output is removed. Restore validates the archive, requires
interactive `RESTORE` confirmation, and only writes to an empty database. Stop app/proxy first and select a new
`POSTGRES_VOLUME`; the populated volume remains intact as the rollback copy.
After accepting the restored database, put its volume name in `.env`. The
PostgreSQL volume survives both `stop` and `destroy`. Restore runs transactionally,
reapplies guarded grants, and preserves db's prior running/stopped state.

### Theme testing

The site follows the operating-system theme. Temporarily override it in the
browser console:

```js
document.documentElement.dataset.theme = 'dark'
document.documentElement.dataset.theme = 'light'
delete document.documentElement.dataset.theme
```

## Production

Connect and enter the checkout:

```sh
ssh jaysylvester.com
cd /var/www/jaysylvester.com
```

Deploy the latest `main`:

```sh
./scripts/prod deploy
```

Deployment requires a clean `main` checkout and pulls with `--ff-only`, then re-execs
the updated script. It validates configured external storage and secrets, retains
the running app/proxy image IDs under paired unique `rollback-...` tags, and checks
manifest/lock agreement without resolving packages or writing the lockfile. The
shared build wrapper and dependency helper use `sudo docker` on the server.
Both production images must build successfully before app is recreated, followed
by proxy and the existing retrying smoke test. PostgreSQL is left in place.
A failed check/build prevents replacement and reports relevant state/logs.

Production adoption and the credential follow-ups were verified by the operator on
2026-10-19; see the [acceptance record](docs/alignment-acceptance.md#production-acceptance--2026-10-19).
Use `./scripts/prod deploy` for normal deployments. It builds
`jaysylvester-app:production` and `jaysylvester-proxy:production` itself before
recreating services; no separate first-build command is needed. `prod test` targets
the real site.

Operational commands:

```sh
./scripts/prod start             # Detached; existing images/volumes; no recreation
./scripts/prod stop
./scripts/prod restart           # In-place app/proxy; db requires explicit selection
./scripts/prod status
./scripts/prod logs
./scripts/prod test
./scripts/prod app-password      # Change the DB_USER password at hidden prompts
./scripts/prod postgres-password # Change the postgres password at hidden prompts
./scripts/prod compose ARGS      # Raw production Compose command
```

There is intentionally no production `destroy` command. Production services
use `restart: unless-stopped`; Docker replaces the former PM2 supervision.

`start` uses `--no-build --pull never --no-recreate`; missing external storage fails
rather than creating empty data. Development `dev:build` now builds images only;
use `dev:start` to start the stack.

### Production database passwords

The production application-password follow-up is complete as of the operator's
2026-10-19 verification. Only the `jaysylvester` application password was rotated;
the separately established `postgres` administrator password was retained.
See the [acceptance record](docs/alignment-acceptance.md#production-app-password-rotation--2026-10-19).
Development credentials stay unchanged.

For future separately authorized rotations, retain recovery access and the current
images, then use PostgreSQL's hidden password prompt:

```sh
./scripts/prod compose stop app
./scripts/prod app-password
```

Enter the new password twice at psql's hidden prompts. The command reads the role
name from configured `DB_USER`; it does not change `postgres`, edit `.env`, or manage
services. It accepts no password arguments. Update only `DB_PASSWORD` in production
`/var/www/jaysylvester.com/.env` to the same value, preserving its protected
permissions and other values. Then use the normal deployment workflow:

```sh
./scripts/prod deploy
```

Deployment builds both production images, recreates app followed by proxy, and runs
the smoke test. The database container remains in place. The password wrapper uses
`sudo docker`, like `postgres-password`; no Python helper is needed.
Verify fresh TCP app authentication accepts the new password and rejects the old
one; trusted socket access and existing connections do not establish this.
Any image rollback must retain the new `DB_PASSWORD`.

### Manual image recovery

Use the retained app/proxy tag pair printed by the failed deployment. A successful
app build may already have moved its `:production` tag when a later proxy build
fails, even though running containers have not changed. Restore both tags:

```sh
retention=rollback-REPLACE_WITH_PRINTED_IDENTIFIER
sudo docker image tag "jaysylvester-app:$retention" jaysylvester-app:production
sudo docker image tag "jaysylvester-proxy:$retention" jaysylvester-proxy:production
```

Use a separate checkout of the previous compatible revision with protected production
configuration and the accepted external volume names. From that checkout:

```sh
./scripts/prod compose up -d --no-build --pull never --no-deps --force-recreate app
./scripts/prod compose up -d --no-build --pull never --no-deps --force-recreate proxy
./scripts/prod test
```

Older pre-alignment Compose files may need an explicit app/proxy image override to
select the restored `:production` tags. Keep the normal deploy checkout on clean
`main`; do not reset or detach it for recovery. Production Nginx keeps static
upstreams, so recreate proxy whenever app is recreated, including outside deployment.
Database/schema recovery is a separate migration-specific procedure. Retained tags
are not automatically pruned.

Postico connects to production `127.0.0.1:5432` through its SSH tunnel. To test
certificate renewal and the proxy reload hook:

```sh
sudo certbot renew --dry-run --run-deploy-hooks --no-random-sleep-on-renew
```

## Configuration notes

- `citizen.config.js` contains typed, non-secret citizen, database, and mail
  settings.
- The ignored `.env` contains secrets and deployment-specific inputs.
- Development loads `.env` directly. Production exposes passwords only through
  service-scoped Compose secret files.
- CORS is intentionally unset and fails closed because the site has no
  cross-origin browser client.
- Deployments use the committed resolutions in `package-lock.json` for every
  dependency. Edit any declaration and build locally to prepare its reviewed lockfile.

Detailed migration history and recovery procedures remain in
[the Docker migration plan](docs/plans/docker-migration.md) and
[the citizen 2.0 migration record](docs/migrations/citizen-2.md).
