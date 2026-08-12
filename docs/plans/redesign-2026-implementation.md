# Redesign 2026 implementation plan

Status: implementation-ready. This plan reviews the accepted designs in
`docs/redesign-2026/` against the current Citizen application, development
database, and the rendered development site inspected with Playwright on
2026-08-12. The functional decisions below were approved on 2026-08-12. This
still does not authorize schema changes, unrelated content rewrites, or
production deployment.

## Implementation principles

- Treat the current database as the source of truth for case-study content and
  order. The redesign mockups are the source of truth for presentation, not for
  records, summaries, or ordering.
- Gallery uses the accepted mockup for copy, hierarchy, styling, thumbnail
  treatment, and responsive layout while preserving the complete current screen
  inventory, its project/collection sections, and their existing order.
- Preserve the current `case_studies.sort` order everywhere: Rockerbox, Linode,
  Vidyo, Fitly, hibu, Abercrombie & Fitch, OncoTracker. Do not insert Flisk into
  that sequence until a real `case_studies` record exists.
- Use the existing `case_studies.featured` flags for the two home-page features;
  the development database currently flags Rockerbox and Linode.
- Keep PostgreSQL content in the existing `case_studies`, `screens`, and
  `work_history` tables. Static site copy, navigation, documents, social links,
  résumé extras, and citizen content can remain in views or controller data as
  they do today.
- Implement the designs in the existing Citizen/Handlebars/SCSS/JavaScript
  stack. Do not serve or copy the prototype HTML, its inline CSS, or
  `support.js`.
- Preserve current application behavior except for the functional changes
  explicitly confirmed below.

## Framework and codebase conventions

The application is pinned to Citizen 2.0 commit
`c6610ace80046f294ac85d358a75fd6f3880f6fd`. The implementation should follow
the framework's conventions already used by this project:

- Routes are inferred from `app/controllers/routes/*.js`. A controller's
  default action is `handler`, and its default view matches the controller name.
  The new `/citizen` page therefore needs a `citizen.js` controller, a matching
  view, and a metadata method in `app/models/_head.js`; it does not need router
  registration.
- Controllers return view data under `local` and use Citizen directives for
  includes, redirects, caching, and alternate views.
- The configured `_layout` controller remains the final controller in every
  route chain. It should continue to own page-level chrome and Citizen includes
  for the head, header, and footer.
- Use a Handlebars partial for shared markup that renders caller-provided data.
  Use a Citizen include when a component owns controller/model behavior or
  should be independently requestable. Because the rail loads ordered case-study
  data, implement it as a `_rail` Citizen include with its own controller and
  view rather than a registered partial.
- Access models through `app.models` so Citizen hot module replacement continues
  to work. Keep SQL parameterized, use named prepared queries, obtain clients
  from the shared pool, and release them in `finally`.
- Keep the current module and lint style: ES modules, named exports, single
  quotes, no semicolons, Unix line endings, and browser JavaScript under the
  `JAY` namespace rather than adding a separate client framework.
- Keep Handlebars escaped by default. Triple braces are appropriate only for
  trusted HTML already stored in the portfolio database.
- Keep source styles in `web/source/scss/`, composed through `site.scss`, and
  source scripts in `web/source/js/`; generated `web/min/*` files come from the
  Gulp build.
- Preserve the global request-cache policy and the contact route's explicit
  cache opt-out. Database-backed content will continue to require cache expiry
  or an app restart before an already-cached route changes.

## Verified current-state discrepancies

### Data and content

- The live development database contains seven case studies in the existing
  order listed above. Flisk exists only in `work_history`; it has no case-study
  record or screens. The mockup's Flisk card, rail entry, and `Soon` status are
  therefore illustrative rather than currently implementable portfolio data.
- The redesign handoff describes eight rail entries but also describes seven
  case-study summaries. Rendering the database collection resolves this
  inconsistency and prevents a dead Flisk link.
- The updated handoff says to insert Flisk first, but that conflicts with the
  explicit instruction to preserve the existing order and with the absence of a
  Flisk `case_studies` record. The database remains authoritative: Flisk can
  appear in the engagement index from `work_history`, but not in the case-study
  rail, listing, featured set, or previous/next sequence until it becomes a real
  case study.
