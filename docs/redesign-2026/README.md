# Redesign 2026 — Implementation Handoff

Status: design accepted 2026-08-12. Dark mode added 2026-08-13. This directory is the design record for the
visual refresh and information-architecture change to jaysylvester.com. It does
not authorize schema changes, content rewrites, or infrastructure work beyond
what is required to render these pages.

Target: implement these designs in the existing Citizen application — Handlebars
views under `app/views/`, SCSS under `web/source/scss/`, PostgreSQL content
under the existing `case_studies`, `screens`, and `work_history` tables.

## 1. About the design files

The `.dc.html` files in this directory are **design references authored in
HTML**. They are prototypes that show intended layout, type, color, and hover
behavior. They are not production code and must not be copied into `web/` or
served.

Implement them as ordinary Handlebars views and SCSS partials using this
project's established patterns. Specifically:

- Markup belongs in `app/views/`, following the existing `_layout.hbs` /
  `_header.hbs` / `_footer.hbs` / per-controller view structure.
- Styling belongs in `web/source/scss/`, following the existing per-controller
  file convention (`index.scss`, `case-studies.scss`, `resume.scss`, plus the
  shared `global.scss`, `baseline.scss`, `_header.scss`, `_footer.scss`,
  `_screens.scss`). The prototypes use inline styles only because of how they
  were authored; **do not carry inline styles into the implementation.**
- Content continues to come from PostgreSQL through the existing models. The
  prototypes hard-code copy so they can be read standalone.

Opening the files: `Site Pages 1b.dc.html` is the entry point and expects
`support.js` as a sibling. Open it directly in a browser. It is a
horizontally-scrolling canvas; each page mockup is a labeled card.

## 2. Fidelity

**High fidelity.** Colors, type sizes, weights, letter-spacing, spacing,
borders, and transition timings are final and are specified exactly below and in
the prototype markup. Recreate them precisely.

Two areas are deliberately unfinished and are called out in section 9: Flisk
case study imagery, and the Rockerbox screen set.

## 3. What changes structurally

The current site is About / Case Studies / Work Samples / Résumé / Contact with
a fixed left sidebar carrying the primary nav.

The redesign is:

| Page | Route | Change |
| --- | --- | --- |
| Home | `/` | Was the bio plus a rotating endorsement carousel plus one featured case study. Now carries the About copy, two featured case studies, the full engagement index, and all eight endorsements as static text. |
| Case Studies | `/case-studies` | Seven case study summaries, each with a hero image. |
| Gallery | `/gallery` | Replaces Work Samples. All twelve documents, then the screen gallery. |
| Case study detail | `/case-study/{company}` | Screens lead, then the writing, with a persistent right sidebar. |
| Résumé | `/resume` | Absorbs the Skills Overview that was on About. Leads with the résumé PDF's summary paragraph. |
| Contact | `/contact` | Same fields, laid out on the new grid. |
| citizen | new route | New page for the open source framework. Linked from the rail and from the mobile menu. |
| Image zoom | overlay | Bullet-dot nav replaced by a horizontally scrolling, snapping track. |

Removed: the standalone About page. Its bio moved to Home; its Skills Overview
moved to Résumé. The nav item labeled "About" points at `/`.

Removed: the endorsement carousel. It was rejected for its click-only dot
controls and lack of touch support. Endorsements are now static two-column text
on Home.

Removed: the standalone Work Samples page. Its twelve documents and its screen
gallery become the new Gallery page, which is in the primary nav after Case
Studies.

### Case study sort order

Preserve the current site's order, with Flisk inserted first:

Flisk, Rockerbox, Linode, Vidyo, Fitly, hibu, Abercrombie & Fitch, OncoTracker.

## 4. Page chrome

Every page shares a header, a left rail, and a footer.

### Header

A two-column grid: `280px minmax(0,1fr)`, `border-bottom: 1px solid #1F3C63`.
No `align-items` — cells stretch to full header height so the internal divider
runs edge to edge.

- Left cell: "Jay Sylvester" as a link to `/`. IBM Plex Mono 13px / 500 /
  `letter-spacing: .08em` / uppercase, `#14181F`, `padding: 20px 32px`,
  `display: flex; align-items: center`. Hover `#1F3C63`, `transition: color 160ms ease`.
