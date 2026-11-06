// One flat of Ratan Galaxy in three dimensions. The rooms come from plans.js as rectangles; this file raises the walls
// between them with their doors and windows, lays the floors, rails the balconies, and puts the flat at its real height
// over the Lucknow ground. Floors, walls and the facade below are drawn on canvases; reflections come from a room
// environment; every room has its light and the rooms people sit in a ceiling fan. You can walk through it at eye level (drag to look, keys or the pad to move, doors
// only) or look down on the plan, and in either view furnish it: pieces from a catalogue, or your own things scanned
// from a photograph through /api/scan, each dragged into place, turned, and kept in this browser for the next visit.
// Three.js 0.170.0 from the CDN; nothing here is needed to read the page.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLANS, FT, flatFromParams, flatTitle, BLOCKS, ordinal } from './plans.js';

const stage = document.getElementById('flat-stage');
const panel = document.getElementById('flat-panel');

const WALL_H = 2.9, WALL_T = 0.15, DOOR_H = 2.1, FLOOR_H = 3.1;
const WINDOWED = new Set(['living', 'dining', 'bed', 'kitchen', 'servant', 'dress']);

// ---------- the catalogue: each piece is a few boxes around its footprint centre, x to the right, z to the front ----------
const box = (x, y, z, w, h, d, c) => ({ x, y, z, w, h, d, c });
const chair = (x, z, c = '#6d5138', rot = 0) => [box(x, 0.42, z, 0.45, 0.05, 0.45, c), box(x, 0.21, z, 0.05, 0.42, 0.05, c), box(x, 0.66, z - 0.2 * Math.cos(rot), 0.45, 0.45, 0.05, c)];
export const CATALOGUE = [
  { id: 'bed-double', name: 'Double bed', w: 1.8, d: 2.0, h: 0.95, parts: [box(0, 0.22, 0, 1.8, 0.44, 2.0, '#8b6b4a'), box(0, 0.54, 0.05, 1.7, 0.2, 1.9, '#e9e3d6'), box(-0.45, 0.7, -0.7, 0.6, 0.12, 0.4, '#f4f1ea'), box(0.45, 0.7, -0.7, 0.6, 0.12, 0.4, '#f4f1ea'), box(0, 0.5, -0.98, 1.8, 1.0, 0.06, '#6d5138')] },
  { id: 'bed-single', name: 'Single bed', w: 0.95, d: 2.0, h: 0.95, parts: [box(0, 0.22, 0, 0.95, 0.44, 2.0, '#8b6b4a'), box(0, 0.54, 0.05, 0.9, 0.2, 1.9, '#e9e3d6'), box(0, 0.7, -0.7, 0.55, 0.12, 0.4, '#f4f1ea'), box(0, 0.5, -0.98, 0.95, 1.0, 0.06, '#6d5138')] },
  { id: 'sofa-3', name: 'Three seat sofa', w: 2.0, d: 0.9, h: 0.85, parts: [box(0, 0.22, 0, 2.0, 0.44, 0.9, '#5b6b7a'), box(0, 0.65, -0.33, 2.0, 0.42, 0.24, '#4f5f6e'), box(-0.9, 0.5, 0, 0.2, 0.6, 0.9, '#4f5f6e'), box(0.9, 0.5, 0, 0.2, 0.6, 0.9, '#4f5f6e'), box(-0.55, 0.5, 0.08, 0.55, 0.12, 0.6, '#67788a'), box(0.55, 0.5, 0.08, 0.55, 0.12, 0.6, '#67788a')] },
  { id: 'armchair', name: 'Armchair', w: 0.9, d: 0.9, h: 0.85, parts: [box(0, 0.22, 0, 0.9, 0.44, 0.9, '#8a6a5a'), box(0, 0.65, -0.33, 0.9, 0.42, 0.24, '#7a5a4a'), box(-0.37, 0.5, 0, 0.16, 0.6, 0.9, '#7a5a4a'), box(0.37, 0.5, 0, 0.16, 0.6, 0.9, '#7a5a4a')] },
  { id: 'dining-6', name: 'Dining table, six', w: 2.4, d: 1.8, h: 0.9, parts: [box(0, 0.73, 0, 1.8, 0.05, 0.9, '#7a5a3a'), box(-0.8, 0.36, -0.35, 0.07, 0.72, 0.07, '#5a3f2a'), box(0.8, 0.36, -0.35, 0.07, 0.72, 0.07, '#5a3f2a'), box(-0.8, 0.36, 0.35, 0.07, 0.72, 0.07, '#5a3f2a'), box(0.8, 0.36, 0.35, 0.07, 0.72, 0.07, '#5a3f2a'), ...chair(-0.6, -0.72), ...chair(0, -0.72), ...chair(0.6, -0.72), ...chair(-0.6, 0.72, '#6d5138', Math.PI), ...chair(0, 0.72, '#6d5138', Math.PI), ...chair(0.6, 0.72, '#6d5138', Math.PI)] },
  { id: 'dining-4', name: 'Dining table, four', w: 1.8, d: 1.6, h: 0.9, parts: [box(0, 0.73, 0, 1.2, 0.05, 0.8, '#7a5a3a'), box(-0.5, 0.36, -0.3, 0.07, 0.72, 0.07, '#5a3f2a'), box(0.5, 0.36, -0.3, 0.07, 0.72, 0.07, '#5a3f2a'), box(-0.5, 0.36, 0.3, 0.07, 0.72, 0.07, '#5a3f2a'), box(0.5, 0.36, 0.3, 0.07, 0.72, 0.07, '#5a3f2a'), ...chair(-0.3, -0.65), ...chair(0.3, -0.65), ...chair(-0.3, 0.65, '#6d5138', Math.PI), ...chair(0.3, 0.65, '#6d5138', Math.PI)] },
  { id: 'wardrobe', name: 'Wardrobe', w: 1.8, d: 0.6, h: 2.1, parts: [box(0, 1.05, 0, 1.8, 2.1, 0.6, '#6d5138'), box(0, 1.05, 0.305, 0.02, 2.0, 0.01, '#3b2a1c'), box(-0.1, 1.05, 0.31, 0.03, 0.3, 0.02, '#c9a45a'), box(0.1, 1.05, 0.31, 0.03, 0.3, 0.02, '#c9a45a')] },
  { id: 'fridge', name: 'Fridge', w: 0.7, d: 0.7, h: 1.75, parts: [box(0, 0.875, 0, 0.7, 1.75, 0.7, '#d8d8d8'), box(0.25, 1.1, 0.36, 0.04, 0.5, 0.02, '#8a8a8a'), box(0, 1.2, 0.355, 0.68, 0.01, 0.01, '#9a9a9a')] },
  { id: 'tv-unit', name: 'TV unit', w: 1.6, d: 0.45, h: 1.3, parts: [box(0, 0.25, 0, 1.6, 0.5, 0.45, '#4a4a4a'), box(0, 0.95, -0.1, 1.2, 0.7, 0.03, '#111111'), box(0, 0.58, -0.1, 0.4, 0.16, 0.12, '#333333')] },
  { id: 'desk', name: 'Desk and chair', w: 1.2, d: 1.2, h: 0.9, parts: [box(0, 0.73, -0.3, 1.2, 0.04, 0.6, '#9a7b5a'), box(-0.55, 0.36, -0.3, 0.05, 0.72, 0.55, '#5a3f2a'), box(0.55, 0.36, -0.3, 0.05, 0.72, 0.55, '#5a3f2a'), ...chair(0, 0.3, '#3a3a3a', Math.PI)] },
  { id: 'bookshelf', name: 'Bookshelf', w: 0.9, d: 0.3, h: 1.8, parts: [box(0, 0.9, 0, 0.9, 1.8, 0.3, '#7a5a3a'), box(0, 0.45, 0.02, 0.8, 0.3, 0.26, '#c9a45a'), box(0, 0.9, 0.02, 0.8, 0.3, 0.26, '#5b6b7a'), box(0, 1.35, 0.02, 0.8, 0.3, 0.26, '#8a4f3b')] },
  { id: 'washing', name: 'Washing machine', w: 0.6, d: 0.6, h: 0.85, parts: [box(0, 0.425, 0, 0.6, 0.85, 0.6, '#e8e8e8'), box(0, 0.42, 0.3, 0.4, 0.4, 0.02, '#333a44')] },
  { id: 'plant', name: 'Plant', w: 0.5, d: 0.5, h: 1.4, parts: [box(0, 0.2, 0, 0.4, 0.4, 0.4, '#8a4f3b'), box(0, 0.8, 0, 0.5, 0.8, 0.5, '#3f7a35'), box(0, 1.2, 0, 0.3, 0.4, 0.3, '#5f9440')] },
  { id: 'rug', name: 'Rug', w: 2.0, d: 1.4, h: 0.02, parts: [box(0, 0.01, 0, 2.0, 0.02, 1.4, '#9a4a3a')] },
];