- The updated Case Studies intro says there are seven studies while its mockup
  renders eight by including the unavailable Flisk study. The implementation
  will render the seven database records, so the intro count remains accurate.
- The Home mockup illustrates Linode and Vidyo as featured, while the database
  flags Rockerbox and Linode. Per the approved data policy, render Rockerbox and
  Linode in database order and use the mockup only for their presentation.
- The checked-in `resources/data.sql` is not an authoritative snapshot: it lacks
  newer work-history and case-study records, and its old sort values differ from
  the current database. Implementation and tests must not infer current order
  from that seed file.
- The current case-study listing query uses an inner join to featured screens.
  That silently excludes any study without a featured image. The redesign needs
  an explicit policy: published studies come from `case_studies`; images are
  optional presentation data.
- Existing case-study body HTML is richer than the Linode design example. It
  contains `h2`, `h3`, paragraphs, lists, links, strong text, figures, captions,
  nested sections, and project-specific figure classes for prototypes, devices,
  sitemaps, wireframes, pricing CTAs, and usability studies. The new long-form
  CSS must support all of those patterns.
- The design résumé PDF and the PDF currently served at
  `/documents/resume/Jay-Sylvester-resume.pdf` are different files. The current
  public PDF is two pages; the redesign package contains the newer résumé used
  as the web design's content source.

### Information architecture and routes

- `/work-samples` is currently a first-class route and is included in the smoke
  test. The updated redesign renames that page to Gallery at `/gallery`, keeping
  its twelve-document inventory and full grouped screen output while applying
  the mockup's new copy and visuals. `/work-samples` therefore needs an
  intentional permanent redirect to `/gallery`.
- Production currently redirects `/portfolio` to `/work-samples`. That redirect
  should point directly to `/gallery` when Work Samples is retired, avoiding
  a redirect chain.
- `/citizen` currently returns 404 and has no controller, view, metadata method,
  sitemap entry, or smoke-test coverage.
- `web/sitemap.xml` is already stale: it lists legacy `/portfolio` and
  `/work-history` URLs and omits current Rockerbox and Linode case studies. The
  redesign is a good boundary at which to make the sitemap canonical.

### Shared layout and interaction

- The current desktop header is a left-side navigation column, while the redesign
  uses a top header plus a separate sticky information rail. This requires a real
  layout rewrite, not incremental header styling.
- The current desktop `main` element is a viewport-height internal scroller with
  narrow fixed maximum widths. The redesign uses normal document scrolling and a
  `280px minmax(0, 1fr)` page grid with full-width section rules.
- Live measurements confirm the consequence of that shell: at 1440×1000 the
  document is exactly 1000px tall while the Case Studies `main` has 4135px of
  scrollable content. Browser full-page capture therefore sees only the current
  internal-scroll viewport. The rewrite must move the scroll owner back to the
  document and be regression-tested at both page ends.
- The current mobile header always exposes its navigation. The redesign requires
  an accessible full-screen menu with a menu button, close control, focus
  management, Escape handling, background scroll lock, and synchronized
  `aria-expanded` state.
- The current header/footer use a JS monogram, text navigation, and an icon
  sprite. The redesign uses a full wordmark, active header tabs, inline brand
  marks, different social destinations/labels, and a different footer link set.
- The updated redesign now defines 390, 768, 1024, 1440, 1920, and 2560
  references. At 390 and 768 the rail is hidden and navigation uses the mobile
  overlay; at 1024 the rail returns at 240px; at 1440 it is 280px; at 1920 it is
  340px; above 1920 the whole layout caps and centers while header/footer rules
  remain full-window width.
- Playwright confirms the current shell switches abruptly between 1023px and
  1024px: the former is a normally scrolling document with a 248px-tall header,
  while the latter becomes the fixed-height side-nav/internal-scroll layout.
  Include 1023px and 1024px as explicit visual regression widths.
- Current routes do not expose `aria-current` on the active navigation link.
  The redesigned tabs should add it rather than relying on route-specific CSS
  alone.

### Pages

