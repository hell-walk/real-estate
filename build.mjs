// Stitches src/pages/*.html into site/*.html with the shared head, navigation and footer from src/partials.
// Each page starts with a JSON block in an HTML comment: <!-- page {"title": ..., "description": ..., "nav": ..., "path": ...} -->
import { readFile, writeFile, mkdir, readdir, cp, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage, loadPartials, SRC, OUT, ROOT } from './lib/render.mjs';

export async function build() {
  const partials = await loadPartials(true);
  const pages = (await readdir(join(SRC, 'pages'))).filter((f) => f.endsWith('.html'));
  await mkdir(OUT, { recursive: true });
  for (const f of pages) {
    const raw = await readFile(join(SRC, 'pages', f), 'utf8');
    const m = raw.match(/^<!--\s*page\s*(\{[\s\S]*?\})\s*-->/);
    if (!m) throw new Error(`${f}: missing page metadata comment`);
    const meta = JSON.parse(m[1]);
    const html = await renderPage(meta, raw.slice(m[0].length).trim(), partials);
    const outFile = join(OUT, meta.path.replace(/^\//, ''));
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, html);
  }
  await rm(join(OUT, 'css'), { recursive: true, force: true });
  await rm(join(OUT, 'js'), { recursive: true, force: true });
  await cp(join(SRC, 'css'), join(OUT, 'css'), { recursive: true });
  await cp(join(SRC, 'js'), join(OUT, 'js'), { recursive: true });
  await cp(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });
  await cp(join(SRC, 'static'), OUT, { recursive: true, force: true }).catch(() => {});
  console.log(`built ${pages.length} pages`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
