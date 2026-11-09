# Ratan Galaxy — a sample real estate website

A complete, working website about a real society, Ratan Galaxy in Sector 12, Vrindavan Yojna, Lucknow, built as a demo. The home page hero is the society in three dimensions, drawn from the published master plan: three blocks of nine floors, every flat a clickable box. A guided tour flies round it. Any flat opens in its own 3D viewer, drawn from the builder's floor plans, where you walk the rooms, look down on the plan, furnish it from a catalogue, or photograph a piece you own and have Claude size it and put it in the flat.

This is an unofficial sample site, not affiliated with Ratan Housing Development Limited. The blocks, floors, flat counts and room sizes follow public RERA records and the builder's published floor plans (`docs/ratan-galaxy-facts.md` lists them with sources). The prices, the people, the lounge, the quoted residents and the booking desk are invented and labelled as samples on every page they appear. The photographs are open licence pictures of Lucknow, credited in the footer; none shows the society.

## Run it

Needs Node 22 or newer. The site, the server and the 3D pages need no packages.

```bash
node server.mjs
```

Then open http://localhost:4321. The server rebuilds `site/` from `src/` whenever a source file changes, so edit and reload.

The admin desk is at http://localhost:4321/admin/ with the user `lounge` and the password printed when the server starts (`ridge-2026` unless `ADMIN_PASSWORD` is set). Change it before putting this anywhere public:

```bash
ADMIN_USER=lounge ADMIN_PASSWORD=something-long node server.mjs
```

`PORT` picks another port.

### Scanning a piece of furniture