- Home currently has bio copy, an eight-quote JS endorsement carousel, and one
  featured case study. The redesign intentionally replaces the carousel with
  static endorsement content and adds two database-flagged features plus a
  work/engagement index. Remove the carousel controls, rotation behavior, and
  related JavaScript/CSS.
- The mockup's engagement index is a curated/grouped subset of the current
  twelve `work_history` rows. It should not be copied literally; the approved
  implementation renders all existing work-history records in database order.
- Case Studies currently shows minimal cards only. It does not expose all
  metadata, and Work Samples must be renamed and recomposed as Gallery.
- Gallery's twelve mockup thumbnails are illustrative, not a content limit.
  Render every available screen under the existing project/collection section
  headings and in the existing section/screen order. Apply the mockup's grid and
  thumbnail styling within each section.
- The desktop prototype's `All screens →` self-link is unnecessary once every
  screen is rendered and is omitted from production.
- Case-study detail currently renders featured screens, a summary, database HTML,
  all screens, and only a wrapping next-study callout. The redesign adds a title
  block, metadata strip, screen-first layout, right sidebar, and both previous
  and next links.
- The detail-page prose specification lists the metadata strip before featured
  screens, but the accepted desktop screenshot places the two featured screens
  before the strip. Follow the rendered reference: title, two featured screens,
  metadata strip, then article/sidebar.
- The live featured-screen strips extend later images beyond the 390px viewport.
  The redesign resolves that ambiguity: detail pages show exactly two featured
  screens, while the rest appear in the sidebar and Gallery; Gallery uses four
  columns at the reference desktop width and one legible 16:10 image per row on
  mobile.
- Résumé currently has a PDF link, five competencies, database work history, and
  a long static skill inventory. The redesign adds a PDF-derived summary/contact
  header and changes the hierarchy of later sections.
- Contact's fields and server behavior already match the required inventory.
  The visual layout changes, but POST validation, the ten-second bot check,
  owner mail, confirmation mail, error persistence, and confirmation route must
  remain intact.
- The live contact form marks all four user fields required but disables native
  validation and supplies no autocomplete tokens. Keep the server behavior,
  while adding appropriate autocomplete values and ensuring inline errors are
  announced and associated with their fields.
- The new citizen design contains more than the short handoff summary: the
  accepted screenshot also includes production/stability/maintenance facts and
  documentation links. Its copy should be checked against the pinned Citizen
  2.0 README at implementation time rather than copied from the mockup blindly.

## Confirmed functional decisions

1. **Retired Work Samples URL:** return HTTP 301 from `/work-samples` to the new
   `/gallery` route, and update `/portfolio` to point directly to `/gallery`.
2. **Home engagement index:** render all current `work_history` records in their
   existing database order without mockup-only grouping or curation.
3. **Unpublished/no-image studies:** a case study is published when
   it has a `case_studies` record; missing images get a deliberate visual fallback
   but do not remove the record from the listing. Flisk remains a work-history
   entry until its case-study record exists.
4. **Previous/next behavior:** preserve the current wraparound
   behavior and add a matching previous link, both based on the existing sort
   order.
5. **Résumé PDF:** replace the served PDF with the newer file from
   the redesign package when implementing the web résumé so the two stay in
   sync.
6. **Image interaction:** replace the bullet navigation with the accepted zoom
   design: single-image mode when appropriate and a native horizontal snapping
   track for image sets, retaining new-tab, close, keyboard, and focus behavior.
7. **Social links and glyphs:** use the accepted inline LinkedIn, GitHub, and X
   marks, and change `https://twitter.com/JayIsAngry` to
   `https://x.com/JayIsAngry` everywhere it appears.
8. **Responsive shell:** use the supplied 390/768/1024/1440/1920/2560 behavior;
   the compact header/no-rail shell applies below the 1024 layout, with the rail
   restored at 1024 and the overall layout capped at 1920.
9. **Endorsements:** retire the carousel and render all eight existing quotes,
   verbatim and in their existing order, as the static responsive sections in
   the redesign.
10. **Gallery content:** follow the mockup's copy and visual treatment, preserve
    all twelve artifact links, and render all available screens. Retain the
    existing project/collection sections and current ordering; the mockup's
    twelve thumbnails are representative only.

None of these decisions requires a database schema change.

## Phased implementation

