# Ten engineering case studies from the Ratan Galaxy site

Each study records a technical decision taken between 6 and 10 November 2026: the constraint, the options, what was built, the measurement that decided it where there was one, and what a successor should keep or change. Commits are in the repository history.

## 1. No build tool, and a server that rebuilds on request

**Constraint.** Seventeen pages sharing a layout, a nav and a footer; no appetite for a framework or a bundler on a demo that should run anywhere Node runs.

**What was built.** `build.mjs` is thirty lines: it reads each page's JSON header comment, replaces `{{> partial}}`, `{{base}}` and `{{year}}`, wraps the body in `layout.html` and writes `site/`. `server.mjs` compares the newest modification time under `src/`, `lib/` and `build.mjs` against the last build on every request and rebuilds when a source is newer, so editing a file and reloading is the whole development loop.

**What went wrong and was fixed.** A page's requests arrive together (the HTML, then the CSS, the JS and the images), and when a source had just changed, several requests each started a build, and the builds deleted each other's output mid-write. The fix (uncommitted at the time of writing, in `server.mjs`) keeps one in-flight build promise and makes every concurrent request await it.

**Keep or change.** Keep. If the site grows past a few dozen pages or needs CSS processing, move to a static-site tool, but the partial syntax here is deliberately a subset of what those tools accept.

## 2. The floor plans as one data file

**Constraint.** The same plan must draw the clickable boxes on the towers, the walls and doors of the flat viewer, the SVG plan cards on the homes page and the room lists on the block pages. The plans themselves changed twice as better sources arrived (portal listings, then the 2013 brochure, then the Phase II brochure and the RERA unit list).

**What was built.** `src/js/plans.js` holds each plan as rooms with sizes in feet, doors and openings, plus the X tower's flat numbering and the map from flat number to plan. The flat viewer derives walls by putting every room edge on a line, cutting lines at room ends, doors and openings, and typing each piece as wall, door gap, window or railing. The plan SVG partials are generated from the same data by a script, never drawn by hand, so a change to a room size redraws everything. Old type ids from the first version still resolve to the nearest plan so no link breaks.

**Keep or change.** Keep, and resist the temptation to hand-edit an SVG. The one known approximation is in the data, not the code: adjacencies are traced by eye from brochure drawings.

## 3. A city block in the browser without texture files

**Constraint.** The home page's scene must load fast on a phone and look like the real towers, with no image assets to serve.

**What was built.** Every surface texture (plaster, grass, asphalt, paving, railings, the gate board) is drawn on a canvas at load and uploaded as a texture. Each block was one instanced mesh with a box per flat per floor and a record per instance, so 378 homes cost one draw call per block and a raycast hit maps to a record. Shadows use a 4096 map on desktops and are dropped on phones; the pixel ratio is capped; rendering pauses off screen; `prefers-reduced-motion` renders one still; no WebGL shows a JPEG.

**Measurement.** The first version rendered at full frame rate on the development machine and about 29 frames a second in a headless phone emulation; the drop to one device pixel per pixel under load came later with the post pass.

**Keep or change.** The canvas textures and the instancing are the right idea. Since the Blender model arrived the blocks are real meshes from a glb; the drawn plot remains as the fallback and should stay until the glb's load time has been measured on a real phone.

## 4. Post-processing, measured rather than assumed

**Constraint.** The author asked for the scenes to be "enhanced" with the React Three Fiber skill's guidance; the site has no React. The guidance that transferred was the effect stack: bloom, vignette, tone mapping.