- Right cell: `display: flex; align-items: stretch; justify-content: space-between;`
  `border-left: 1px solid #E2DDD2`. This border is the one that must align with
  the rail border below it.
  - Nav, left-aligned: About / Case Studies / Gallery / Résumé / Contact. IBM Plex Mono
    12px / `.1em` / uppercase, `padding: 20px 24px`, `display: flex; align-items: center`.
    Inactive `#4A4F58` with `border-left: 1px solid #E2DDD2` (omitted on the
    first item); hover `background: #F1EEE7; color: #1F3C63`,
    `transition: background 160ms ease, color 160ms ease`. Active item is
    `color: #FCFBF8; background: #1F3C63` and carries no hover transition.
  - Contact links, right-aligned: LinkedIn / GitHub / X. IBM Plex Mono 11.5px /
    `.1em` / uppercase, `#4A4F58`, `padding: 16px 12px`, `gap: 9px` between
    glyph and label, `gap: 4px` between links, container `padding: 0 20px`.
    Hover `#1F3C63`, `transition: color 160ms ease`. Glyphs are the real brand
    marks as inline SVG at 15px (X at 14px), `fill: currentColor`, so they
    inherit the hover color. The SVG paths are in the prototype markup.

citizen is intentionally **not** in the desktop nav; the rail covers it. It *is*
in the mobile menu, because the rail is hidden there.

### Left rail

`Site Rail.dc.html`. 280px, `background: #FCFBF8`, `padding: 48px 32px`,
`position: sticky; top: 0`, sections separated by `gap: 36px`.

Sections, in order: Currently, Competencies, Case studies, Open source.

Each section header is IBM Plex Mono 10.5px / `.14em` / uppercase / `#6B6558`
with `padding-bottom: 10px; border-bottom: 1px solid #E2DDD2`. Section body
starts at `margin-top: 12px`, 13.5–14px, `line-height: 1.4–1.55`.

The Case studies section lists all eight companies as links in the sort order
above, `#1F3C63`, hover `opacity: .6`, `transition: opacity 160ms ease`. The
Open source section is a sentence with `citizen` as a 600-weight link.

The rail carries no primary nav and no active-state marker. That was
prototyped and rejected — the header owns wayfinding.

**Rail border, important.** The 1px `#E2DDD2` vertical rule between rail and
content must be `border-left` on the `<main>` element, not `border-right` on the
rail. `main` is the stretched grid item and reaches the full page height; the
rail does not, because it is sticky and sized to its content. Earlier attempts
using the rail's own border, or a background gradient on the grid container,
both failed. The header's matching rule is `border-left` on the header's right
cell, which puts both lines at the same x.

### Footer

`padding: 24px 32px`, `border-top: 1px solid #E2DDD2`, IBM Plex Mono 11.5px /
`.06em` / `#6B6558`. Copyright left, LinkedIn / GitHub / Source right at
`gap: 26px`, `#57534A`.

## 5. Page detail

Container for all pages: `background: #FCFBF8`, body grid
`grid-template-columns: 280px minmax(0,1fr)`.

### Home (`2f`, mobile `3b`)

1. **Lede block.** `padding: 64px 56px 56px`, `border-bottom: 1px solid #E2DDD2`.
   Opening statement at `max-width: 900px`, 30px / 300 / `line-height: 1.35` /
   `letter-spacing: -.015em`. Two supporting paragraphs at `max-width: 760px`,
   16px / `line-height: 1.65` / `#3D4148`, `margin-top: 24px` then `20px`.
   Then two buttons at `gap: 12px`, `margin-top: 32px`:
   - Primary: `background: #1F3C63`, `color: #FCFBF8`, `padding: 12px 22px`,
     IBM Plex Mono 12px / `.08em` / uppercase, hover `opacity: .85`. Leading
     13px document glyph, `gap: 10px`.
   - Secondary: `border: 1px solid #1F3C63`, `color: #1F3C63`, hover
     `background: #EEF1F6`. Leading envelope glyph, labelled "Get in touch" and
     pointing at `/contact`. The e-mail address appears nowhere on the site —
     the contact form is the only mail path.
