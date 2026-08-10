# Citizen 1.x to 2.0 migration record

Status: the revised project-configuration-module contract was reviewed and implemented
in development on 2026-08-10. Production remains on its pre-migration host revision
until the coordinated Phase 2 Docker cutover. A subsequent review determined that the
legacy global CORS allowance was preserved without a known cross-origin consumer; the
post-acceptance Phase 1 follow-up removed it and verified Citizen's fail-closed default.

## Framework source

- Target dependency: `git+https://github.com/jaysylvester/citizen.git#2.0-project-config-module-revised`
- Upstream commit reviewed on 2026-08-10: `68cd4c597171cc271019da64c73cc07784bcd450`
- Superseded project-configuration-module commit: `6bc03c6c7c906317954d5c02493fefc7dd70f8d4`
- Citizen version at the reviewed commit: `2.0.0`
- Review result: all 38 native tests passed under Node.js 22 and Node.js 24.
- Application lockfile: direct HTTPS branch dependency resolving exact commit `68cd4c597171cc271019da64c73cc07784bcd450`.
- No Citizen source is patched in this application or its images.

The HTTPS branch name remains in `package.json`; the exact commit in
`package-lock.json` is the reproducible `npm ci` input. Test the upstream commit before
refreshing the application lockfile and confirm both commits match. Do not let npm
normalize the dependency to GitHub shorthand or an SSH URL, because the image build
has neither an SSH client nor credentials.

## Revised configuration mapping

The revised module restores a namespace boundary: Citizen framework configuration is
the `citizen` member, while typed application configuration is exposed alongside it.

| Citizen 1.x source | Citizen 2.0/application target | Notes |
| --- | --- | --- |
| `host` | Removed | Deployment selection comes from each deployment's `.env` and Compose files. |
| `citizen.http.hostname` | `citizen.config.js` `citizen.http.hostname` | Set to `''`; development and production both run Citizen behind Docker Nginx. |
| `citizen.http.port` | `citizen.config.js` `citizen.http.port` | Typed number `8080` in both containers. |
| `citizen.layout.controller` | `citizen.config.js` `citizen.layout.controller` | Exposed as `app.config.citizen.layout.controller`. |
| `citizen.templateEngine` | `citizen.config.js` `citizen.templateEngine` | Exposed as `app.config.citizen.templateEngine`. |
| Startup mode | `.env` `NODE_ENV` | `development` on the Mac; `production` on the production Docker host. |
| Docker Desktop source watcher | `citizen.config.js` `citizen.development.watcher` | Poll every 500 milliseconds in development. |
| Log rotation watcher | `citizen.config.js` `citizen.logs.watcher` | Poll bind-mounted development logs; use the normal production watcher on the named volume. |
| `citizen.cors` | Do not migrate without a real cross-origin browser consumer | The initial implementation preserved the global policy. The completed follow-up removed it and `CORS_ALLOW_ORIGIN`; cross-origin requests/preflights now receive `403` with no allow headers. |
| `db.*` | `citizen.config.js` top-level `db` | Keep host, port, pool size, and timeout typed. Read database and role names from `.env` because Compose also supplies them to PostgreSQL. |
| Database password | Development `.env`; production Compose secret | Development reads `DB_PASSWORD`; production reads the file at `DB_PASSWORD_FILE`. |
| PostgreSQL server timezone | `.env` `POSTGRES_TIMEZONE` | Passed only to `db` as `TZ` before first initialization. |
| Nonsecret `mail.*` | `citizen.config.js` top-level `mail` | Service, user, sender name, and addresses are typed application configuration. |
| Mail password | Development `.env`; production Compose secret | Development reads `MAIL_AUTH_PASS`; production reads the file at `MAIL_AUTH_PASS_FILE`. |

No CORS configuration is needed for the current same-origin application and BrowserSync
proxy. If a future external browser client is inventoried, add only its required origin,
methods, and route scope; do not restore the legacy global allowance by default.

## Implemented development transition

