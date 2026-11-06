// Renders a page body into the shared layout (src/partials). Used by the build for the static pages and by the
// server for the dynamic ones (a booking, the admin desk).
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..');
export const SRC = join(ROOT, 'src');
export const OUT = join(ROOT, 'site');

let cache = null;
export async function loadPartials(fresh = false) {
  if (cache && !fresh) return cache;
  const partials = {};
  for (const f of await readdir(join(SRC, 'partials'))) partials[f.replace(/\.html$/, '')] = await readFile(join(SRC, 'partials', f), 'utf8');
  cache = partials;
  return partials;
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function renderPage(meta, body, partials) {
  partials ??= await loadPartials();
  const base = '/'; // every page is served from the site root, so links in the shared parts are root relative
  const expand = (s) => s.replace(/\{\{>\s*(\w+)\s*\}\}/g, (_, name) => partials[name] ?? ''); // a page body may pull in a partial too, such as the question form
  const vars = { head: '', scripts: '', bodyClass: '', ...meta, base, year: new Date().getFullYear() };
  const fill = (s) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (key in vars ? String(vars[key]) : ''));
  vars.body = fill(expand(body));
  let html = fill(expand(partials.layout));
  html = html.replace(new RegExp(`(<a[^>]*data-nav="${meta.nav}")`, 'g'), '$1 aria-current="page"');
  return html;
}