2. **Two featured case studies.** Two-column grid,
   `border-top: 1px solid #1F3C63`, `border-bottom: 1px solid #E2DDD2`. Each
   cell `padding: 32px`, first has `border-right: 1px solid #E2DDD2`. Image at
   `aspect-ratio: 16/10`, `object-fit: cover`, `object-position: top`,
   `border: 1px solid #E2DDD2`. Title 21px / 600 / `-.01em` at
   `margin-top: 22px`; summary 14.5px / `line-height: 1.55` / `#3D4148`;
   expertise line IBM Plex Mono 11px / `.05em` / `#6B6558`, dot-separated.
3. **Engagement index.** Rows of
   `grid-template-columns: 220px minmax(0,1fr) 210px 120px`,
   `padding: 24px 32px`, `border-bottom: 1px solid #E2DDD2`. Company 15px/600,
   role 14px/`#3D4148`, domain 13.5px/`#57534A`, status right-aligned in
   IBM Plex Mono 11px — `Read →` in `#1F3C63` when a case study exists, `—` or
   `Soon` in `#6B6558` when it does not. No column headers, no dates, no section
   title. The 32px horizontal padding aligns row text with the featured cards
   above.
4. **Endorsements.** `padding: 44px 56px 38px`, `border-top: 1px solid #1F3C63`.
   Header row is the mono label plus a `1px #E2DDD2` flex rule plus a
   right-hand note. Two-column grid, `gap: 36px 48px`, `margin-top: 28px`.
   Each quote 15px / `line-height: 1.6` / `#2A2E35`. Separators are
   `border-top: 1px solid #E2DDD2` with `padding-top: 32px`; the **first two
   have no top border** because the section header already provides one. The
   32px top padding against 36px row gap is deliberate and was tuned by eye —
   do not "correct" it to match.

All eight endorsements appear, verbatim.

### Case Studies (`2b`, mobile `3c`)

1. **Intro.** `padding: 56px 56px 40px`, 26px / 300 statement plus a line
   pointing at Contact.
2. **Seven case study summaries.** Each is a link,
   `grid-template-columns: minmax(0,1fr) 420px`, `gap: 40px`,
   `padding: 40px 32px`, `border-bottom: 1px solid #E2DDD2`, hover
   `background: #F4F1EA`.
   - Left: meta row (company / vertical · platform) in IBM Plex Mono 10.5px /
     `.14em` / uppercase / `#6B6558`; title 24px/600; teaser 16px italic
     `#57534A`; summary 15px / `line-height: 1.6` / `#3D4148` at
     `max-width: 620px`; expertise line; `Read the case study →` in mono 12px /
     `.08em` / uppercase / `#1F3C63`.
   - Right: a single hero image, `aspect-ratio: 16/10`, `object-fit: cover`,
     `object-position: top`. Roughly half the summary column's width so image
     and text block are about equal height.
   - Hover raises the image, not the card: the anchor carries
     `data-hover-card`, and the rule is
     `a[data-hover-card]:hover img { transform: translateY(-3px); box-shadow: 0 18px 40px -24px rgba(26,29,34,.5) }`
     with `transition: transform 180ms ease, box-shadow 180ms ease` on the
     image. Background and shadow therefore animate together from one hover
     target.
   - The last summary carries **no bottom rule** — nothing follows it, and the
     footer's own top border closes the page. Same on mobile.

### Gallery (`2h`, mobile `3g`)

Replaces Work Samples. In the primary nav directly after Case Studies.

1. **Intro.** `padding: 56px 32px 40px`, `border-bottom: 1px solid #1F3C63`,
   26px / 300 statement plus a line pointing at Contact.
2. **Artifacts.** `padding: 40px 32px`. Section label with a flex rule beside
   it, right-hand note "Audits & recommendations, process artifacts, etc."
   Two-column grid of rows, each `display: flex; justify-content: space-between`,
   `padding: 13px 0`, `border-top: 1px solid #E2DDD2`, title 14.5px `#1F3C63`,
   file type in mono 10.5px `#6B6558`. All twelve documents.
