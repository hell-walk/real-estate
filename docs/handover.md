# Ratan Galaxy sample site: project hand-over

Written 10 November 2026, on the day the project's author left. It describes the project as it stands, how to run and change it, where every decision is recorded, and what a successor needs to know that the code does not say. Read this first, then `README.md` (how to run, the API), then `docs/ratan-galaxy-facts.md` (every building fact and its source). `docs/next-steps.md` lists what should happen next, and the two case-study files record how the main design and engineering decisions were made.

## 1. What the project is

A complete, working sample website for Ratan Galaxy, a finished housing society of 378 homes in three blocks on plots GH-01 and GH-02, Sector 12, Vrindavan Yojna, off Amar Shaheed Path, Lucknow. The site is unofficial: it is not published by, and is not affiliated with, Ratan Housing Development Limited, and it says so in the footer of every page. The building facts (blocks, floors, flat counts, areas, flat numbers, amenities, dates, RERA numbers) come from public UP RERA records and the builder's own published brochures. Everything that is not on a record (prices, the sales lounge, its hours, the people quoted, the booking desk) is invented and labelled as a sample wherever it appears.

What makes it more than a brochure:

- The home page carries a 3D model of the whole society. Every home is a clickable box; a click names the flat, its type, areas and sample price, and opens it in 3D. You can orbit the model, take a seven-stop tour, walk the grounds at eye level from the gate, change the time of day, and filter the homes by 2, 3 or 4 BHK.
- Any flat opens in a 3D flat viewer built from the builder's floor plans, where you walk the rooms, look down on the plan, furnish it from a catalogue of real CC0 furniture models, or photograph a piece you own and have Claude measure it and place it in the flat.
- A Node server with no dependencies takes site-visit bookings with per-slot capacity, lets a visitor look up or cancel a booking, takes questions, and gives the desk an admin page with CSV export.

## 2. Where it stands on 10 November 2026

Repository: `C:\Users\ASUS\Desktop\real-estate-landing`, its own git repository, remote `origin` = https://github.com/hell-walk/real-estate.git, branch `main`. The last commit pushed to GitHub is `7f2c9f3` (7 November). Three commits since then are local only and have not been pushed:

| Commit | What |
| --- | --- |
| `56e9f91` | The drafting-atelier restyle: cream page, slate-blue buttons, yellow tags, Newsreader headlines, the dark board kept for the stage frame, the menu and the footer. |
| `f1b5f76` | The home stage loads a model of the society built in Blender (`blender/build_site.py`, exported to `assets/models/ratan-galaxy.glb`); the drawn model stays as the fallback while it loads. Renders under Poly Haven skies become the new stills. |
| `d4557f5` | The pages show the Blender renders (visit card, gallery, amenities row, towers and location heroes, `hero-fallback.jpg`, `og.jpg`). |

Uncommitted work in the working tree, from a side session that was still running when this document was written: an "architectural overview" redesign of the home stage. The stage now opens on an orthographic, isometric view of the plot standing on a dark slab at dusk, with a "Selected unit" card at the bottom left, a "Launch 3D flat spatial twin" button at the bottom right, and the tour, walk, presets, slider and filters in a dock under the picture. The files touched are `src/js/hero3d.js`, `src/css/site.css`, `src/pages/index.html`, `server.mjs` (a fix so two builds never run at once), `blender/build_site.py` (a dark-glass material for unlit windows), `assets/models/ratan-galaxy.glb` and `assets/hero-fallback.jpg`, plus three new untracked scripts `blender/export_glb.py`, `blender/render_overview.py` and `blender/make_overview.py`. On 10 November it built, passed the lint, and rendered correctly at 1440 and 375 in a headless check, but the walk, tour and click-a-flat interactions had not been re-verified by a person. Either verify and commit it, or discard it with `git checkout -- .` and `git clean` of the three scripts; do not leave it half-committed.