function init() {
  const params = new URLSearchParams(location.search);
  const here = flatFromParams(params);
  const plan = here.plan;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  document.title = `${flatTitle(here)} in 3D · Ratan Galaxy`;

  // ---------- the panel: name the flat, list the rooms ----------
  const q = (sel) => panel.querySelector(sel);
  q('[data-where]').textContent = flatTitle(here);
  q('[data-type]').textContent = plan.name;
  q('[data-facts]').textContent = `${plan.superArea.toLocaleString('en-IN')} sq ft super area, ${plan.carpet} carpet · sample price ${plan.priceText} · ${BLOCKS[here.block].phase}, finished ${BLOCKS[here.block].done}`;
  q('[data-block-link]').href = `/towers/block-${here.block.toLowerCase()}.html`;
  q('[data-block-link]').textContent = BLOCKS[here.block].name;
  const roomsList = q('[data-rooms]');
  plan.rooms.forEach((r) => {
    const li = document.createElement('li');
    const b = document.createElement('button'); b.type = 'button'; b.textContent = `${r.name} · ${fmt(r.w)} by ${fmt(r.h)} ft`; b.dataset.room = r.id; li.append(b); roomsList.append(li);
  });
  const pickForm = q('form[data-pick-flat]');
  if (pickForm) { pickForm.elements.block.value = here.block; pickForm.elements.floor.value = here.floor; pickForm.elements.flat.value = here.flat; }

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: !coarse, powerPreference: 'high-performance' }); } catch { stage.classList.add('no-3d'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.75));
  renderer.shadowMap.enabled = !coarse; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'The flat in three dimensions. Drag to look, keys to move, drag a piece to place it.');
  canvas.tabIndex = 0;
  stage.append(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe6ec');
  scene.fog = new THREE.Fog('#dfe6ec', 60, 400);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.5; pmrem.dispose();
  const walkCam = new THREE.PerspectiveCamera(68, 1, 0.05, 600);
  const planCam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
  planCam.up.set(0, 0, -1);
  let view = 'walk';

  // ---------- the rooms: floors, walls, doors, windows, rails ----------
  const M = (ft) => ft * FT;
  const rooms = plan.rooms.map((r) => ({ ...r, mx: M(r.x), mz: M(r.y), mw: M(r.w), md: M(r.h) }));
  const byId = Object.fromEntries(rooms.map((r) => [r.id, r]));
  const bounds = rooms.reduce((b, r) => ({ x0: Math.min(b.x0, r.mx), z0: Math.min(b.z0, r.mz), x1: Math.max(b.x1, r.mx + r.mw), z1: Math.max(b.z1, r.mz + r.md) }), { x0: 1e9, z0: 1e9, x1: -1e9, z1: -1e9 });
  const centre = new THREE.Vector3((bounds.x0 + bounds.x1) / 2, 0, (bounds.z0 + bounds.z1) / 2);
  const flatGroup = new THREE.Group(); scene.add(flatGroup);

  // ---------- materials drawn on canvases: tiles, planks, plaster, the facade ----------
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  let tseed = 29; const trnd = () => { tseed = (tseed * 16807) % 2147483647; return tseed / 2147483647; };
  const makeTex = (size, draw) => { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
  const speckle = (g, size, base, n, dark = 0.08, light = 0.06, w = 2) => { g.fillStyle = base; g.fillRect(0, 0, size, size); for (let i = 0; i < n; i++) { g.fillStyle = trnd() < 0.5 ? `rgba(0,0,0,${(trnd() * dark).toFixed(3)})` : `rgba(255,255,255,${(trnd() * light).toFixed(3)})`; g.fillRect(trnd() * size, trnd() * size, 1 + trnd() * w, 1 + trnd() * w); } };
  const grid = (g, size, step, line, w = 2) => { g.fillStyle = line; for (let i = 0; i <= size; i += step) { g.fillRect(i - w / 2, 0, w, size); g.fillRect(0, i - w / 2, size, w); } };
  // one tile per floor kind; edge is how many metres one repeat of it covers
  const FLOORS = {
    tile: { tex: makeTex(256, (g, s) => { speckle(g, s, '#e6e0d3', 4000, 0.06, 0.08, 3); grid(g, s, 128, 'rgba(90,80,70,0.35)'); }), edge: 1.2, rough: 0.4 },
    wood: { tex: makeTex(256, (g, s) => { speckle(g, s, '#b07c4f', 5000, 0.18, 0.08, 1); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 400; i++) g.fillRect(trnd() * s, trnd() * s, 2 + trnd() * 40, 1); g.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < s; y += 32) { g.fillRect(0, y, s, 2); g.fillRect(((y / 32) % 2) * 128, y, 2, 32); } }), edge: 1.0, rough: 0.6 },
    kitchen: { tex: makeTex(256, (g, s) => { speckle(g, s, '#9c8c7a', 5000, 0.12, 0.06, 3); grid(g, s, 64, 'rgba(40,30,20,0.35)'); }), edge: 0.6, rough: 0.45 },
    bath: { tex: makeTex(256, (g, s) => { speckle(g, s, '#a9bcc4', 3000, 0.08, 0.1, 3); grid(g, s, 32, 'rgba(255,255,255,0.5)'); }), edge: 0.6, rough: 0.35 },
    balcony: { tex: makeTex(256, (g, s) => { speckle(g, s, '#b86f4e', 5000, 0.16, 0.06, 3); grid(g, s, 64, 'rgba(60,30,20,0.4)', 3); }), edge: 0.6, rough: 0.8 },
    plain: { tex: makeTex(256, (g, s) => { speckle(g, s, '#cfc9bd', 4000, 0.08, 0.06, 3); grid(g, s, 128, 'rgba(60,50,40,0.25)'); }), edge: 0.6, rough: 0.6 },
  };
  const FLOOR_OF = { living: 'tile', dining: 'tile', passage: 'tile', bed: 'wood', kitchen: 'kitchen', toilet: 'bath', balcony: 'balcony', store: 'plain', servant: 'plain', dress: 'wood' };
  const plasterTex = makeTex(256, (g, s) => speckle(g, s, '#efe9df', 5000, 0.06, 0.05, 3)); plasterTex.repeat.set(2, 1);
  const ceilingTex = makeTex(256, (g, s) => speckle(g, s, '#f4f1eb', 4000, 0.04, 0.04, 3)); ceilingTex.repeat.set(6, 6);
  const grassTex = makeTex(256, (g, s) => speckle(g, s, '#6f9a45', 9000, 0.22, 0.1, 2)); grassTex.repeat.set(220, 220);
  const facadeTex = makeTex(256, (g, s) => { speckle(g, s, '#ece3d2', 3000, 0.06, 0.05, 3); g.fillStyle = '#5c7389'; g.fillRect(64, 70, 128, 110); g.fillStyle = '#4a4440'; g.fillRect(60, 66, 136, 4); g.fillRect(60, 180, 136, 4); g.fillStyle = '#8a4f3b'; g.fillRect(0, 236, s, 20); });

  const wallMat = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 });
  const skirtMat = new THREE.MeshStandardMaterial({ color: '#5a4634', roughness: 0.7 });
  const doorMat = new THREE.MeshStandardMaterial({ color: '#7a5235', roughness: 0.55 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#4a3f38', roughness: 0.7, metalness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#bcd3e4', roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.45, side: THREE.DoubleSide, envMapIntensity: 1.2 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#5a5a5a', roughness: 0.6 });
  rooms.forEach((r) => {
    const kind = FLOORS[FLOOR_OF[r.kind] || 'plain'], tex = kind.tex.clone(); tex.repeat.set(r.mw / kind.edge, r.md / kind.edge); tex.needsUpdate = true;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(r.mw, r.md), new THREE.MeshStandardMaterial({ map: tex, roughness: kind.rough, metalness: 0.02 }));
    f.rotation.x = -Math.PI / 2; f.position.set(r.mx + r.mw / 2, r.kind === 'balcony' ? -0.02 : 0, r.mz + r.md / 2); f.receiveShadow = true; f.userData.room = r; flatGroup.add(f);
  });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(bounds.x1 - bounds.x0 + 1, bounds.z1 - bounds.z0 + 1), new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 1, side: THREE.DoubleSide }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.set(centre.x, WALL_H, centre.z); flatGroup.add(ceiling);
  // a light in every room, and a ceiling fan in the rooms people sit in
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff6e4', emissive: '#ffe8b8', emissiveIntensity: 1.6, roughness: 0.5 });
  const fanMat = new THREE.MeshStandardMaterial({ color: '#e9e4da', roughness: 0.5, metalness: 0.3 });
  const fans = [];
  rooms.forEach((r) => {
    if (r.kind === 'balcony') return;
    const cx = r.mx + r.mw / 2, cz = r.mz + r.md / 2, sits = ['living', 'dining', 'bed'].includes(r.kind) && r.mw > 2.4 && r.md > 2.4;
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 20), lampMat); lamp.position.set(cx + (sits ? Math.min(0.9, r.mw * 0.3) : 0), WALL_H - 0.03, cz); flatGroup.add(lamp);
    if (!sits) return;
    const fan = new THREE.Group(); fan.position.set(cx, WALL_H - 0.35, cz);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), fanMat); rod.position.y = 0.175; fan.add(rod);
    fan.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 16), fanMat));
    const blades = new THREE.Group(); blades.position.y = -0.03;
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.012, 0.11), fanMat); b.position.x = 0.36; const arm = new THREE.Group(); arm.rotation.y = (i / 3) * Math.PI * 2; arm.add(b); blades.add(arm); }
    fan.add(blades); flatGroup.add(fan); fans.push(blades);
  });

  // every room edge goes on a line; each line is cut into pieces by the ends of rooms, doors and openings
  const lines = new Map();
  const line = (dir, c) => { const k = `${dir}:${c.toFixed(2)}`; if (!lines.has(k)) lines.set(k, { dir, c, items: [], doors: [], opens: [] }); return lines.get(k); };
  plan.rooms.forEach((r) => {
    line('h', r.y).items.push({ a: r.x, b: r.x + r.w, room: r }); line('h', r.y + r.h).items.push({ a: r.x, b: r.x + r.w, room: r });
    line('v', r.x).items.push({ a: r.y, b: r.y + r.h, room: r }); line('v', r.x + r.w).items.push({ a: r.y, b: r.y + r.h, room: r });
  });
  const edgeOf = (r, side) => side === 'n' ? ['h', r.y, r.x] : side === 's' ? ['h', r.y + r.h, r.x] : side === 'w' ? ['v', r.x, r.y] : ['v', r.x + r.w, r.y];
  plan.doors.forEach((d) => { const r = byId[d.room]; const [dir, c, start] = edgeOf(r, d.side); line(dir, c).doors.push([start + d.at, start + d.at + d.w, r.kind === 'balcony']); });
  (plan.open || []).forEach(([ai, bi]) => {
    const a = byId[ai], b = byId[bi];
    const near = (u, v) => Math.abs(u - v) < 0.05;
    if (near(a.x + a.w, b.x) || near(b.x + b.w, a.x)) { const lo = Math.max(a.y, b.y), hi = Math.min(a.y + a.h, b.y + b.h); if (hi > lo) line('v', near(a.x + a.w, b.x) ? b.x : a.x).opens.push([lo, hi]); }
    if (near(a.y + a.h, b.y) || near(b.y + b.h, a.y)) { const lo = Math.max(a.x, b.x), hi = Math.min(a.x + a.w, b.x + b.w); if (hi > lo) line('h', near(a.y + a.h, b.y) ? b.y : a.y).opens.push([lo, hi]); }
  });
  const openings = []; // segments you can walk through, in metres: [x1, z1, x2, z2]
  const piece = (dir, c, p, qq, y0, y1, mat, thick = WALL_T) => { // a stretch of wall on a line, between heights y0 and y1
    const len = M(qq - p); if (len <= 0.005 || y1 <= y0) return;
    const m = new THREE.Mesh(new THREE.BoxGeometry(dir === 'h' ? len : thick, y1 - y0, dir === 'h' ? thick : len), mat);
    m.position.set(dir === 'h' ? M((p + qq) / 2) : M(c), (y0 + y1) / 2, dir === 'h' ? M(c) : M((p + qq) / 2));
    m.castShadow = m.receiveShadow = true; flatGroup.add(m);
    if (mat === wallMat && y0 === 0) { const sk = new THREE.Mesh(new THREE.BoxGeometry(dir === 'h' ? len : thick + 0.03, 0.1, dir === 'h' ? thick + 0.03 : len), skirtMat); sk.position.set(m.position.x, 0.05, m.position.z); flatGroup.add(sk); }
  };
  const doorAt = (dir, c, p, qq) => { // a frame round the opening and a leaf standing open on its hinge
    const w = M(qq - p); if (w < 0.5) return;
    const jamb = (at) => { const j = new THREE.Mesh(new THREE.BoxGeometry(dir === 'h' ? 0.06 : WALL_T + 0.04, DOOR_H, dir === 'h' ? WALL_T + 0.04 : 0.06), frameMat); j.position.set(dir === 'h' ? M(at) : M(c), DOOR_H / 2, dir === 'h' ? M(c) : M(at)); flatGroup.add(j); };
    jamb(p); jamb(qq);
    const hinge = new THREE.Group(); hinge.position.set(dir === 'h' ? M(p) + 0.03 : M(c), 0, dir === 'h' ? M(c) : M(p) + 0.03);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, DOOR_H - 0.04, 0.04), doorMat); leaf.position.set((w - 0.08) / 2, DOOR_H / 2, 0); leaf.castShadow = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), railMat); knob.position.set(w - 0.2, 1.0, 0.04);
    hinge.add(leaf, knob); hinge.rotation.y = (dir === 'h' ? 0 : -Math.PI / 2) + 1.25; flatGroup.add(hinge);
  };
  for (const L of lines.values()) {
    const cuts = [...new Set([...L.items.flatMap((i) => [i.a, i.b]), ...L.doors.flatMap((d) => [d[0], d[1]]), ...L.opens.flatMap((o) => [o[0], o[1]])].map((v) => +v.toFixed(3)))].sort((a, b) => a - b);
    for (let i = 0; i + 1 < cuts.length; i++) {
      const p = cuts[i], qq = cuts[i + 1], mid = (p + qq) / 2;
      if (qq - p < 0.01) continue;
      const covering = L.items.filter((it) => it.a - 0.01 <= mid && it.b + 0.01 >= mid);
      if (!covering.length) continue;
      const seg = L.dir === 'h' ? [M(p), M(L.c), M(qq), M(L.c)] : [M(L.c), M(p), M(L.c), M(qq)];
      const door = L.doors.find((d) => d[0] - 0.01 <= mid && d[1] + 0.01 >= mid);
      if (door) { openings.push(seg); piece(L.dir, L.c, p, qq, DOOR_H, WALL_H, wallMat); if (door[2]) piece(L.dir, L.c, p, qq, 0.02, DOOR_H, glassMat, 0.03); else doorAt(L.dir, L.c, p, qq); continue; } // a balcony door is glass
      if (L.opens.some((o) => o[0] - 0.01 <= mid && o[1] + 0.01 >= mid)) { openings.push(seg); continue; }
      const outer = covering.length === 1, room = covering[0].room;
      if (outer && room.kind === 'balcony') { piece(L.dir, L.c, p, qq, 0, 0.12, railMat, 0.1); piece(L.dir, L.c, p, qq, 0.98, 1.05, railMat, 0.06); for (let s = p + 0.5; s < qq; s += 1.5) piece(L.dir, L.c, s, s + 0.12, 0.1, 1.0, railMat, 0.05); continue; }
      if (outer && WINDOWED.has(room.kind) && qq - p >= 4.5) { // a window in the middle of an outer wall
        const wl = Math.min(4.5, qq - p - 1.5), ws = mid - wl / 2, we = mid + wl / 2;
        piece(L.dir, L.c, p, ws, 0, WALL_H, wallMat); piece(L.dir, L.c, we, qq, 0, WALL_H, wallMat);
        piece(L.dir, L.c, ws, we, 0, 0.9, wallMat); piece(L.dir, L.c, ws, we, 2.1, WALL_H, wallMat);
        piece(L.dir, L.c, ws, we, 0.9, 2.1, glassMat, 0.02); piece(L.dir, L.c, ws, we, 0.86, 0.94, frameMat, 0.2); piece(L.dir, L.c, ws, we, 2.06, 2.14, frameMat, 0.2);
        continue;
      }
      piece(L.dir, L.c, p, qq, 0, WALL_H, wallMat);
    }
  }

  // ---------- the world outside: the ground far below, the neighbours, the other blocks as masses ----------
  const drop = -(here.floor * FLOOR_H + 1);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = drop; ground.receiveShadow = true; scene.add(ground);
  const facadeMat = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.9 }), slabMat = new THREE.MeshStandardMaterial({ color: '#cfc6b8', roughness: 1 });
  const below = new THREE.Mesh(new THREE.BoxGeometry(bounds.x1 - bounds.x0 + 6, -drop - 0.3, bounds.z1 - bounds.z0 + 6), [facadeMat, facadeMat, slabMat, slabMat, facadeMat, facadeMat]);
  facadeTex.repeat.set(Math.round((bounds.x1 - bounds.x0 + 6) / 3.5), Math.max(1, here.floor));
  below.position.set(centre.x, drop + (-drop - 0.3) / 2, centre.z); scene.add(below); // the floors under this one
  let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const hoodTex = facadeTex.clone(); hoodTex.repeat.set(5, 5); hoodTex.needsUpdate = true;
  const hoods = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: hoodTex, roughness: 0.95 }), 70);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 70; i++) {
    const a = rnd() * 6.283, dist = 60 + rnd() * 300, w = 10 + rnd() * 16, fl = 1 + Math.floor(rnd() * 9);
    dummy.position.set(centre.x + Math.cos(a) * dist, drop + (fl * 3.2) / 2, centre.z + Math.sin(a) * dist); dummy.scale.set(w, fl * 3.2, w * (0.6 + rnd())); dummy.rotation.set(0, rnd() * 3, 0); dummy.updateMatrix(); hoods.setMatrixAt(i, dummy.matrix);
  }
  scene.add(hoods);
  const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.4, 1), new THREE.MeshStandardMaterial({ color: '#4f8a3c', roughness: 1 }), 160);
  for (let i = 0; i < 160; i++) { const a = rnd() * 6.283, dist = 25 + rnd() * 300; dummy.position.set(centre.x + Math.cos(a) * dist, drop + 2.5, centre.z + Math.sin(a) * dist); dummy.scale.setScalar(0.8 + rnd()); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); trees.setMatrixAt(i, dummy.matrix); }
  scene.add(trees);
  // the sky: a dome with a haze at the horizon and the afternoon sun in it
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 12), new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color('#3b78c6') }, horizon: { value: new THREE.Color('#e4e6e0') }, sunDir: { value: new THREE.Vector3(-0.45, 0.6, 0.55).normalize() }, sunColor: { value: new THREE.Color('#ffd79a') } },
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vDir = normalize(w.xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vDir;
      void main() { vec3 d = normalize(vDir); float t = pow(clamp(d.y, 0.0, 1.0), 0.45); vec3 c = mix(horizon, top, t);
        float s = max(dot(d, sunDir), 0.0); c += sunColor * (pow(s, 4.0) * 0.2 + pow(s, 48.0) * 0.7 + pow(s, 900.0) * 3.0); gl_FragColor = vec4(c, 1.0); }`,
  }));
  sky.renderOrder = -1; scene.add(sky);

  // ---------- light ----------
  const sun = new THREE.DirectionalLight('#fff1dc', 2.6);
  sun.position.set(centre.x - 20, 30, centre.z + 25); sun.target.position.copy(centre); sun.castShadow = !coarse;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 5, far: 90 }); sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight('#cfe0f0', '#8a7a62', 0.9));
  scene.add(new THREE.AmbientLight('#fff4e6', 0.25));

  // ---------- the walker: eye height, doors only ----------
  const entry = byId[plan.entry.room];
  const walker = { pos: new THREE.Vector3(entry.mx + entry.mw / 2, 1.6, entry.mz + entry.md / 2), yaw: 0, pitch: 0 };
  walker.yaw = Math.atan2(walker.pos.x - centre.x, walker.pos.z - centre.z); // face into the flat
  const roomAt = (x, z) => rooms.find((r) => x >= r.mx - 0.02 && x <= r.mx + r.mw + 0.02 && z >= r.mz - 0.02 && z <= r.mz + r.md + 0.02);
  const distToSeg = (px, pz, [x1, z1, x2, z2]) => { const dx = x2 - x1, dz = z2 - z1, l2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / l2)); return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz)); };
  const canStep = (from, to) => {
    const a = roomAt(from.x, from.z), b = roomAt(to.x, to.z);
    if (!b) return false;
    if (a === b) return true;
    const mx = (from.x + to.x) / 2, mz = (from.z + to.z) / 2;
    return openings.some((s) => distToSeg(mx, mz, s) < 0.45);
  };
  const marker = new THREE.Group(); // where you stand, seen on the plan
  marker.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 16), new THREE.MeshStandardMaterial({ color: '#c9a45a' })));
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: '#0c0a08' })); nose.position.z = -0.35; marker.add(nose);
  marker.visible = false; scene.add(marker);

  // ---------- furniture ----------
  const pieces = new THREE.Group(); scene.add(pieces);
  const store = `rg-flat-${plan.id}`;
  let layout = [];
  try { layout = JSON.parse(localStorage.getItem(store) || '[]'); if (!Array.isArray(layout)) layout = []; } catch { layout = []; }
  const save = () => { try { localStorage.setItem(store, JSON.stringify(layout)); } catch { /* private window or full: the layout stays for this visit */ } updateCount(); };
  const texLoader = new THREE.TextureLoader();
  const buildPiece = (item) => {
    const g = new THREE.Group(); g.userData.item = item;
    const cat = CATALOGUE.find((c) => c.id === item.kind);
    if (cat) cat.parts.forEach((p) => { const m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), new THREE.MeshStandardMaterial({ color: p.c, roughness: 0.8 })); m.position.set(p.x, p.y, p.z); m.castShadow = m.receiveShadow = true; g.add(m); });
    else { // a scanned piece: a block of its size and colour, the photograph on its front
      const m = new THREE.Mesh(new THREE.BoxGeometry(item.w, item.h, item.d), new THREE.MeshStandardMaterial({ color: item.colour || '#8a7f72', roughness: 0.85 }));
      m.position.y = item.h / 2; m.castShadow = m.receiveShadow = true; g.add(m);
      if (item.img) { const tex = texLoader.load(item.img); tex.colorSpace = THREE.SRGBColorSpace; const face = new THREE.Mesh(new THREE.PlaneGeometry(item.w * 0.96, item.h * 0.96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })); face.position.set(0, item.h / 2, item.d / 2 + 0.005); g.add(face); }
    }
    g.position.set(item.x, 0, item.z); g.rotation.y = (item.rot || 0) * Math.PI / 2;
    pieces.add(g); return g;
  };
  layout.forEach(buildPiece);

  let selected = null, dragging = null, dragOff = new THREE.Vector3();
  const selectedBox = q('[data-selected]');
  const setSelected = (g) => {
    if (selected) selected.traverse((m) => { if (m.isMesh && m.material.emissive) m.material.emissive.setHex(0); });
    selected = g;
    if (selected) { selected.traverse((m) => { if (m.isMesh && m.material.emissive) { m.material.emissive.set('#c9a45a'); m.material.emissiveIntensity = 0.35; } }); selectedBox.hidden = false; selectedBox.querySelector('[data-selected-name]').textContent = selected.userData.item.name; }
    else selectedBox.hidden = true;
  };
  const topPiece = (obj) => { let o = obj; while (o && o.parent !== pieces) o = o.parent; return o; };
  const clampInside = (v) => { v.x = Math.min(bounds.x1 - 0.2, Math.max(bounds.x0 + 0.2, v.x)); v.z = Math.min(bounds.z1 - 0.2, Math.max(bounds.z0 + 0.2, v.z)); return v; };
  const addPiece = (item) => {
    const spot = view === 'plan' ? centre.clone() : walker.pos.clone().add(new THREE.Vector3(Math.sin(walker.yaw), 0, Math.cos(walker.yaw)).multiplyScalar(-2.2));
    clampInside(spot); item.x = spot.x; item.z = spot.z; item.rot = item.rot || 0;
    layout.push(item); const g = buildPiece(item); setSelected(g); save();
  };
  const catalogue = q('[data-catalogue]');
  CATALOGUE.forEach((c) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = c.name; b.dataset.add = c.id; catalogue.append(b); });
  catalogue.addEventListener('click', (e) => { const id = e.target.dataset.add; if (!id) return; const c = CATALOGUE.find((x) => x.id === id); addPiece({ id: crypto.randomUUID?.() || String(Date.now()), kind: c.id, name: c.name, w: c.w, d: c.d, h: c.h }); });
  const rotateSelected = () => { if (!selected) return; const it = selected.userData.item; it.rot = ((it.rot || 0) + 1) % 4; selected.rotation.y = it.rot * Math.PI / 2; save(); };
  const removeSelected = () => { if (!selected) return; const it = selected.userData.item; layout = layout.filter((x) => x !== it); pieces.remove(selected); setSelected(null); save(); };
  selectedBox.querySelector('[data-rotate]').addEventListener('click', rotateSelected);
  selectedBox.querySelector('[data-remove]').addEventListener('click', removeSelected);
  q('[data-clear]').addEventListener('click', () => { if (!layout.length || !confirm('Take every piece out of the flat?')) return; layout = []; [...pieces.children].forEach((c) => pieces.remove(c)); setSelected(null); save(); });
  const updateCount = () => { q('[data-count]').textContent = layout.length ? `${layout.length} piece${layout.length === 1 ? '' : 's'} in the flat, kept in this browser.` : 'Nothing in the flat yet.'; };
  updateCount();

  // ---------- scanning a piece of your own ----------
  const scanFile = q('[data-scan-file]'), scanNote = q('[data-scan-note]'), scanGo = q('[data-scan-go]'), scanStatus = q('[data-scan-status]'), scanResult = q('[data-scan-result]');
  let scanned = null, scanThumb = null;
  const shrink = (file, max, quality) => new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', quality)); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')); };
    img.src = url;
  });
  scanGo?.addEventListener('click', async () => {
    const file = scanFile.files?.[0];
    if (!file) { scanStatus.textContent = 'Choose a photograph first.'; return; }
    scanGo.disabled = true; scanResult.hidden = true; scanStatus.textContent = 'Reading the picture…';
    try {
      const [image, thumb] = await Promise.all([shrink(file, 1024, 0.82), shrink(file, 320, 0.7)]);
      const r = await fetch('/api/scan', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ image, note: scanNote.value }) });
      const data = await r.json();
      if (!data.ok) { scanStatus.textContent = data.error || 'The scan did not work.'; return; }
      scanned = data.item; scanThumb = thumb;
      scanStatus.textContent = '';
      scanResult.hidden = false;
      let pic = scanResult.querySelector('img');
      if (!pic) { pic = document.createElement('img'); pic.alt = 'The photograph you chose'; pic.width = 120; scanResult.prepend(pic); }
      pic.src = thumb;
      scanResult.querySelector('[data-scan-name]').textContent = scanned.name;
      scanResult.querySelector('[data-scan-size]').textContent = `${scanned.width_cm} wide, ${scanned.depth_cm} deep, ${scanned.height_cm} cm tall · ${scanned.material || 'material unknown'} · colour ${scanned.colour_hex} · ${scanned.confidence} confidence`;
      scanResult.querySelector('[data-scan-note-out]').textContent = scanned.note || '';
      scanResult.querySelector('[data-scan-swatch]').style.background = scanned.colour_hex;
    } catch (err) { scanStatus.textContent = err.message === 'not an image' ? 'That file is not a picture.' : 'The server did not answer. Try again.'; }
    finally { scanGo.disabled = false; }
  });
  scanResult?.querySelector('[data-scan-place]')?.addEventListener('click', () => {
    if (!scanned) return;
    addPiece({ id: crypto.randomUUID?.() || String(Date.now()), kind: 'scan', name: scanned.name, w: scanned.width_cm / 100, d: scanned.depth_cm / 100, h: scanned.height_cm / 100, colour: scanned.colour_hex, img: scanThumb });
    scanResult.hidden = true; scanStatus.textContent = `${scanned.name} is in the flat. Drag it where it goes.`;
  });

  // ---------- pointer: drag a piece, or look around ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  const cam = () => (view === 'walk' ? walkCam : planCam);
  const setNdc = (e) => { const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  let looking = null;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus({ preventScroll: true }); setNdc(e); raycaster.setFromCamera(ndc, cam());
    const hit = raycaster.intersectObjects(pieces.children, true)[0];
    if (hit) { const g = topPiece(hit.object); setSelected(g); dragging = g; raycaster.ray.intersectPlane(floorPlane, hitPoint); dragOff.copy(g.position).sub(hitPoint); canvas.setPointerCapture(e.pointerId); return; }
    if (view === 'plan') { if (raycaster.ray.intersectPlane(floorPlane, hitPoint) && roomAt(hitPoint.x, hitPoint.z)) { walker.pos.x = hitPoint.x; walker.pos.z = hitPoint.z; } setSelected(null); return; }
    looking = { x: e.clientX, y: e.clientY, yaw: walker.yaw, pitch: walker.pitch }; canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (dragging) { setNdc(e); raycaster.setFromCamera(ndc, cam()); if (raycaster.ray.intersectPlane(floorPlane, hitPoint)) { const p = clampInside(hitPoint.add(dragOff)); dragging.position.set(p.x, 0, p.z); } return; }
    if (looking) { walker.yaw = looking.yaw - (e.clientX - looking.x) * 0.006; walker.pitch = Math.max(-1.2, Math.min(1.2, looking.pitch + (e.clientY - looking.y) * 0.004)); }
  });
  const endPointer = () => { if (dragging) { const it = dragging.userData.item; it.x = dragging.position.x; it.z = dragging.position.z; save(); } dragging = null; looking = null; };
  canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('dblclick', () => { if (selected) rotateSelected(); });

  // keys: WASD and arrows walk, R turns a piece, Delete takes it out, P and V switch the view
  const keys = new Set();
  canvas.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys.add(e.key.toLowerCase());
    if (e.key.toLowerCase() === 'r') rotateSelected();
    if (e.key === 'Delete' || e.key === 'Backspace') { removeSelected(); e.preventDefault(); }
    if (e.key.toLowerCase() === 'p') setView('plan');
    if (e.key.toLowerCase() === 'v') setView('walk');
  });
  canvas.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  canvas.addEventListener('blur', () => keys.clear());
  const pad = document.getElementById('flat-dpad');
  if (pad) {
    pad.hidden = !coarse;
    pad.querySelectorAll('button').forEach((b) => { const k = b.dataset.key; const on = (e) => { e.preventDefault(); keys.add(k); }; const off = () => keys.delete(k); b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); });
  }

  // ---------- views ----------
  const help = q('[data-help]');
  const setView = (v) => {
    view = v;
    panel.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    ceiling.visible = v === 'walk'; marker.visible = v === 'plan';
    help.textContent = v === 'walk' ? (coarse ? 'Drag to look round. The pad walks you; doors only. Tap a piece to pick it up and drag it.' : 'Drag to look round. W A S D or the arrows walk you; doors only. Drag a piece to move it, R turns it, Delete takes it out, P for the plan.')
      : (coarse ? 'Drag a piece to move it, double tap to turn it. Tap the floor to stand there, then switch to Walk.' : 'Drag a piece to move it, R or a double click turns it, Delete takes it out. Click the floor to stand there, V to walk from it.');
    resize(); fitPlan();
  };
  panel.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { setView(b.dataset.view); canvas.focus({ preventScroll: true }); }));
  roomsList.addEventListener('click', (e) => { const id = e.target.dataset.room; if (!id) return; const r = byId[id]; walker.pos.set(r.mx + r.mw / 2, 1.6, r.mz + r.md / 2); walker.pitch = 0; setView('walk'); canvas.focus({ preventScroll: true }); });
  const fitPlan = () => {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    const pw = bounds.x1 - bounds.x0 + 2, ph = bounds.z1 - bounds.z0 + 2;
    const s = Math.max(pw / w, ph / h);
    planCam.left = -w * s / 2; planCam.right = w * s / 2; planCam.top = h * s / 2; planCam.bottom = -h * s / 2;
    planCam.position.set(centre.x, 40, centre.z); planCam.lookAt(centre.x, 0, centre.z); planCam.updateProjectionMatrix();
  };
  const resize = () => { const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); walkCam.aspect = w / h; walkCam.fov = w < h ? 78 : 68; walkCam.updateProjectionMatrix(); fitPlan(); };
  new ResizeObserver(resize).observe(stage);
  resize();

  // ---------- room labels, kept in HTML so they stay crisp ----------
  const labelsBox = document.getElementById('flat-labels');
  const labels = rooms.map((r) => { const s = document.createElement('span'); s.textContent = r.name; labelsBox?.append(s); return { r, s, v: new THREE.Vector3() }; });
  const placeLabels = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    labels.forEach(({ r, s, v }) => {
      v.set(r.mx + r.mw / 2, view === 'walk' ? 2.3 : 0, r.mz + r.md / 2);
      if (view === 'walk' && v.distanceTo(walker.pos) > 9) { s.hidden = true; return; }
      v.project(cam());
      if (v.z > 1 || Math.abs(v.x) > 0.9 || Math.abs(v.y) > 0.95) { s.hidden = true; return; } // off screen, or too near the edge to read whole
      s.hidden = false; s.style.transform = `translate(calc(${(((v.x + 1) / 2) * w).toFixed(1)}px - 50%), calc(${(((1 - v.y) / 2) * h).toFixed(1)}px - 50%))`;
    });
  };

  // ---------- loop ----------
  const clock = new THREE.Clock();
  const fwd = new THREE.Vector3(), side = new THREE.Vector3(), next = new THREE.Vector3();
  const step = (dt) => {
    const speed = 2.6 * dt;
    fwd.set(-Math.sin(walker.yaw), 0, -Math.cos(walker.yaw)); side.set(fwd.z, 0, -fwd.x);
    let dx = 0, dz = 0;
    if (keys.has('w') || keys.has('arrowup')) { dx += fwd.x; dz += fwd.z; }
    if (keys.has('s') || keys.has('arrowdown')) { dx -= fwd.x; dz -= fwd.z; }
    if (keys.has('a') || keys.has('arrowleft')) { dx -= side.x; dz -= side.z; }
    if (keys.has('d') || keys.has('arrowright')) { dx += side.x; dz += side.z; }
    if (!dx && !dz) return;
    const l = Math.hypot(dx, dz); dx = (dx / l) * speed; dz = (dz / l) * speed;
    next.set(walker.pos.x + dx, 1.6, walker.pos.z + dz);
    if (canStep(walker.pos, next)) walker.pos.copy(next);
    else { next.set(walker.pos.x + dx, 1.6, walker.pos.z); if (canStep(walker.pos, next)) walker.pos.copy(next); else { next.set(walker.pos.x, 1.6, walker.pos.z + dz); if (canStep(walker.pos, next)) walker.pos.copy(next); } }
  };
  let raf = 0;
  const render = () => {
    const dt = Math.min(0.1, clock.getDelta());
    if (view === 'walk') step(dt);
    walkCam.position.copy(walker.pos);
    walkCam.rotation.set(0, 0, 0); walkCam.rotation.order = 'YXZ'; walkCam.rotation.y = walker.yaw; walkCam.rotation.x = -walker.pitch;
    marker.position.set(walker.pos.x, 0.06, walker.pos.z); marker.rotation.y = walker.yaw;
    sky.position.copy(walker.pos);
    if (!reduced) fans.forEach((b) => { b.rotation.y += dt * 7; });
    renderer.render(scene, cam());
    placeLabels();
    raf = requestAnimationFrame(render);
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) raf = requestAnimationFrame(render); });
  setView(params.get('view') === 'plan' ? 'plan' : 'walk');
  stage.classList.add('is-3d');
  raf = requestAnimationFrame(render);
  if (reduced) { /* nothing moves on its own here: the camera only goes where you take it */ }
}

function fmt(ft) { const whole = Math.floor(ft), inches = Math.round((ft - whole) * 12); return inches ? `${whole}'${inches}"` : `${whole}'`; }

if (stage && panel) init();