3. **Screens.** `border-top: 1px solid #1F3C63`, `padding: 48px 32px 56px`.
   Label "High-fidelity mockups and prototypes" with the existing explanatory
   paragraph. Four-column grid, `gap: 12px`, thumbnails at `aspect-ratio: 4/3`,
   `object-fit: cover`, `object-position: top`. Each thumbnail carries
   `data-zoom` and opens the zoom overlay (section 5a).

   On mobile the screens go **one per row** at `aspect-ratio: 16/10` rather than
   a grid of crops, so each is legible at phone size.

### Case study detail (`2c`, mobile `3d`)

1. **Title block.** `padding: 44px 56px 36px`. Back link, then h1 at 38px / 600 /
   `line-height: 1.15` / `-.02em`, then the teaser at 20px / 300.
2. **Meta strip.** Three equal columns — Vertical, Platform, Expertise —
   each `padding: 20px 24px` with `border-right: 1px solid #E2DDD2` between,
   first and last taking 32px outer padding. No Years column.
3. **Featured screens.** `padding: 0 56px 40px`, two-column grid, `gap: 12px`.
   **Exactly two screens**, matching mobile — the rest live in the sidebar's
   "All screens" grid and on the Gallery page.
4. **Body.** `grid-template-columns: minmax(0,1fr) 340px`, `gap: 56px`,
   `padding: 52px 56px 56px`.
   - Article: 17px / `line-height: 1.7` / `#2A2E35`. Section headings are
     IBM Plex Mono 13px / 500 / `.14em` / uppercase / `#1F3C63` with
     `border-bottom: 1px solid #1F3C63` and `padding-bottom: 12px`. Figures get
     a 14px `#57534A` caption at `margin-top: 12px`. Numbered lists use a 24px
     mono index column.
   - Sidebar: an "In this study" panel (`border: 1px solid #E2DDD2`,
     `background: #F7F5F0`, `padding: 24px`), an "All screens" 2-up thumbnail
     grid, and a contact line.
5. **Prev/next.** Two cells, `border-top: 1px solid #1F3C63`, `padding: 32px`,
   hover `background: #F4F1EA`. Each shows the direction label in mono, the
   case study title at 19px/600, and its teaser line.

### Résumé (`2d`, mobile `3e`)

1. **Header.** `padding: 56px 56px 40px`, `border-bottom: 1px solid #1F3C63`.
   The summary paragraph from the PDF at 26px / 300, the contact line in mono
   12.5px, and a Download PDF button (primary treatment, download glyph).
2. **Core competencies.** Five rows, each
   `grid-template-columns: 200px minmax(0,1fr)`, in a two-column grid at
   `gap: 24px 48px`.
3. **Work History.** Section label with a flex rule beside it, matching the
   other section headers. Rows are
   `grid-template-columns: 150px minmax(0,1fr)`, `gap: 40px`, dates in mono
   12.5px `#6B6558`. Separators are **inset to the content column**, matching
   the competencies section — not full-bleed, because the rows are one section.
   No gap or rule above the first row. The Earlier block (four pre-2010 roles as
   plain lines) belongs inside this section, above the closing
   `1px #1F3C63` rule.
   Rows with a case study carry a `Read the case study →` link.
4. **Open source + Education.** Two columns split by
   `border-right: 1px solid #E2DDD2`.
5. **Tools & technologies.** Wrapping chips, `padding: 5px 10px`,
   `border: 1px solid #E2DDD2`, IBM Plex Mono 11.5px.

### Contact (`2e`, mobile `3f`)

Channels and a form on the grid, using the same field inventory as the current
contact view. Buttons follow the primary/secondary treatment above.

Channels are **LinkedIn, GitHub, X** — no e-mail row, because the form is the
mail path. On desktop the form sits left with channels in a right column split
by `border-left: 1px solid #E2DDD2`; on mobile the **channels come first**, above
the form, carrying the closing `1px #1F3C63` rule.

### citizen (`2g`)

New page. Content is summarized from the repository README at
`github.com/jaysylvester/citizen`.

1. **Header.** `padding: 56px 56px 44px`, `border-bottom: 1px solid #1F3C63`.
   Mono eyebrow, h1 at 40px/600/`-.02em`, the framework's own description at
   22px/300, a supporting line, then GitHub and npm buttons.
