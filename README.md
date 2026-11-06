# Aranya Estates — a sample real estate website

A complete, working website for a fictional Pune developer: a 3D ridge in the home page hero (Three.js), three project pages, amenities, location, pricing with a live EMI reader, an about page, questions, a booking flow that saves to the server with per slot availability, a booking lookup and cancel page, an admin desk, a printable price sheet, legal pages and a 404.

Everything on it is invented: the developer, the projects, the prices, the people and the quoted residents. The photographs are open licence pictures of the Sahyadri country around Pune, credited in the footer; none shows a project.

## Run it

Needs Node 22 or newer. No packages to install.

```bash
node server.mjs
```

Then open http://localhost:4321. The server rebuilds `site/` from `src/` whenever a source file changes, so edit and reload.

The admin desk is at http://localhost:4321/admin/ with the user `lounge` and the password printed when the server starts (`ridge-2026` unless `ADMIN_PASSWORD` is set). Change it before putting this anywhere public:

```bash
ADMIN_USER=lounge ADMIN_PASSWORD=something-long node server.mjs
```

`PORT` picks another port.

## What is where

| Path | What |
| --- | --- |
| `src/pages/*.html` | One file per page. Starts with a JSON comment (title, description, nav key, output path). |
| `src/partials/` | `layout.html`, `nav.html`, `footer.html`, `ask.html` (the question form). |
| `src/css/site.css` | The whole stylesheet. Tokens at the top. |
| `src/js/site.js` | Menu, reveals, the word by word statement, the EMI reader, the booking and question forms. |
| `src/js/hero3d.js` | The ridge scene. Three.js 0.170.0 from jsDelivr through an import map. |
| `src/static/` | Favicon, robots, the drawn map. |
| `assets/` | Photographs at 1800 and 900 wide, with `credits.json`; the hero fallback and social image. |
| `build.mjs` | Stitches pages into `site/`. `node build.mjs` builds once. |
| `server.mjs` | Static files, the API, booking pages, the admin desk. |
| `lib/` | `render.mjs` (layout), `store.mjs` (JSON store in `data/db.json`), `api.mjs` (validation and handlers), `pages.mjs` (server rendered pages). |
| `data/` | Created on first write. Ignored by git. |

## The API

| Method and path | What |
| --- | --- |
| `GET /api/availability?date=YYYY-MM-DD` | Slots that day with how many of three places are left. Sunday has fewer slots. |
| `POST /api/bookings` | JSON or form body: `name, phone, email?, date, slot, project, config?, notes?`. 201 with the booking and its reference `AR-0001`, 400 with field errors, 409 when the slot is full. |
| `GET /api/bookings/AR-0001` | The booking, phone masked. |
| `POST /api/bookings/AR-0001/cancel` | `last4` of the mobile number. |
| `POST /api/enquiries` | `name, contact, topic?, message, page?`. 201 with `Q-0001`. |

Forms work without JavaScript too: the server answers with the booking page or a redirect.

Writes are limited to 30 an hour from one address. There is no email sending; the desk sees everything at `/admin/`, and `/admin/bookings.csv` exports the visits.

## The 3D hero

`src/js/hero3d.js` builds the ridge from primitives: a displaced plane with vertex colours, six stepped blocks with instanced windows, a flat road strip laid on the ground, instanced trees, a lake. Scrolling the hero drives the camera up the road; the pointer tilts the view; the light moves from afternoon to dusk over about fifty seconds and the windows come on. It pauses off screen and when the tab is hidden, caps the pixel ratio (1.5 desktop, 1.25 phone), drops shadows and antialiasing on phones, and shows `assets/hero-fallback.jpg` when WebGL is missing or the context is lost. Under `prefers-reduced-motion` it renders one still.

`window.__heroSnapshot()` in the console returns a JPEG data URL of the scene, which is how the fallback picture was made.

## Design

Direction from the taste-skill draw, seed 1859751874, "The place carries it": warm black ground, white ink, one gold accent, Clash Grotesk from Fontshare, square corners, no rules, no gradients, no shadows at rest. Structure from the landing-page-design skill: one offer, one action (book a site visit), the tagline that brightens word by word, questions as an accordion, a form with real checks.