### 1. Normalize page data contracts

- Refactor `app/models/case-studies.js` to return ordered arrays rather than
  objects keyed by sort, retaining `sort`, `featured`, all summary metadata, and
  a clearly selected hero/featured-screen collection.
- Make the case-study list originate from `case_studies` with screen data joined
  or attached optionally, so a missing screen does not remove a published study.
- Add focused model methods for the shared rail, featured home studies, and
  ordered previous/next navigation, reusing one `sort` contract.
- Extend the résumé/work-history presentation data only in controllers (formatted
  years, current-role label, link availability); do not alter stored records.
- Load the shared rail through a `_rail` include owned by `_layout`; keep its
  model call in `app/controllers/routes/_rail.js`.

### 2. Build the global design system and shell

- Replace the current font import with Public Sans and IBM Plex Mono at the
  accepted weights. Add the paper/navy/rule color tokens, typography, spacing,
  motion, focus, and button primitives to the shared SCSS.
- Rework `_layout.hbs` around the top header, two-column body shell, rail,
  content, and footer. Put the rail/content divider on `main` as specified.
- Rebuild `_header.hbs` and `_footer.hbs`, including active-route treatment and
  `aria-current="page"`, the accepted inline brand glyphs, and the X destination
  at `https://x.com/JayIsAngry`.
- Add `_rail.scss` and the `_rail` include view. Keep its case-study list
  database-driven and in current sort order.
- Add the mobile overlay markup once in the header and implement its behavior in
  the existing `JAY` namespace. Do not create viewport-specific duplicate page
  content.
- Implement the shared responsive contract: single-column/no rail at 390 and
  768; 240px rail at 1024; 280px rail at 1440; 340px rail at 1920; and a centered
  1920px cap with full-width header/footer bands above that width. Preserve
  identical content and markup across viewports, hiding only the 1024 social
  labels with CSS as specified.
- Add `prefers-reduced-motion` handling without changing the accepted default
  transition timings.

### 3. Rebuild the primary pages

- **Home:** update `index.js` and `index.hbs` to provide/render the two featured
  records, all ordered work-history rows, all eight static endorsements,
  résumé CTA, and contact CTA. Remove `web/source/js/index.js` carousel behavior
  and its associated controls and CSS.
- **Case Studies:** expand the controller to load the seven ordered database
  studies with optional hero media and current record metadata rather than
  prototype summaries. Do not add Flisk or reorder the records to match mockup
  content.
- **Gallery:** add a `/gallery` controller/view by moving the twelve existing
  documents and complete grouped screen collection out of Work Samples. Use the
  mockup's intro, labels, artifact arrangement, rules, spacing, thumbnail
  treatment, and zoom affordance. Preserve every existing screen section and
  its current order, rendering each section as a four-column grid at the
  reference desktop width and one legible 16:10 image per row on mobile.
- **Case-study detail:** return ordered previous and next records, metadata, and
  featured/all-screen collections in one coherent view contract. Recompose the
  view in the accepted screenshot order—title, exactly two featured screens,
  metadata strip, article/sidebar, and navigation—while preserving trusted
  database body HTML and figure behavior.
- **Résumé:** use the newer PDF's summary and the current database work history;
  retain competencies and skills as static view content unless a later content
  model is explicitly requested. Replace the public PDF as the same change.
- **Contact:** preserve controller actions and mail behavior; change only the
  view structure, accessible labels/error presentation, channel list, and SCSS.
  Keep LinkedIn and GitHub, replace Twitter with X, and use the approved x.com
  destination.
- **citizen:** add the zero-configuration Citizen route/controller/view and head
  metadata. Source factual copy and links from the pinned 2.0 README, while
  matching the accepted visual layout.

### 4. Consolidate media behavior

- Rewrite `_screens` partial markup only as far as needed to support hero media,
  detail thumbnails, and Gallery's complete sectioned screen collection without
  duplicating queries. Keep section names, section order, and screen order in the
  Gallery view contract rather than flattening the records.
- Keep Cloudinary transformations responsive to final rendered dimensions;
  supply useful width targets, preserve alt text, and avoid the small prototype
  widths.