2. **Philosophy + Quick start.** `grid-template-columns: minmax(0,1fr) 400px`,
   `gap: 56px`. Three paragraphs at 17px/1.7 beside a `#F4F1EA` panel holding a
   four-line `<pre>` in mono 12.5px.
3. **Capabilities.** Two-column grid of ten items, each
   `padding: 18px 0; border-top: 1px solid #E2DDD2`, 15px/600 title over a
   14.5px description.

### Image zoom overlay (`6a`, `6b`, `6c`)

Replaces the current bullet-dot zoom nav, which was rejected for being
click-only and unusable by touch.

Scrim is Ink `#14181F`. All chrome text is `rgba(252,251,248,0.62)` (7.3:1) in
IBM Plex Mono, hover to full `#FCFBF8`.

**Chrome, identical in both states.** A top bar, `border-bottom: 1px solid
rgba(252,251,248,0.16)`: the counter left at 11.5px / `.12em` / uppercase;
"Open in new tab" and a close button right. The close target is **48×48**.

**Single image (`6a`).** No counter, no track. The image is centred and scaled
to fill the frame with 32px of padding, caption beneath.

**Multiple images (`6b` desktop, `6c` mobile).** A horizontally scrolling track:
`display: flex`, `overflow-x: auto`, `scroll-snap-type: x mandatory`, each
`<figure>` `scroll-snap-align: center`. Slides are 1100px on desktop (next image
peeks ~290px) and 320px on mobile (peeks ~37px), so more content is always
visibly implied. Captions sit under each slide.

Beneath the track, a position bar replaces the bullets: a full-width
`rgba(252,251,248,0.16)` 2px rule with a `#FCFBF8` fill `100/n` percent wide,
offset by scroll position. It reports position and is **not** a click target.

Three pieces of JS are needed beyond opening the overlay:
- a wheel handler mapping vertical delta to horizontal `scrollLeft`, since a
  mouse wheel will not scroll the track natively;
- arrow-key handling via `scrollTo` (never `scrollIntoView`);
- a scroll listener or `IntersectionObserver` to update the counter and bar.

Touch, trackpad, momentum, and rubber-banding all come free from the native
scroller — the current bullet nav has none of them.

**The flex column holding the track needs `min-height: 0`.** Without it the
column reports its content height inside the fixed-height overlay and the last
row shears off.

### Dark mode (`7a`–`7d`)

Mocked up on two desktop pages (home, case study) and two mobile pages (home,
contact) — between them every element class appears. **Dark mode is a token swap
only**: no layout, spacing, type, or copy changes, so it should be implemented as
a second set of custom-property values under `prefers-color-scheme: dark` (plus a
manual override if you want a toggle), not as a parallel stylesheet.

| Role | Light | Dark |
| --- | --- | --- |
| Page | `#FCFBF8` | `#14181F` |
| Raised surface (sidebar boxes, form fields, image mats) | `#F7F5F0` | `#1A1F27` |
| Row / card hover | `#F4F1EA` | `#1E242D` |
| Secondary button hover | `#EEF1F6` | `#233044` |
| Hairline rule | `#E2DDD2` | `#2E343E` |
| Soft hairline (document rows) | `#EDE9E0` | `#262C35` |
| Card border | `#D8D2C6` | `#343B45` |
| Placeholder border | `#C9C3B6` | `#3A414B` |
| Heading / high-emphasis text | `#14181F` | `#F2F1EE` |
| Body text | `#3D4148` | `#B4B9C1` |
| Body text, higher emphasis | `#2A2E35` | `#C9CDD4` |
| Nav idle | `#4A4F58` | `#A8AEB7` |
| Muted / caption | `#57534A` | `#9BA0A8` |
| Mono section label | `#6B6558` | `#8B9098` |
| Text on filled navy | `#FCFBF8` | `#F2F1EE` |

**Navy splits three ways.** `#1F3C63` cannot survive the swap as a single value —
as a link on a dark page it lands at 2.1:1. It becomes:

| Use | Dark value | Contrast |
| --- | --- | --- |
| Link and active-state text | `#8FB6EC` | 7.4:1 on `#14181F` |
| Section rule (the heavier `1px` divider) | `#3E5C86` | reads as a divider, not a link |
| Filled button / active nav background | `#2C4E7E` | holds `#F2F1EE` at 8.1:1 |