**What was built.** Both scenes render through an EffectComposer: RenderPass, UnrealBloomPass with its luminance threshold above white so only the sun, the lit windows (emissive raised to 2.4 at dusk) and the lamps glow, the blur run at half size; a vignette shader (off in the flat's plan view); FXAA; OutputPass for the tone mapping.

**Measurement.** A multisampled render target (4x MSAA) measured 43 frames a second against 60 with FXAA in headless Chrome at 1440, so FXAA won. With the whole pass the home page measured about 59 frames a second against 64 without; the flat and the phone emulation were unchanged within noise. A hero that cannot hold 30 frames a second for 45 consecutive frames turns the glow off and drops to one device pixel per pixel. `window.__heroPost(on)` and `window.__flatPost(on)` switch the pass so the measurement can be repeated.

**Keep or change.** Keep the pass and the switches. Measure on a real mid-range phone before trusting the emulation.

## 5. The Blender model and the glb that keeps its data

**Constraint.** The author wanted the stage to look like a real architectural model, not a procedural sketch, while every interaction (pick a flat, paint the filtered flats grey, drive the window glow with the time of day, click the gate) kept working.

**What was built.** `blender/build_site.py` builds the society with `bpy` and `bmesh` from the same constants as `hero3d.js`: block positions, the X and H footprints, fourteen homes a floor with the same numbering, the gate on the south wall, the pool, the club, the courts, the trees. It runs in steps so a live MCP session never times out. Each block's homes are one mesh carrying a `_flat` float attribute (the index into a `flats` JSON list stored as a custom property, exported as glTF extras) and a colour attribute, so the page raycasts to a home and recolours it by vertex. Materials are Principled BSDF only and named (`glass`, `water`, `lamp_glow`) so the page can find and drive them. Export is Draco-compressed with transforms applied: 70,000 triangles, 367 KB. `hero3d.js` loads it with GLTFLoader and DRACOLoader, rebuilds its records from the extras, swaps the picking, the painting and the material drivers to the model, and removes the drawn plot.

**Keep or change.** Keep the convention that the data rides inside the glb. The `.blend` is ignored by git on purpose; the script is the source of truth and regenerates it.

## 6. Facts with sources, and references that never reach the repository

**Constraint.** The site is about a real society and a real company. Every number must be defensible, and the builder's brochures and the portals' photographs are copyrighted.

**What was built.** `docs/ratan-galaxy-facts.md` is the single table of facts, each with its source (UP RERA registration pages, the sanctioned stilt plan from RERA, the 2013 and Phase II brochures supplied by the author, the portal listings) and a rule: anything not on a record is a labelled sample. Pages are written from the sheet, not from memory. The brochures and portal images were read in a session scratchpad and summarised into the sheet in words; two PDFs that collect them (`docs/pictures/`) exist for private reference and are untracked, with the rule that they must never be pushed.

**Keep or change.** Keep the discipline: change the sheet first, then the page. Consider adding a `.gitignore` entry for `docs/pictures/` so the rule does not depend on anyone remembering it.

## 7. The furniture scan: a strict contract around a model call

**Constraint.** "Photograph a piece you own and have Claude size it" is the premium feature. It must fail cleanly without a key, never accept an unbounded upload, and return something the viewer can place.

**What was built.** The browser shrinks the picture to 1024 pixels before sending. `/api/scan` accepts up to 4 MB, answers 503 with a plain message when `ANTHROPIC_API_KEY` is absent, 400 for a bad picture, 413 for too large, 422 if the model declines. `lib/scan.mjs` asks for strict JSON (name, category, width, depth and height in centimetres, colour, material, confidence, note) using the SDK's JSON-schema output. The viewer turns the answer into a block of that size and colour with the photograph on its front. Scans count against the same 30-an-hour write limit as bookings.

**Keep or change.** It has never run against the live API. The first real run is item 11 of `docs/next-steps.md`. Add a monthly spend cap on the key before exposing it.

## 8. A booking system with no dependencies

**Constraint.** The demo needed working bookings, lookup, cancellation, questions and an admin desk, and the author wanted nothing to install.

**What was built.** `lib/store.mjs` keeps bookings and enquiries in `data/db.json`, loaded once and rewritten whole under one in-process `mutate` lock; references are sequential (`AR-0001`, `Q-0001`); capacity is three a slot with fewer slots on Sunday. `lib/api.mjs` validates and handles; `lib/pages.mjs` renders the booking, lookup and admin pages on the server so forms work without JavaScript; the admin desk uses HTTP basic auth with a constant-time compare and exports CSV. Writes are rate-limited per address.

**Keep or change.** Right for a demo, wrong for production: one process, no backups, basic auth only safe behind HTTPS, no notifications. Items 8 to 10 of `docs/next-steps.md` replace the store, add TLS and add email while keeping the function signatures so the handlers do not change.

## 9. Verification by lint, route check and screenshots

**Constraint.** No test suite, many visual changes a day, two 3D scenes, a design house style with hard rules.

**What was built.** Three checks ran before every commit. A source lint scanned `src/` for banned patterns (gradients, shadows, hairlines, eyebrows, blur) and had to end 0 FAIL, 0 WARN; a line that must keep a pattern for a reason carries `taste-skill-ignore`, and the reason is written beside it. A headless Chrome run loaded all 19 routes at 375 wide and failed on any page wider than the viewport, printing the first overflowing elements; a variant printed the element's class, right edge and text. A screenshot run captured five representative pages at 1440 and 375, scrolling a viewport at a time, and the images were read.

**What it caught.** The pick card falling into the flow, the phone hero bar overlapping the stage buttons, the price table's no-wrap cells, and the two hairlines and the blur that the reference design would have brought in.

**Keep or change.** The scripts lived outside the repository in the author's tooling. Recreate the route check and the screenshot run under `tools/` (item 6 of `docs/next-steps.md`); they are forty lines each with Playwright.

## 10. The picture pipeline: originals, renditions, credits, and cache-safe names

**Constraint.** Photographs from Wikimedia Commons at three sizes with correct credits; model stills that are regenerated whenever the model changes; browsers that cache the old picture.

**What was built.** The Commons originals are fetched at full size and resampled with Pillow to 2800, 1800 and 900 wide (quality 86, 84, 86, progressive), each page's `srcset` lists all three, and `assets/credits.json` records the source, author, licence and original size for the footer and the pictures document. The model stills follow the same sizes: first from a snapshot function in the three.js scene, then from Cycles renders through `blender/make_stills.py`. When the sketch map was redrawn, its file was renamed so no cached copy could survive; the same rule applied when the Blender renders replaced the three.js stills under a new name rather than overwriting.

**Keep or change.** Keep the three sizes and the credits file. Delete the superseded three.js stills (item 4 of `docs/next-steps.md`). If the site goes behind a CDN, add content hashes to asset names instead of renaming by hand.