The flat viewer's "scan a piece of your own" sends a photograph to `/api/scan`, where `lib/scan.mjs` asks Claude what the piece is, its likely size in centimetres and its colour, as strict JSON. That needs the Claude SDK and a key:

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-... node server.mjs
```

Without the key the endpoint answers 503 with a plain message and the viewer says so; the catalogue still works. Pictures are shrunk to 1024 pixels in the browser before they are sent, and the server accepts up to 4 MB.

## What is where

| Path | What |
| --- | --- |
| `src/pages/*.html` | One file per page. Starts with a JSON comment (title, description, nav key, output path). `towers.html` and `block-a/b/c.html` go to `/towers/`. |
| `src/partials/` | `layout.html`, `nav.html`, `footer.html`, `ask.html` (the question form), `plan_*.html` (the five floor plans as SVG). |
| `src/css/site.css` | The whole stylesheet. Tokens at the top. |
| `src/js/site.js` | Menu, reveals, the word by word statement, the EMI reader, the booking and question forms. |
| `src/js/plans.js` | The five floor plans as rooms, doors and openings in feet, the three blocks, and which flat number is which plan. Shared by the hero and the flat viewer. |
| `src/js/hero3d.js` | The society scene: the plot, the three blocks with one box per flat, orbit, the walk, the tour, the time of day, the filters, the flat picker. |
| `src/js/flat3d.js` | The flat viewer: walls, doors, windows and rails from the plan, walking, the plan view, furniture, the scan. |
| `src/static/` | Favicon, robots, the drawn map. |
| `assets/` | Photographs at 1800 and 900 wide, with `credits.json`; the hero fallback and social image; `models/` holds the furniture (glTF, CC0, Poly Haven) with its own `credits.json`. |
| `docs/ratan-galaxy-facts.md` | The facts sheet: what is from the records, what is a sample, and the block lettering this site uses. |
| `build.mjs` | Stitches pages into `site/`. `node build.mjs` builds once. |
| `server.mjs` | Static files, the API, booking pages, the admin desk, the scan. |
| `lib/` | `render.mjs` (layout), `store.mjs` (JSON store in `data/db.json`), `api.mjs` (validation and handlers), `pages.mjs` (server rendered pages), `scan.mjs` (Claude reads a photograph). |
| `data/` | Created on first write. Ignored by git. |

## The API

| Method and path | What |
| --- | --- |
| `GET /api/availability?date=YYYY-MM-DD` | Slots that day with how many of three places are left. Sunday has fewer slots. |
| `POST /api/bookings` | JSON or form body: `name, phone, email?, date, slot, project, config?, notes?`. `project` is Block A, Block B, Block C or Any block. 201 with the booking and its reference `AR-0001`, 400 with field errors, 409 when the slot is full. |
| `GET /api/bookings/AR-0001` | The booking, phone masked. |
| `POST /api/bookings/AR-0001/cancel` | `last4` of the mobile number. |
| `POST /api/enquiries` | `name, contact, topic?, message, page?`. 201 with `Q-0001`. |
| `POST /api/scan` | `{ image: "data:image/jpeg;base64,...", note?: "..." }`. 200 with `item` (name, category, width, depth and height in cm, colour, material, confidence, note); 400 for a bad picture, 413 if too big, 503 when scanning is off, 422 if Claude declines. |

Forms work without JavaScript too: the server answers with the booking page or a redirect.

Writes are limited to 30 an hour from one address, scans included. There is no email sending; the desk sees everything at `/admin/`, and `/admin/bookings.csv` exports the visits.

## The 3D pages

Both use Three.js 0.170.0 from jsDelivr through an import map (`three` and `three/addons/`, for OrbitControls and the room environment) and share `src/js/plans.js`. Every surface is drawn on a canvas at load (plaster, grass, asphalt, paving, tiles, planks, railings, the gate board), so there are no texture files to serve.

**The hero** (`hero3d.js`) lays the plot out in metres as the master plan shows it: a long plot with the road on the south, the gate in the middle, the parking row under the palms, Block C (an X in plan) at the west end, Block B (an H) in the middle, Block A (an X) at the east end, the pool, the sand pit and the round club at the east end, the courts at the west end. Each block is one instanced mesh with a box per flat per floor, fourteen a floor, with slabs, parapets, balconies and their railings, window frames, air conditioners and an entrance canopy; round it the boundary wall with its piers and grille, the gate with its board and gatehouse, lamps, benches, the cars in the parking row, the palms and the garden. A flat can be hovered (gold, and named in a tip), clicked (a card with its type, areas, sample price and a link to the viewer) and found by block, floor and number from the card's form; the 2, 3 and 4 BHK filters grey out the rest. Scrolling drives the camera in and the pointer tilts the view; drag the picture and it becomes a free orbit (scroll to zoom, right drag to slide, "Reset the view" to go back). "Walk the grounds" puts you on the road outside the gate at eye level: drag to look, W A S D or the arrows to move (a pad on touch screens), with the blocks, the wall, the pool and the club solid. "Take the tour" flies seven stops with captions. The time of day slider runs the light from afternoon to dusk, when the windows and the lamps come on; left alone it cycles on its own over about eighty seconds. Shadows and reflections come from a 4096 shadow map and a room environment on desktops, dropped on phones. It pauses off screen, caps the pixel ratio, drops shadows on phones, and shows `assets/hero-fallback.jpg` without WebGL. Under `prefers-reduced-motion` it renders one still and the tour cuts between stops.

**The flat viewer** (`flat3d.js`, `/flat.html?block=A&floor=5&flat=3` or `?type=3bhk-1917`) builds the rooms from the plan: every room edge goes on a line, lines are cut at room ends, doors and openings, and each piece becomes a wall, a door gap (glass for a balcony door), a window in an outer wall of a living room or bedroom, or a railing on a balcony edge. Floors are tiles, planks or terracotta by room, drawn per room with a shade along the walls; walls are plaster with a skirting and a cornice, one wall in the living room and the bedrooms coloured; every door has its frame and a leaf standing open; windows have curtains and let the sun in; every room has its light (a real lamp in each, a pendant model in the dining room) and the living, dining and bedrooms a turning fan. A line over the picture names the room you are in. The flat sits at its real height over the floors below (a facade of windows), the ground and the neighbours, under a sky dome. Walk mode: drag to look, WASD or the arrows to move (a pad on touch screens), doors only, start in the entrance lobby; the room list jumps you to a room. Plan mode: an orthographic view from above; click the floor to stand there. Furniture: nineteen catalogue pieces grouped by room, most of them real CC0 models from Poly Haven at their real size (`assets/models/`, makers in `credits.json` there, about 21 MB in all, loaded the first time a piece is wanted and shown as a block until then), the rest boxes; dragged on the floor, turned with R or a double click, removed with Delete, saved in `localStorage` per plan. A new piece lands in front of you facing you. A scanned piece is a block of the returned size and colour with the photograph on its front.

`window.__heroSnapshot(w, h, light, at)` in the console on the home page returns a JPEG data URL of the scene, which is how `assets/hero-fallback.jpg` and `assets/og.jpg` were made.

## Design

Since 7 November 2026 the site follows a drafting-atelier look: a cream page, paper cards, slate-blue buttons, yellow tags, Newsreader headlines over Cabinet Grotesk, and the dark board kept only for the stage frame, the menu and the footer. Tokens are at the top of `src/css/site.css`; the rules and the reasoning are in `docs/handover.md` (section 7) and `docs/case-studies-ui-ux.md`.

## Hand-over

`docs/handover.md` describes the project as of 10 November 2026, `docs/next-steps.md` what should happen next, and the two case-study files how the main decisions were made.