Shadows deepen from `rgba(26,29,34,·)` to `rgba(0,0,0,·)` at slightly higher
alpha, since the light-mode values disappear against a dark page.

**Product screenshots are not filtered.** They are captures of light-mode product
UI; inverting or dimming them would misrepresent the work. They sit on the dark
page as-is, with their borders following the card-border token.

## 6. Design tokens

### Color

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#FCFBF8` | Page background |
| Panel | `#F7F5F0` | Sidebar panels |
| Wash | `#F4F1EA` | Row/card hover, featured-screen band, code panel |
| Wash alt | `#F1EEE7` | Nav item hover |
| Tint | `#EEF1F6` | Secondary button hover |
| Ink | `#14181F` | Headings, primary text |
| Ink 2 | `#2A2E35` | Long-form body |
| Ink 3 | `#3D4148` | Secondary body |
| Ink 4 | `#4A4F58` | Inactive nav |
| Ink 5 | `#57534A` | Tertiary, captions, teasers |
| Mono | `#6B6558` | Mono labels and metadata |
| Navy | `#1F3C63` | Links, active nav, buttons, section dividers |
| Rule | `#E2DDD2` | Standard 1px rule |
| Rule light | `#EDE9E0` | Rules inside dense lists |
| Card border | `#D8D2C6` | Mockup card edge |

Two rule weights carry meaning and must not be interchanged: `#1F3C63` divides
major sections (summary / work / endorsements), `#E2DDD2` divides items within
a section.

### Type

Public Sans 300 / 400 / 500 / 600, IBM Plex Mono 400 / 500.

```
Google Fonts:
family=IBM+Plex+Mono:wght@400;500
family=Public+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400
```

| Role | Spec |
| --- | --- |
| Page h1 | 38–40px / 600 / 1.15 / `-.02em` |
| Lede | 30px / 300 / 1.35 / `-.015em` |
| Section lede | 26px / 300 / 1.4 / `-.01em` |
| Case study title | 24px / 600 / `-.01em` |
| Card title | 21px / 600 / `-.01em` |
| Sub-head | 19px / 600 |
| Long-form body | 17px / 1.7 |
| Body | 15–16px / 1.6–1.65 |
| Dense body | 14.5px / 1.55 |
| Section label | mono 10.5px / `.14em` / uppercase |
| Nav | mono 12px / `.1em` / uppercase |
| Contact link | mono 11.5px / `.1em` / uppercase |
| Button | mono 12px / `.08em` / uppercase |
| Metadata | mono 11–12.5px / `.05–.06em` |

`text-wrap: pretty` is applied to paragraphs and headings.

### Motion

- Color, background, opacity: `160ms ease`.
- Transform and shadow: `180ms ease` (200ms on figure zooms).
- Hover lift, cards: `translateY(-3px)` + `0 18px 40px -24px rgba(26,29,34,.5)`.
- Hover lift, thumbnails: `translateY(-2px)` + `0 12px 28px -18px rgba(26,29,34,.55)`.

No entrance animations, no scroll-triggered reveals, no carousels.

## 7. Responsive behavior

Six widths are mocked up for the home page: 390, 768, 1024, 1440, 1920, and
2560. Breakpoints are therefore **768 / 1024 / 1440 / 1920**. Other pages follow
the same rules.

The rule established during review: **copy and elements are identical across
viewports.** Only CSS and JS may differ. Do not render different markup,
different section labels, or different link text per viewport. The one
concession is at 1024, where the header's contact-link labels are hidden with
CSS while their glyphs remain — the markup is unchanged.

### 390px — mobile (`3a`–`3g`)

- Header collapses to the wordmark plus a hamburger. Nav becomes a full-screen
  overlay on `#1F3C63` (`3a`): About, Case Studies, Gallery, Résumé, Contact at 24px/600
  with `rgba(252,251,248,.18)` separators, then the Open source block reproduced
  exactly as it appears in the rail (mono label, rule, citizen link, same
  sentence), then LinkedIn / X / GitHub.
- The left rail is hidden. Its content duplicates material that appears on the
  pages themselves, so nothing is lost. citizen is reachable from the mobile nav
  for that reason.