- Retain lazy loading and new-tab behavior, and replace the zoom UI with the
  accepted single-image/multiple-image overlay. Multiple-image mode uses native
  horizontal overflow and scroll snapping, a non-interactive progress bar,
  vertical-wheel-to-horizontal mapping, arrow-key navigation via `scrollTo`, and
  scroll-driven counter/progress updates. Touch and trackpad motion remain
  native; the fixed overlay's track column needs `min-height: 0`.
- The current viewer was live-tested: it opens in place with image count,
  new-tab and close controls; Escape closes it and returns focus to the
  triggering thumbnail. Preserve those behaviors while removing bullet controls
  and adding `role="dialog"`, a usable accessible name, modal focus containment,
  background inertness, and scroll locking.
- Verify every project-specific figure class found in current database content.

### 5. Retire routes and update discovery files

- Move the Work Samples controller, view, and stylesheet to Gallery with
  `git mv`, then implement `/work-samples` and `/portfolio` as permanent Nginx
  redirects to `/gallery` in both development and production. The application
  owns only the canonical Gallery route.
- Update `web/sitemap.xml` to canonical current routes: home, case studies, all
  database-backed case-study details, gallery, résumé, contact, and citizen.
  Remove legacy paths that redirect.
- Add citizen metadata and remove obsolete Work Samples metadata only after its
  redirect is in place.
- Update the smoke test route inventory and production redirect assertions.
- Add browser checks for desktop document scrolling, the 1023/1024 shell
  transition, the 1920 cap at 2560, mobile menu keyboard behavior, static
  endorsement layout, Gallery order/layout, zoom scrolling/progress/focus
  handling, and all seven studies in database order.
- Add a favicon (or an explicit empty icon declaration) so normal page loads do
  not produce the current `/favicon.ico` 404 console error.

### 6. Verification and acceptance

- Run ESLint for application/config/Gulp code and browser JavaScript.
- Build CSS/JS from source and confirm generated assets and source maps complete
  without Sass warnings or JavaScript errors.
- Run the development smoke suite, then add focused assertions for `/citizen`,
  `/gallery`, `/work-samples` and `/portfolio` redirect behavior, current
  case-study detail routes, canonical sitemap URLs, static caching, and unchanged
  fail-closed CORS behavior.
- Verify database-driven ordering in the header rail, home features/index, Case
  Studies list, résumé links, and previous/next navigation. No test should encode
  the prototype's Flisk-first list.
- Exercise contact validation, fast-submit bot rejection, successful owner mail,
  confirmation-mail failure handling, redirect, and confirmation rendering.
- Compare every page at 1440px and 390px against the supplied screenshots; check
  Home at the supplied 768, 1024, 1920, and 2560 references; and exercise the
  zoom overlay in desktop single/multiple and mobile modes.
- Complete a keyboard and screen-reader-oriented pass: skip/focus flow, visible
  focus, mobile-menu focus trap and Escape, zoom dialog, form errors, landmarks,
  active navigation, alt text, heading order, touch targets, and reduced motion.
- Test current Chrome, Firefox, and Safari, including iOS-style viewport height
  and safe-area behavior for the full-screen menu.

## Expected file scope

Likely modifications:

- `app/start.js`
- `app/controllers/routes/_layout.js`, `index.js`, `case-studies.js`,
  `case-study.js`, `resume.js`, and `contact.js`; rename `work-samples.js` to
  `gallery.js`; and add `citizen.js`
- `app/models/_head.js`, `case-studies.js`, `resume.js`, and `screens.js`
- shared and page views under `app/views/`, including a new rail include,
  the Work Samples-to-Gallery rename, and a citizen view
- shared and page SCSS under `web/source/scss/`, including new rail, Gallery,
  citizen, and zoom-overlay styles
- `web/source/js/global.js` and removal or simplification of `index.js`
- `web/documents/resume/Jay-Sylvester-resume.pdf`
- `web/sitemap.xml`, `scripts/smoke-test`, and redirects in
  `docker/nginx/dev.conf` and `docker/nginx/production.conf`

Not expected:

- database schema changes
- Citizen framework changes
- new client-side frameworks or build tools
- changes to Docker topology, secrets, mail transport, CORS, TLS, or database
  migration behavior