1. Retested the exact revised upstream commit under Node.js 22 and Node.js 24 and refreshed the direct-HTTPS dependency lock.
2. Changed `citizen.config.js` to export `{ citizen, db, mail }`, keeping stable typed values in source and secrets out of `app.config`.
3. Restored framework consumers to `app.config.citizen.*` and view consumers to `config.citizen.*`.
4. Constructed the PostgreSQL pool from `app.config.db`, adding only the environment-appropriate password at startup.
5. Constructed the production mail transport and contact messages from `app.config.mail`, adding only the password from the production secret file.
6. Moved the application-owned cache buster out of the helper toolbox and into `app.start({ cacheBuster })`; the revised Citizen API accepts application configuration there and rejects a `citizen` override.
7. Bind-mounted the protected project-root `.env` read-only at `/site/.env` in development. Citizen now loads it natively before importing `citizen.config.js`; Compose still maps only the database inputs required by PostgreSQL.
8. Removed stable DB/mail settings from `.env` and `.env.example`. The remaining file contains secrets and deployment-specific inputs.
9. Kept production's narrower model: Compose will inject only the remaining nonsecret allowlist and give the app/database their service-scoped password secrets. Production will not mount or inject the whole `.env`.
10. Consolidated the development and production entrypoints into `app/start.js`. Citizen's resolved mode selects only the differing mail and password-delivery behavior; both Docker targets now use the same command.

The implemented module shape after the CORS cleanup is:

```js
export default {
  citizen: {
    development: {
      watcher: {
        interval: 500,
        usePolling: true
      }
    },
    http: {
      hostname: '',
      port: 8080
    },
    logs: {
      watcher: {
        interval: 60000,
        usePolling: process.env.NODE_ENV === 'development'
      }
    },
    layout: {
      controller: '_layout'
    },
    templateEngine: 'handlebars'
  },
  db: {
    host: 'db',
    port: 5432,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    max: 180,
    connectionTimeoutMillis: 10000
  },
  mail: {
    service: 'SendGrid',
    auth: { user: 'apikey' },
    name: 'Jay Sylvester',
    address: 'jay@jaysylvester.com',
    addressNoReply: 'noreply@jaysylvester.com'
  }
}
```

BrowserSync uses its independent development-only `BROWSERSYNC_ORIGIN`; it is not an
application CORS input.

## Application behavior retained

- The shared start file uses `app.config.citizen.directories.app` and calls `app.start({ cacheBuster })`.
- Its PostgreSQL pool uses `app.config.db`; mode selects direct development password delivery or the production password secret file.
- Mode also selects the development mail logger or production transport. The production transport and contact controller use `app.config.mail`; secrets remain outside application configuration.
- Development logging and PostgreSQL pool errors use the documented `app.log()` export.
- Framework mode reads use `app.config.citizen.mode` in JavaScript and `config.citizen.mode` in views.
- Legacy JSON was archived and removed from the active checkout before image builds; Citizen rejects it if it reappears.
- Development mounts the whole `app/` directory and editor-visible root `logs/` directory without masking image-owned `node_modules`.
- Continuous app/proxy HTTP health checks remain absent; PostgreSQL readiness and explicit smoke tests cover the actual needs.
- Contact owner mail is awaited; a confirmation-only failure is logged without returning an error that encourages a duplicate owner submission.

## Verification state

- Citizen's 38-test native suite passed under Node.js 22 and Node.js 24 at commit `68cd4c597171cc271019da64c73cc07784bcd450`; the application lock resolves that commit through HTTPS.
- Development and production Docker targets built successfully with `npm ci` from the refreshed HTTPS lockfile.
- Development startup reported `Loaded project environment: /site/.env`, loaded `/site/citizen.config.js`, and ran in development mode on port `8080`.
- The protected development `.env` was readable by the fixed non-root app user through its read-only bind at mode `0600`, without placeholder values.
- ESLint passed for `app/`, `citizen.config.js`, and `gulpfile.js` inside the development image.
- Before the CORS cleanup, the route/static/CORS smoke test passed against the preserved legacy allowance after the full rebuild and again after a restart of only `app`, confirming that bind-mounted `.env` and config-module changes do not require image or container recreation.
- A development contact submission redirected to confirmation and wrote both the owner and confirmation messages through the local mail logger, exercising `app.config.mail`.
- A focused production-target startup used the explicit nonsecret environment allowlist and empty dummy secret-file paths, reported no project `.env`, loaded the config module, and started in production mode. Phase 2 will repeat the test with separate nonempty dummy Compose secrets. The temporary container and review image were removed afterward.
- After entrypoint consolidation, the rebuilt development container inherited `node app/start.js`; ESLint, the route/static/CORS smoke test, and a development contact-log submission passed. The production target built and the same command started successfully in production mode through the secret-file branches. Temporary review resources were removed.
- The completed CORS cleanup removed the global policy and `CORS_ALLOW_ORIGIN`, separated BrowserSync onto `BROWSERSYNC_ORIGIN`, and rebuilt all affected services. Ordinary routes, ESLint, BrowserSync client/polling access, and cross-origin GET/preflight assertions passed; both cross-origin cases returned `403` with no `Access-Control-Allow-*` headers. The production target built and started without a CORS input, and its temporary review resources were removed.
- Earlier PostgreSQL restore/data comparison, trusted HTTPS, watchers, BrowserSync, contact logging, lifecycle persistence, and isolated backup/restore results remain evidence for unchanged portions of the stack.