- The 280px + 1fr grid becomes one column. Multi-column grids collapse to one.
  Section order can be adjusted with `order` where needed.
- Case study meta strip becomes a two-up.
- Gallery screens go one per row at `aspect-ratio: 16/10`.
- Contact puts the channel list above the form.
- Résumé work history moves the date above each role rather than beside it.
- Touch targets stay at or above 44px.

### 768px — tablet portrait (`5a`)

- Rail stays hidden; nav stays in the overlay. The rail returns at 1024, so the
  switch belongs at roughly 900px.
- One column, section padding 32px, lede drops to 26px.
- Featured case study cards stay 2-up at 24px padding.
- Index rows reflow to two lines: company and status on the first,
  role and domain beneath (`minmax(0,1fr) auto`, `gap: 6px 16px`,
  `padding: 20px 32px`). No column is dropped.
- Endorsements stay 2-up.
- Buttons wrap.

### 1024px — tablet landscape / small laptop (`5b`)

- Rail returns at **240px**, sticky, section gap 28px, padding `40px 24px`.
  Type sizes are unchanged from 1440.
- Full nav visible; item padding drops to 18px. Contact links keep their glyphs
  and hide their labels (CSS only).
- Main padding 40px, lede 28px, featured cards 28px padding.
- Index rows: `150px minmax(0,1fr) 185px 45px` with a **24px `column-gap`**.
  The gap is what separates the columns — do not remove it and widen the tracks
  instead, or the longest company name ("Abercrombie & Fitch") ends up touching
  the role text.
- Endorsements 2-up.

### 1440px — reference (Turn 2)

The specification in sections 4 and 5 describes this width.

### 1920px — large monitor (`5c`)

- Rail widens to **340px**, padding `56px 40px`. Type unchanged.
- Main padding 72px, lede 32px, featured cards 40px padding.
- Index columns widen to `300px minmax(0,1fr) 280px 140px` rather than letting
  the role column absorb all the extra width.
- Endorsements go **3-up**.
- Paragraph measures stay capped at 900px and 760px. Reading width never grows;
  the extra space goes to the rail, the images, and the index.

### Above 1920px — capped (`5d`)

