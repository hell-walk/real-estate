// The site's server: static pages from ./site (rebuilt from ./src when a source file is newer), the booking and
// enquiry API, the booking lookup pages and the admin desk. No dependencies beyond Node.
//
//   node server.mjs                 serves on http://localhost:4321
//   PORT=8080 node server.mjs       another port
//   ADMIN_PASSWORD=... node ...     the desk at /admin/ (user "lounge"); default password printed at start
import { createServer } from 'node:http';
import { stat, readFile, readdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { build } from './build.mjs';
import { ROOT, SRC, OUT } from './lib/render.mjs';
import * as api from './lib/api.mjs';
import { scanItem } from './lib/scan.mjs';
import * as pages from './lib/pages.mjs';

const PORT = Number(process.env.PORT || 4321);
const ADMIN_USER = process.env.ADMIN_USER || 'lounge';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ridge-2026';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.xml': 'application/xml', '.csv': 'text/csv; charset=utf-8' };
const HTML = TYPES['.html'];

// ---------- rebuild when a source file changed ----------
let builtAt = 0;
async function newest(dir) {
  let t = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? await newest(p) : (await stat(p)).mtimeMs);
  }
  return t;
}
async function ensureBuilt() {
  const t = Math.max(await newest(SRC), await newest(join(ROOT, 'lib')), (await stat(join(ROOT, 'build.mjs'))).mtimeMs);
  if (t > builtAt) { await build(); builtAt = Date.now(); }
}

// ---------- helpers ----------
const send = (res, status, body, type = HTML, extra = {}) => { if (!res.headersSent) res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', ...extra }); res.end(body); };
const json = (res, { status, body }) => send(res, status, JSON.stringify(body), 'application/json');
const redirect = (res, to) => { res.writeHead(303, { location: to }); res.end(); };
const wantsJson = (req) => /application\/json/.test(req.headers.accept || '') || /application\/json/.test(req.headers['content-type'] || '');

async function readBody(req, limit = 64 * 1024) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('Body too large'), { status: 413 }); chunks.push(c); }
  const raw = Buffer.concat(chunks).toString('utf8');
  const type = req.headers['content-type'] || '';
  if (type.includes('application/json')) return raw ? JSON.parse(raw) : {};
  return Object.fromEntries(new URLSearchParams(raw));
}

// a gentle limit on writes: 30 an hour from one address
const hits = new Map();
function limited(req) {
  const ip = req.socket.remoteAddress || '?', now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600000);
  list.push(now); hits.set(ip, list);
  return list.length > 30;
}