## Phase 2 requirements

- Select the revised locked Citizen commit; do not refresh the branch during deployment.
- Build the production image with the same committed `citizen.config.js`.
- Create the protected production `.env` with `NODE_ENV=production`, database/role names, passwords, and PostgreSQL initialization inputs. Do not add the development-only BrowserSync origin or the retired CORS origin. Stable typed DB/mail values do not belong in it.
- Use `.env` for Compose interpolation and secret sources only. Define each top-level secret with the literal source-variable name (`environment: DB_PASSWORD` and `environment: MAIL_AUTH_PASS`), not an interpolated password. Explicitly inject `NODE_ENV`, `DB_DATABASE`, and `DB_USER` into `app`; set `DB_PASSWORD_FILE` and `MAIL_AUTH_PASS_FILE`; grant only the matching secrets.
- Give `db` only its explicit `POSTGRES_*` inputs and `POSTGRES_PASSWORD_FILE`. Do not give application values or secrets to `assets` or `proxy`.
- Do not mount or inject the production `.env` wholesale.
- Perform one focused production-target startup with dummy secret files before deployment, then repeat it with the final Compose definition during Phase 2 review.

## Reusable lessons

- Use one namespace per concern: Citizen settings belong under `citizen`, typed nonsecret application settings belong beside it, and secrets stay outside `app.config`.
- Treat legacy CORS as behavior to justify, not a setting to copy mechanically. With no real cross-origin browser consumer, leave `citizen.cors` unset and verify Citizen rejects cross-origin requests and preflights while same-origin traffic continues normally.
- Let Citizen load a development `.env` natively when that developer experience is wanted. A read-only `/site/.env` bind means ordinary `.env` edits need only an app restart; password changes may additionally require updating PostgreSQL state.
- Keep production narrower. Use its protected `.env` only for Compose interpolation and secret sources, explicitly inject the few nonsecret inputs required by the config module, and mount password secrets only into their consumers.
- `CITIZEN_APP_PATH` is the sole framework-owned environment variable and must be set before import; the conventional `/site/app` layout does not need it.
- Pass application-only runtime values through `app.start(options)`. Do not put a `citizen` member there; framework configuration comes from `citizen.config.js`.
- Preserve the direct HTTPS dependency string and exact lockfile commit. GitHub shorthand can resolve to SSH, which breaks unauthenticated image builds.
- Do not add a generic environment accessor or validation policy merely to wrap direct configuration reads.
- Bind-mount the whole `app/` directory in development so entrypoint changes cannot be hidden behind a stale image, while leaving Linux `node_modules` image-owned.
- Keep development logs editor-visible, logical PostgreSQL backups protected outside Docker, and normal stop/destroy commands volume-preserving.
- Terminate development TLS only at Nginx. Keep BrowserSync on the private Compose network and proxy it under the trusted site origin.
- Treat development and production caching as separate policies. Development uses `no-store`; derive production caching from the effective production Nginx capture, never from `dev.conf`.
- Recreate Nginx after recreating the app—or development assets—because workers may retain a removed container's IP. A simple app restart preserves its container IP and does not require proxy recreation.
- Do not add continuous app/proxy probes without a concrete alerting or recovery consumer.