Also untracked, and deliberately so: `docs/pictures/` (two PDFs and their JPG pages; see section 9), `Claude outputs/` and `claude-skills/` (not part of the project).

## 3. How to run it

Node 22 or newer. Nothing to install for the site, the server or the 3D pages.

```bash
node server.mjs
```

Open http://localhost:4321. The server rebuilds `site/` from `src/` whenever a source file is newer than the last build; edit and reload. `PORT=8080` picks another port. `node build.mjs` builds once without serving.

The admin desk is at http://localhost:4321/admin/, user `lounge`, password `ridge-2026` unless `ADMIN_PASSWORD` is set. Change both before anything public:

```bash
ADMIN_USER=lounge ADMIN_PASSWORD=something-long node server.mjs
```

The furniture scan needs the Claude SDK and a key; without the key the endpoint answers 503 and the viewer says scanning is off:

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... node server.mjs
```

There is no key on the development machine, so `/api/scan` has only ever been exercised on its 400 and 503 paths. The first run with a real key should check the JSON shape Claude returns against `lib/scan.mjs`.

In the Claude desktop app the dev server is registered in `.claude/launch.json` under the name `site`.

## 4. How it is built

Plain HTML, CSS and JavaScript, stitched by `build.mjs`. There is no framework, no bundler and no CSS tooling.

- `src/pages/*.html` is one file per page. Each starts with a JSON comment giving the title, description, nav key and output path. `{{> name}}` includes a partial from `src/partials/`; `{{base}}` is the relative path to the site root, so pages under `/towers/` link correctly; `{{year}}` is the current year.
- `src/partials/` holds `layout.html` (the document shell, fonts, importmap), `nav.html`, `footer.html`, `loader.html` (the taped progress card the 3D pages show while loading), `ask.html` (the question form) and six `plan_*.html` floor plans as SVG, generated from `src/js/plans.js` and not hand-edited.
- `src/css/site.css` is the whole stylesheet, 760 lines. Design tokens are at the top (section 7).
- `src/js/site.js`: menu, scroll reveals, the EMI reader, the booking and question forms.
- `src/js/plans.js`: the five floor plans as rooms, doors and openings in feet, the three blocks, and which flat number carries which plan. Shared by the hero and the flat viewer, and the source of the plan SVGs.
- `src/js/hero3d.js` (about 820 lines): the society scene. Section 6.
- `src/js/flat3d.js` (about 600 lines): the flat viewer. Section 6.
- `src/static/` is copied as is: favicon, robots, the sketch map `assets/map-lucknow.svg`.
- `assets/` (served at `/assets/`): photographs at 900, 1800 and 2800 wide with `credits.json`; the model stills; `hero-fallback.jpg` and `og.jpg`; `models/` with the furniture glTF files, the site model `ratan-galaxy.glb` and their `credits.json`.
- `server.mjs` and `lib/`: `render.mjs` (layout and partials), `store.mjs` (a JSON store in `data/db.json`, written whole on every change), `api.mjs` (validation and handlers), `pages.mjs` (server-rendered booking, lookup and admin pages), `scan.mjs` (the Claude call). `data/` is created on first write and ignored by git; the one on the development machine holds test rows from the first day, some still naming the earlier fictional projects.
- `blender/`: the Blender pipeline. Section 6.

The pages: home, towers (`/towers/`), block A, B and C, homes (the six plans), a flat in 3D (`/flat.html`), amenities, location, pricing, price sheet (prints white), about, questions, book a site visit, find your visit (`/booking/`), privacy, terms, and a 404. The server adds `/booking/<ref>`, `/admin/`, `/admin/bookings.csv` and the API listed in `README.md`.

## 5. The data and the API

Bookings: `name, phone, email?, date, slot, project, config?, notes?`. Slots are 10:30, 12:00, 15:00 and 17:00 (fewer on Sunday), three visits a slot. `project` is Block A, Block B, Block C or Any block. References run `AR-0001`, questions `Q-0001`. A visitor cancels with the last four digits of the phone. The desk changes status (requested, confirmed, cancelled) and every change is kept in the booking's history. Writes are limited to 30 an hour from one address, scans included. Forms work without JavaScript: the server answers with the booking page or a redirect. There is no email sending anywhere; the desk is the only place a booking is seen.

The store is a single JSON file rewritten on every change under one in-process lock. It is fine for a demo and for one process; it is not fine for two server processes or for real traffic (section 10 of `docs/next-steps.md`).

## 6. The 3D systems

**Shared plan data.** `plans.js` describes each of the five flat plans (the sixth, Block B's 1,100 sq ft, reuses the 994 rooms) as rooms with sizes in feet, doors and openings, and gives the flat numbering of an X tower (1 at the east tip, 2 and 3 on the south-east wing, and so on round to 14) and which number is which plan, following the Phase II brochure and the RERA unit counts. Everything that draws a flat reads from here.

**The hero** (`hero3d.js`). Three.js 0.170 from jsDelivr through an importmap (`three` and `three/addons/`). The plot is laid out in metres as the master plan shows it: a long plot along a south road, the gate in the middle, Block C (an X in plan) at the west end, Block B (an H) in the middle, Block A (an X, with eleven shops on its stilt floor) at the east end, the pool and the round club at the east end, courts at both ends. Textures are drawn on canvases at load, so there are no texture files. Each block was one instanced mesh with a box per flat per floor and a record per box; since `f1b5f76` the Blender model replaces the drawn plot when its glb arrives (367 KB, Draco), and the records are rebuilt from the glb's extras: each block's homes are one mesh with a `_flat` vertex attribute and a colour attribute, so a home can still be picked by raycast and painted by its vertices. The country round the plot (roads, neighbourhood, lamps, trees, sky dome) stays drawn. Modes: scroll-driven camera with pointer tilt, free orbit on drag, "Walk the grounds" (first person from the gate, W A S D or arrows, a pad on touch), "Take the tour" (seven stops with captions), a time-of-day slider with Day, Evening and Dusk presets, BHK filters, hover tips, click-a-flat, click the gate to start the walk. Rendering goes through an EffectComposer: RenderPass, UnrealBloomPass (threshold above white so only the sun, lit windows and lamps glow, blurred at half size), a vignette, FXAA, OutputPass. A hero that cannot hold 30 frames a second for 45 frames turns the glow off and drops to one device pixel per pixel. It pauses off screen, caps the pixel ratio, drops shadows on phones, renders one still under `prefers-reduced-motion`, and shows `assets/hero-fallback.jpg` without WebGL. `window.__heroSnapshot(w, h, light, at)` returns a JPEG of the scene; `window.__heroPost(on)` switches the post pass for measurement.

**The flat viewer** (`flat3d.js`, `/flat.html?block=A&floor=5&flat=3` or `?type=3bhk-study-1917`). Walls, door gaps, windows and railings are derived from the plan's room edges. Floors are tiles per the builder's specification sheet, toilets have a tile dado to 8 ft, the kitchen a counter; every door has a frame and an open leaf, except the front door, which is drawn shut and is not an opening (so you cannot walk out of the flat into the air). Walk mode and plan mode; room labels are buttons that put you in that room. Furniture: nineteen catalogue pieces, sixteen of them real CC0 models from Poly Haven in `assets/models/` (about 21 MB in all, each loaded the first time it is wanted), dragged on the floor, turned with R, removed with Delete, saved in `localStorage` per plan. A scanned piece is a block of the returned size and colour with the photograph on its front. The same post pass as the hero, with the vignette off in plan view. `window.__flatPost(on)` switches it.

**The Blender pipeline** (`blender/`). `build_site.py` builds the society in Blender with `bpy` and `bmesh` from the same plan constants as `hero3d.js` (`BLOCK_POS`, the X and H shapes, fourteen homes a floor with the same numbering), step by step so a live MCP session never times out: materials, ground, each block, the gate, the pool and club, trees, surroundings. Principled BSDF only, flat shaded, about 70,000 triangles. `export_glb.py` rebuilds and exports `assets/models/ratan-galaxy.glb` with Draco, transforms applied, custom properties as extras. `render_stills.py` renders a day and a dusk still with Cycles under Poly Haven CC0 HDRIs; `make_stills.py` turns them into the site's 2800, 1800 and 900 wide JPGs (`assets/ratan-galaxy-blender-day*.jpg`, `-dusk*.jpg`). `render_overview.py` and `make_overview.py` (untracked at the time of writing) make the isometric `hero-fallback.jpg`. The `.blend`, the HDRIs and the raw renders are ignored by git; everything is regenerated from the scripts:

```bash
blender -b -P blender/export_glb.py
```

```bash
blender -b blender/ratan-galaxy.blend -P blender/render_stills.py -- day dusk
```

Blender 5.2 is installed at `C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`. The MCP for Blender addon is installed in the user's Blender 5.2 addons folder and the MCP server is registered for Claude Code with the full path to `uvx.exe` (a bare `uvx` was not on PATH, which is why the first registration failed to connect).

## 7. The design

The current look, since `56e9f91`, follows a Stitch export the author chose from six ("Architectural Drafting Atelier"), applied over the site's own structure. Tokens at the top of `site.css`:

| Token | Value | Used for |
| --- | --- | --- |
| `--bg` | `#fff8f1` | the page |
| `--surface`, `--surface-2` | `#f8f0e4`, `#efe5d4` | paper cards, the sticky top bar, the soft button |
| `--ink`, `--muted` | `#1f1b17`, `#665d50` | text |
| `--accent` | `#f0bf3a` | tags, pressed states, the current nav page, tape |
| `--blue`, `--blue-ink` | `#3e4d61`, `#fff` | the primary button |
| `--board`, `--board-2` | `#1f1b17`, `#34302b` | the stage frame, the menu panel, the footer and its bottom band |
| `--on-dark`, `--on-dark-muted` | `#f4ecdb`, `#b5a995` | text on the board |
| `--paper`, `--paper-2` | `#f4ecdb`, `#e6dbc2` | the taped sheets that remain (price sheet, pick card) |

Type: Cabinet Grotesk 400/500/700 from Fontshare for text and controls; Newsreader (variable optical size) from Google Fonts for headlines, weight 500 with slightly negative tracking. Both are loaded from their CDNs in `layout.html`; nothing is self-hosted.

House rules the stylesheet follows: square corners; no gradients or shadows at rest; no hairline rules (sections separate by tone and space; the only borders are in real tables and form fields); one sticky bar; kickers only where the chosen design calls for them, marked `taste-skill-ignore` so the lint accepts them; buttons at least 32 px tall, 40 px for primary controls; every text in the full ink at 16 px or more, grey only for secondary notes. Previous directions (the dark "notice board" of 7 November morning, and before it "The place carries it") are gone from the stylesheet but visible in git history if the look needs to be compared.

## 8. The tooling used to check the site

None of this is in the repository; it lives in the author's Claude Code plugin folder and session scratchpads, and a successor can replace it with any equivalent.

- Taste lint: `node C:/Users/ASUS/.claude/local-plugins/taste-skill/skills/taste-skill/scripts/lint.mjs src` scans the source for the banned patterns (gradients, shadows, hairlines, eyebrows, blur) and must end `0 FAIL, 0 WARN` before a commit. A line that must keep a flagged pattern carries the comment `taste-skill-ignore`.
- A headless Chrome route check at 375 px wide loaded all 19 routes and reported any page wider than the viewport, with the first overflowing elements. Every commit on 7 November ended with "19 routes fit 375".
- Headless screenshots of the home, flat, block A, pricing and location pages at 1440 and 375, scrolled a viewport at a time, were read after every visual change. The pattern is cheap to recreate with Puppeteer or Playwright: load, settle 2.5 to 8 seconds (the 3D pages), measure `scrollHeight`, scroll and shoot.
- The frame rate of the post pass was measured headlessly with `window.__heroPost(on)` and `window.__flatPost(on)`.

## 9. Content, provenance and legal rules

- Every building fact on the site has a row in `docs/ratan-galaxy-facts.md` with its source. Change the fact there first, then the pages. The file's "Sources" section lists the RERA pages, the brochures and the listings read.
- The block lettering (west X tower = C, middle H = B, east X tower = A) is this site's reading of an unlabelled master plan and is said so in the copy.
- Sample content (prices at about ₹6,900 a sq ft of super area, the lounge, hours, phone, email, the quoted residents, the staff, the booking desk) must stay labelled as sample on every page it appears. The footer's imprint must stay.
- No photograph of the society exists in the repository. The portal and brochure photographs and drawings are copyrighted and were used as reference only. `docs/pictures/ratan-galaxy-every-picture.pdf` (48 pages) collects them for private reference and must never be committed or pushed to the public remote; `docs/pictures/website-pictures.pdf` (14 pages) shows every picture the site actually serves, with credits. The author was asked twice for their own photographs of the society and none arrived; the Blender renders stand in.
- The six Lucknow photographs are Wikimedia Commons, CC BY-SA 4.0, credited in the footer and in `assets/credits.json`; the furniture is Poly Haven CC0, credited in `assets/models/credits.json` and the footer; the HDRIs are Poly Haven CC0. None of the found photographs is presented as the society itself.
- Do not use the developer's logo. If the site ever goes public, the builder should be approached for permission, official photographs and current prices, and the sample prices should come off.

## 10. Where the thinking is recorded

- Git history. Every commit message is a paragraph in plain prose saying what changed and why, often with the measurements that decided it. `git log` is the project diary.
- `docs/case-studies-ui-ux.md` and `docs/case-studies-engineering.md`: the fifteen design and ten engineering decisions worth knowing, with what was tried and what was learned.
- `docs/next-steps.md`: what should happen next, in priority order.
- The author's Claude Code sessions kept a hand-over note and a memory file outside the repository (`side-session-notes/.../real-estate-site.md` under the Claude desktop app's data folder, and a memory under `~/.claude/projects/`). They repeat what this document says and need not survive.

## 11. Credentials and secrets

| What | Where | Note |
| --- | --- | --- |
| Admin desk | `ADMIN_USER` / `ADMIN_PASSWORD`, default `lounge` / `ridge-2026` | HTTP basic auth with a constant-time compare; only safe behind HTTPS. Change before deploying. |
| Claude API key | `ANTHROPIC_API_KEY` | Never committed. Not present on the development machine. |
| GitHub remote | https://github.com/hell-walk/real-estate.git | The author's account. Transfer or fork before the account goes. |
| Fonts | Fontshare and Google Fonts CDNs | No keys. |
| three.js | jsDelivr importmap, pinned 0.170.0 | No keys. The Draco decoder also comes from the CDN. |

## 12. Known limits

- Room layouts inside the plans are traced from the brochure drawings by eye: room sizes are exact, adjacencies approximate; the 1,917 plan reuses the 1,905 rooms mirrored; Block C uses the Phase II room layouts at the 2013 super areas; Block B's 1,100 sq ft flats use the 994 plan.
- The scan has not run against the live API.
- The JSON store is single-process and has no backups.
- No automated tests exist. The checks were the lint, the route check and reading screenshots.
- The site depends on three CDNs at runtime (jsDelivr, Fontshare, Google Fonts). Offline or in a blocked network the 3D pages show the fallback pictures and the type falls back to system fonts.
- The 3D pages are heavy for old phones; the hero drops shadows and the glow, but the flat viewer's furniture is 21 MB if every piece is placed.
- The towers' real facade details, the gate and the grounds are modelled from photographs read on the portals, not from drawings; they are a likeness, not a survey.