function adminAllowed(req) {
  const m = /^Basic (.+)$/.exec(req.headers.authorization || '');
  if (!m) return false;
  const [user, ...rest] = Buffer.from(m[1], 'base64').toString('utf8').split(':');
  const pass = rest.join(':');
  const a = Buffer.from(`${user}\n${pass}`), b = Buffer.from(`${ADMIN_USER}\n${ADMIN_PASSWORD}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function staticFile(res, path) {
  if (path.endsWith('/')) path += 'index.html';
  let file = normalize(join(OUT, path));
  if (!file.startsWith(normalize(OUT))) return send(res, 403, 'Forbidden', TYPES['.txt']);
  let s = await stat(file).catch(() => null);
  if (s && s.isDirectory()) { file = join(file, 'index.html'); s = await stat(file).catch(() => null); }
  if (!s && !extname(file)) { file += '.html'; s = await stat(file).catch(() => null); }
  if (!s) {
    const page = await readFile(join(OUT, '404.html')).catch(() => '<!doctype html><title>Not found</title><p>Not found');
    return send(res, 404, page);
  }
  const type = TYPES[extname(file)] || 'application/octet-stream';
  const cache = /\.(jpg|jpeg|png|svg|webp|woff2)$/.test(file) ? 'public, max-age=86400' : 'no-store';
  send(res, 200, await readFile(file), type, { 'cache-control': cache });
}

// ---------- routes ----------
async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = decodeURIComponent(url.pathname);
  const method = req.method;

  // API
  if (path === '/api/availability' && method === 'GET') return json(res, await api.availability(url.searchParams.get('date')));
  if (path === '/api/bookings' && method === 'POST') {
    if (limited(req)) return json(res, { status: 429, body: { ok: false, error: 'Too many requests from this address. Try again in an hour, or call the lounge.' } });
    const input = await readBody(req);
    const out = await api.createBooking(input);
    if (wantsJson(req)) return json(res, out);
    if (out.body.ok) return redirect(res, `/booking/${out.body.booking.ref}?new=1`);
    const first = Object.values(out.body.errors)[0];
    return send(res, out.status, await pages.lookupPage(`The booking was not saved: ${first} Go back and try again.`));
  }
  let m;
  if ((m = /^\/api\/bookings\/(AR-\d{4})$/i.exec(path)) && method === 'GET') {
    const b = await api.getBooking(m[1]);
    return json(res, b ? { status: 200, body: { ok: true, booking: api.publicBooking(b) } } : { status: 404, body: { ok: false, error: 'No booking with that reference.' } });
  }
  if ((m = /^\/api\/bookings\/(AR-\d{4})\/cancel$/i.exec(path)) && method === 'POST') return json(res, await api.cancelBooking(m[1], (await readBody(req)).last4));
  if (path === '/api/scan' && method === 'POST') { // a picture of a piece of furniture, read by Claude (lib/scan.mjs)
    if (limited(req)) return json(res, { status: 429, body: { ok: false, error: 'Too many requests from this address.' } });
    return json(res, await scanItem(await readBody(req, 4 * 1024 * 1024)));
  }
  if (path === '/api/enquiries' && method === 'POST') {
    if (limited(req)) return json(res, { status: 429, body: { ok: false, error: 'Too many requests from this address.' } });
    const input = await readBody(req);
    const out = await api.createEnquiry(input);
    if (wantsJson(req)) return json(res, out);
    return redirect(res, out.body.ok ? `${input.page || '/faq.html'}?asked=${out.body.enquiry.ref}#ask` : `${input.page || '/faq.html'}?error=1#ask`);
  }

  // booking pages
  if (path === '/booking' || path === '/booking/') {
    const ref = (url.searchParams.get('ref') || '').trim().toUpperCase().replace(/^AR-?(\d+)$/, (_, n) => `AR-${n.padStart(4, '0')}`);
    if (!ref) return send(res, 200, await pages.lookupPage());
    return redirect(res, `/booking/${ref}`);
  }
  if ((m = /^\/booking\/(AR-\d{4})$/i.exec(path)) && method === 'GET') {
    const b = await api.getBooking(m[1]);
    if (!b) return send(res, 404, await pages.lookupPage(`No visit with the reference ${m[1].toUpperCase()}.`));
    return send(res, 200, await pages.bookingPage(b, { fresh: url.searchParams.has('new') }));
  }
  if ((m = /^\/booking\/(AR-\d{4})\/cancel$/i.exec(path)) && method === 'POST') {
    const out = await api.cancelBooking(m[1], (await readBody(req)).last4);
    if (wantsJson(req)) return json(res, out);
    const b = await api.getBooking(m[1]);
    if (!b) return send(res, 404, await pages.lookupPage(out.body.error));
    return send(res, out.status === 200 ? 200 : out.status, await pages.bookingPage(b, { message: out.body.ok ? 'The visit is cancelled.' : out.body.error }));
  }

  // admin desk
  if (path.startsWith('/admin')) {
    if (!adminAllowed(req)) return send(res, 401, 'The lounge desk needs a password.', TYPES['.txt'], { 'www-authenticate': 'Basic realm="Lounge desk", charset="UTF-8"' });
    if (path === '/admin' || path === '/admin/') return send(res, 200, await pages.adminPage({ notice: url.searchParams.get('notice') || '' }));
    if (path === '/admin/bookings.csv') return send(res, 200, await pages.bookingsCsv(), TYPES['.csv'], { 'content-disposition': 'attachment; filename="site-visits.csv"' });
    if ((m = /^\/admin\/bookings\/(AR-\d{4})\/status$/i.exec(path)) && method === 'POST') {
      const out = await api.setBookingStatus(m[1], (await readBody(req)).status);
      return redirect(res, `/admin/?notice=${encodeURIComponent(out.body.ok ? `${m[1].toUpperCase()} is now ${out.body.booking.status}.` : out.body.error)}`);
    }
    if ((m = /^\/admin\/enquiries\/(Q-\d{4})\/status$/i.exec(path)) && method === 'POST') {
      const out = await api.setEnquiryStatus(m[1], (await readBody(req)).status);
      return redirect(res, `/admin/?notice=${encodeURIComponent(out.body.ok ? `${m[1].toUpperCase()} is now ${out.body.enquiry.status}.` : out.body.error)}`);
    }
    return send(res, 404, 'Not found', TYPES['.txt']);
  }

  if (method !== 'GET' && method !== 'HEAD') return send(res, 405, 'Method not allowed', TYPES['.txt']);
  return staticFile(res, path);
}

createServer(async (req, res) => {
  try {
    await ensureBuilt();
    await route(req, res);
  } catch (err) {
    console.error(err);
    if (wantsJson(req)) return json(res, { status: err.status || 500, body: { ok: false, error: err.status ? err.message : 'Something went wrong on the server.' } });
    send(res, err.status || 500, 'Something went wrong on the server.', TYPES['.txt']);
  }
}).listen(PORT, () => {
  console.log(`Ratan Galaxy sample site on http://localhost:${PORT}`);
  console.log(process.env.ANTHROPIC_API_KEY ? 'Scan a piece: on (ANTHROPIC_API_KEY is set)' : 'Scan a piece: off until ANTHROPIC_API_KEY is set');
  console.log(`Lounge desk at http://localhost:${PORT}/admin/  user "${ADMIN_USER}"  password "${process.env.ADMIN_PASSWORD ? '(from ADMIN_PASSWORD)' : ADMIN_PASSWORD}"`);
});