Settled: the layout caps. Mocked up at 2560px (27").

Content caps at 1920px and centres; the rule
under the header and the rule above the footer run the **full window width**, so
the page stays anchored to the window instead of reading as a card floating in
space. Structure:

```
<div class="band band--header">   <!-- full width, border-bottom: 1px #1F3C63 -->
  <header>                        <!-- max-width: 1920px; margin-inline: auto -->
<div class="shell">               <!-- max-width: 1920px; margin-inline: auto -->
  rail + main
<div class="band band--footer">   <!-- full width, border-top: 1px #E2DDD2 -->
  <footer>                        <!-- max-width: 1920px; margin-inline: auto -->
```

The header's own `border-bottom` and the footer's own `border-top` move to the
bands — do not leave them on the elements or the rules will stop at 1920px.
Everything inside is the 1920px specification unchanged. No media query is
needed: below 1920 the caps have no effect.

An uncapped variant was prototyped and rejected: filling the width pushed the
index's role column past 700px for strings around 265px, so company, role, and
domain drifted apart.

**Gutters.** At 1920 the rail padding is `56px 32px` and the footer `24px 32px`,
so the wordmark, rail labels, and footer copy share a 32px left edge; the
header's contact-link wrapper is `0 20px` so its right edge lands at 32px too.
Both edges match the 1440 reference — do not reintroduce a 40px gutter here.

## 8. Data and content notes

- All copy in the prototypes is verbatim from the current site, the résumé PDF
  (included here), or the citizen README. Case study intros and teasers are
  unchanged from the database.
- Screens load from the existing Cloudinary account,
  `res.cloudinary.com/tehinnernets/image/upload/f_auto,q_XX,w_XXX/jaysylvester.com/...`.
  The prototypes request smaller widths than production should — set widths to
  suit the final layout.
- The engagement index and the rail's case study list both need the same
  ordering; drive them from one sort field.
- Rockerbox exists in the production database but not in `resources/data.sql`,
  so its copy could not be read during design. Its summary is a paraphrase and
  **must be replaced with the real record** at implementation.

## 9. Open items

1. **Flisk case study.** No screens were available. The Case Studies page shows
   a hatched placeholder and the index marks it `Soon`. Needs imagery and copy.
2. **Rockerbox.** Screens and the real summary text, per section 8.
3. **Brand glyphs.** LinkedIn, GitHub, and X marks are inline SVG paths in the
   prototype. Confirm they suit you before shipping.
4. **1024px header density.** Five nav items plus three icon-only contact links
   is the tightest the header gets. Check it at implementation and drop the
   labels earlier if needed.
5. **Dark mode entry point.** The mockups assume `prefers-color-scheme`. Decide
   whether a manual toggle is also wanted; if so it needs a home in the header
   or rail, which is not currently designed.
6. **Résumé cohesion.** The PDF is included for reference. The web résumé now
   follows the PDF's structure and summary; if the PDF is revised, keep the two
   in step.

## 10. Files

| File | Contents |
| --- | --- |
| `Site Pages 1b.dc.html` | All mockups, self-contained. Turn 7 (top) is dark mode; Turn 6 is the image zoom; Turn 5 is the home page at 768 / 1024 / 1920 / 2560; Turn 3 is mobile at 390px; Turn 2 is the seven desktop pages at 1440px. |
| `support.js` | Runtime required to open the file in a browser. Not part of the design. |
| `screenshots/` | Flat PNG of every screen, listed below. |
| `Jay-Sylvester-resume.pdf` | Source of the résumé page's content and the type/color direction. |

The rail markup is inlined into each page in `Site Pages 1b.dc.html`, so the
file is self-contained apart from `support.js`. In implementation it should be
a single shared partial, not seven copies.

| Screenshot | Screen |
| --- | --- |
| `01-home.png` | Home |
| `02-case-studies.png` | Case Studies |
| `03-gallery.png` | Gallery |
| `04-case-study.png` | Case study detail |
| `05-resume.png` | Résumé |
| `06-contact.png` | Contact |
| `07-citizen.png` | citizen |
| `10-mobile-menu.png` | Mobile menu |
| `11-mobile-home.png` | Mobile home |
| `12-mobile-case-studies.png` | Mobile case studies |
| `13-mobile-gallery.png` | Mobile gallery |
| `14-mobile-case-study.png` | Mobile case study detail |
| `15-mobile-resume.png` | Mobile résumé |
| `16-mobile-contact.png` | Mobile contact |
| `17-home-768.png` | Home at 768px |
| `18-home-1024.png` | Home at 1024px |
| `19-home-1920.png` | Home at 1920px |
| `20-home-2560.png` | Home at 2560px, capped at 1920 |
| `20-zoom-single.png` | Image zoom, single image |
| `21-zoom-multiple.png` | Image zoom, multiple images |
| `22-zoom-mobile.png` | Image zoom, mobile |
| `23-dark-home.png` | Home, dark |
| `24-dark-case-study.png` | Case study detail, dark |
| `25-dark-mobile-home.png` | Mobile home, dark |
| `26-dark-mobile-contact.png` | Mobile contact, dark |

Screen ids inside `Site Pages 1b.dc.html`:

| Id | Screen |
| --- | --- |
| `2f` | Home |
| `2b` | Case Studies |
| `2h` | Gallery |
| `2c` | Case study detail (shown with Linode) |
| `2d` | Résumé |
| `2e` | Contact |
| `2g` | citizen |
| `3a` | Mobile menu |
| `3b` | Mobile home |
| `3c` | Mobile case studies |
| `3g` | Mobile gallery |
| `3d` | Mobile case study detail |
| `3e` | Mobile résumé |
| `3f` | Mobile contact |
| `5a` | Home, 768px |
| `5b` | Home, 1024px |
| `5c` | Home, 1920px |
| `5d` | Home, 2560px — capped at 1920 |
| `6a` | Image zoom, single image |
| `6b` | Image zoom, multiple images |
| `6c` | Image zoom, mobile |
| `7a` | Home, dark |
| `7b` | Case study detail, dark |
| `7c` | Mobile home, dark |
| `7d` | Mobile contact, dark |
