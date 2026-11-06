// Ratan Galaxy in three dimensions, built from the published master plan: the long plot off the south road, the two
// X-shaped towers and the H-shaped block in a row, ground plus nine floors each, fourteen homes a floor, the pool and
// the club at the east end, the courts at both ends, the gate on the south road, the parking row under the palms, and
// the flat Lucknow country around it. Every home is its own box: point at one and it lights up, click it and a card
// names it and opens the flat viewer. Scrolling brings the camera in; "Take the tour" flies it round the site with
// captions; the light runs from afternoon to dusk and the windows come on. Three.js 0.170.0 from the CDN, a static
// picture when WebGL is missing. Sizes are metres read off the plan at about 240 by 70 for the plot.
import * as THREE from 'three';
import { BLOCKS, PLANS, flatType, ordinal } from './plans.js';

const hero = document.querySelector('.hero');
const stage = document.getElementById('hero-stage');

const FH = 3.1; // one floor, metres
const FLOORS = 9; // homes on floors 1 to 9 above the ground floor

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}

// ---------- where the fourteen homes of a floor sit, in a block's own coordinates ----------
// X tower: four wings on the diagonals, two homes side by side in each of two segments per wing, the inner right hand
// home of two wings given over to the lift lobby. H block: two bars of six homes and two homes on the link.
function floorLayout(shape) {
  const flats = [];
  if (shape === 'x') {
    const wings = [[1, -1], [1, 1], [-1, 1], [-1, -1]]; // NE, SE, SW, NW
    let n = 1;
    wings.forEach(([dx, dz], w) => {
      const l = Math.hypot(dx, dz); dx /= l; dz /= l;
      const px = -dz, pz = dx; // across the wing
      for (const seg of [1, 0]) for (const side of [-1, 1]) {
        const lobby = seg === 0 && side === 1 && (w === 1 || w === 3);
        const r = 9 + seg * 12 + 6;
        flats.push({ n: lobby ? 0 : n++, lobby, cx: dx * r + px * side * 3.5, cz: dz * r + pz * side * 3.5, rot: Math.atan2(-dz, dx), len: 12, wid: 7, side, tip: seg === 1 });
      }
    });
  } else {
    let n = 1;
    for (const bar of [-1, 1]) for (let seg = 0; seg < 3; seg++) for (const side of [-1, 1]) {
      flats.push({ n: n++, lobby: false, cx: bar * 12 + side * 3, cz: (seg - 1) * 16.67, rot: Math.PI / 2, len: 16.67, wid: 6, side, tip: seg !== 1, tipDir: seg === 2 ? -1 : 1 });
      if (seg === 1 && side === 1 && bar === -1) { flats.push({ n: n++, lobby: false, cx: 0, cz: -10.5, rot: 0, len: 12, wid: 7, side: -1, tip: false }); flats.push({ n: n++, lobby: false, cx: 0, cz: 10.5, rot: 0, len: 12, wid: 7, side: 1, tip: false }); }
    }
  }
  return flats;
}

function init() {
  if (!webglAvailable()) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const phone = coarse || innerWidth < 768;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: !phone, powerPreference: 'high-performance', alpha: false }); } catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.25 : 1.5));
  renderer.shadowMap.enabled = !phone;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 1400);
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // ---------- the ground: flat Lucknow country, the plot paved inside its wall ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600, 48, 48), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  {
    const pos = ground.geometry.attributes.position, col = new Float32Array(pos.count * 3);
    const a = new THREE.Color('#8f9361'), b = new THREE.Color('#a39a66'), c = new THREE.Color('#7f8a52');
    for (let i = 0; i < pos.count; i++) { const t = rnd(); tmpColor.copy(a).lerp(t < 0.5 ? b : c, Math.abs(t - 0.5) * 2); col.set([tmpColor.r, tmpColor.g, tmpColor.b], i * 3); }
    ground.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  scene.add(ground);
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(239, 69), new THREE.MeshStandardMaterial({ color: '#8d8984', roughness: 1 }));
  paving.rotation.x = -Math.PI / 2; paving.position.y = 0.06; paving.receiveShadow = true; scene.add(paving);

  const flat = (geo, color, x, z, y = 0.1, rot = 0, extra = {}) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra })); m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
  const lawn = '#5e9542';
  [[-72, -24, 18, 9], [34, -24, 18, 9], [-72, 25, 18, 9], [34, 25, 18, 9], [-50, 2, 10, 20], [8, 2, 10, 20]].forEach(([x, z, w, h]) => flat(new THREE.PlaneGeometry(w, h), lawn, x, z, 0.12));
  flat(new THREE.PlaneGeometry(46, 60), '#64994a', 95, 2, 0.1); // the garden at the east end
  flat(new THREE.PlaneGeometry(20, 56), '#6c9c4c', -110, 0, 0.1); // and the strip at the west end

  // roads: the south road the gate opens on, and the ones down both sides
  const asphalt = '#49474a';
  flat(new THREE.PlaneGeometry(300, 14), asphalt, 0, 43, 0.04);
  flat(new THREE.PlaneGeometry(14, 160), asphalt, -129, 0, 0.04);
  flat(new THREE.PlaneGeometry(14, 160), asphalt, 129, 0, 0.04);
  flat(new THREE.PlaneGeometry(300, 0.25), '#c9b25a', 0, 43, 0.05);
  flat(new THREE.PlaneGeometry(300, 3), '#b9b3a9', 0, 51.5, 0.05); // the footpath across the road
  flat(new THREE.PlaneGeometry(240, 2.5), '#b9b3a9', 0, 34.5, 0.07); // and the one along the wall

  // the parking row inside the south wall, white lines and a few cars
  flat(new THREE.PlaneGeometry(222, 7), '#6f6c6a', 0, 29.5, 0.08);
  const lines = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 5), new THREE.MeshStandardMaterial({ color: '#e8e4dc', roughness: 1 }), 90);
  for (let i = 0; i < 90; i++) { dummy.position.set(-110 + i * 2.5, 0.09, 29.5); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); lines.setMatrixAt(i, dummy.matrix); }
  scene.add(lines);
  const cars = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 1.4, 4.2), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3 }), 34);
  const carColours = ['#d9d6d0', '#2b2b2e', '#8f8f93', '#7a2c2a', '#2c3e6b', '#e9e5dc', '#4a4a4c'];
  for (let i = 0; i < 34; i++) { dummy.position.set(-108 + Math.floor(i * 2.6) * 2.5 + 1.25, 0.75, 29.5); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); cars.setMatrixAt(i, dummy.matrix); cars.setColorAt(i, tmpColor.set(carColours[i % carColours.length])); }
  cars.castShadow = !phone; scene.add(cars);

  // the boundary wall, the gate, the gatehouse
  const wallMat = new THREE.MeshStandardMaterial({ color: '#d8ccb8', roughness: 0.95 });
  const wallPiece = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), wallMat); m.position.set(x, 1.1, z); m.castShadow = !phone; scene.add(m); };
  wallPiece(240, 0.4, 0, -35); wallPiece(0.4, 70, -120, 0); wallPiece(0.4, 70, 120, 0);
  wallPiece(124, 0.4, -58, 35); wallPiece(100, 0.4, 70, 35); // the gap from 4 to 20 is the gate
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#9a5a44', roughness: 0.9 });
  [[4.5, 35], [19.5, 35]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.2, 1.2), pillarMat); p.position.set(x, 2.1, z); p.castShadow = !phone; scene.add(p); });
  const gateBeam = new THREE.Mesh(new THREE.BoxGeometry(16, 0.7, 1), pillarMat); gateBeam.position.set(12, 4.4, 35); scene.add(gateBeam);
  const gatehouse = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 3.5), new THREE.MeshStandardMaterial({ color: '#ece3d3', roughness: 0.9 })); gatehouse.position.set(24, 1.6, 32.5); gatehouse.castShadow = !phone; scene.add(gatehouse);
  flat(new THREE.PlaneGeometry(16, 10), '#7b7774', 12, 31, 0.1); // the drive in

  // courts, the pool, the kids' pool, the sand pit, the club and its amphitheatre, the gazebo
  const court = (x, z, w, h, color) => { flat(new THREE.PlaneGeometry(w, h), color, x, z, 0.14); flat(new THREE.PlaneGeometry(w - 1, 0.12), '#f1ede5', x, z, 0.18); };
  court(-109, -22, 16, 9, '#4f8a46'); court(-109, 26, 14, 8, '#c0683f'); court(110, -20, 16, 9, '#c0683f');
  const waterMat = new THREE.MeshStandardMaterial({ color: '#3f9bb4', roughness: 0.05, metalness: 0.5 });
  flat(new THREE.PlaneGeometry(24, 15), '#d9d0c0', 86, -15, 0.13); // the pool deck
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 40), waterMat); pool.rotation.x = -Math.PI / 2; pool.scale.set(9, 5, 1); pool.position.set(86, 0.2, -16); scene.add(pool);
  const kidsPool = new THREE.Mesh(new THREE.CircleGeometry(3, 24), waterMat); kidsPool.rotation.x = -Math.PI / 2; kidsPool.position.set(96, 0.2, -8); scene.add(kidsPool);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(6, 24), new THREE.MeshStandardMaterial({ color: '#dcc99b', roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.set(86, 0.16, 3); scene.add(sand);
  const clubMat = new THREE.MeshStandardMaterial({ color: '#ebe2d1', roughness: 0.9 });
  const club = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 7, 36), clubMat); club.position.set(104, 3.5, 10); club.castShadow = !phone; scene.add(club);
  const clubRoof = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 0.5, 36), pillarMat); clubRoof.position.set(104, 7.25, 10); scene.add(clubRoof);
  for (let s = 0; s < 3; s++) { const step = new THREE.Mesh(new THREE.CylinderGeometry(11 + s * 1.6, 11 + s * 1.6, 0.4, 36), new THREE.MeshStandardMaterial({ color: s % 2 ? '#c9bda8' : '#d8cdb8', roughness: 1 })); step.position.set(104, 0.2 + (2 - s) * 0.4, 10); scene.add(step); }
  const gazebo = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.3, 8), pillarMat); gazebo.position.set(92, 3.2, 22); scene.add(gazebo);
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 6), clubMat); p.position.set(92 + Math.cos((i / 6) * 6.283) * 2.2, 1.5, 22 + Math.sin((i / 6) * 6.283) * 2.2); scene.add(p); }
  flat(new THREE.PlaneGeometry(2.2, 70), '#9b9793', 70, 0, 0.11); // the path between Block A and the garden
  flat(new THREE.PlaneGeometry(1.8, 44), '#9b9793', 92, -4, 0.12);

  // ---------- the three blocks ----------
  const facadeMat = new THREE.MeshStandardMaterial({ roughness: 0.92 });
  const slabMat = new THREE.MeshStandardMaterial({ color: '#8a4f3b', roughness: 0.9 });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#b4705a', roughness: 0.9 });
  const balconyMat = new THREE.MeshStandardMaterial({ color: '#cbb89c', roughness: 0.95 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#4a3f38', roughness: 0.8, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: '#a9c0d2', emissive: '#ffb860', emissiveIntensity: 0, roughness: 0.25, metalness: 0.4 });
  const blockPos = { C: [-78, 2], B: [-19, 1], A: [40, 2] };
  const records = []; // one per box, in instance order
  const flatMatrices = [], flatColours = [], slabMatrices = [], winMatrices = [], balcMatrices = [], railMatrices = [];
  const cream = new THREE.Color('#ece3d2'), creamB = new THREE.Color('#e4d9c5'), shopC = new THREE.Color('#7f94a6'), under = new THREE.Color('#6a615a'), lobbyC = new THREE.Color('#c9bca6');
  const place = (fl, bx, bz, local) => new THREE.Matrix4().makeTranslation(bx + fl.cx, 0, bz + fl.cz).multiply(new THREE.Matrix4().makeRotationY(fl.rot)).multiply(local);
  for (const id of ['C', 'B', 'A']) {
    const block = BLOCKS[id], [bx, bz] = blockPos[id];
    const layout = floorLayout(block.shape);
    const base = block.ground === 'shops' ? 0 : 1; // B and C stand on a plinth over the basement
    const top = base + (FLOORS + 1) * FH;
    layout.forEach((fl) => {
      for (let floor = 0; floor <= FLOORS; floor++) {
        const y = base + floor * FH;
        const home = floor > 0 && !fl.lobby;
        flatMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(0, y + FH / 2, 0).multiply(new THREE.Matrix4().makeScale(fl.len, FH - 0.08, fl.wid))));
        flatColours.push(floor === 0 ? (block.ground === 'shops' ? shopC : under) : fl.lobby ? lobbyC : (id === 'B' ? creamB : cream).clone().offsetHSL(0, 0, (rnd() - 0.5) * 0.02));
        records.push({ block: id, floor, flat: fl.n, type: home ? flatType(id, fl.n) : null, home });
        // windows along the open side and at the tip; a balcony with a rail on the open side
        if (floor > 0 || block.ground === 'shops') {
          const s = fl.side, zf = s * (fl.wid / 2 + 0.03);
          const count = fl.len > 14 ? 4 : 3;
          for (let k = 0; k < count; k++) {
            winMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation((k - (count - 1) / 2) * (fl.len / count), y + 1.7, zf).multiply(new THREE.Matrix4().makeRotationY(s > 0 ? 0 : Math.PI)).multiply(new THREE.Matrix4().makeScale(floor === 0 ? 2.6 : 1.5, floor === 0 ? 2.4 : 1.3, 1))));
          }
          if (fl.tip) for (const k of [-1.6, 1.6]) winMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation((fl.tipDir || 1) * (fl.len / 2 + 0.03), y + 1.7, k).multiply(new THREE.Matrix4().makeRotationY((fl.tipDir || 1) * Math.PI / 2)).multiply(new THREE.Matrix4().makeScale(1.5, 1.3, 1))));
          if (floor > 0 && !fl.lobby) {
            balcMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(fl.len * 0.18, y + 0.1, s * (fl.wid / 2 + 0.65)).multiply(new THREE.Matrix4().makeScale(3.2, 0.18, 1.3))));
            railMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(fl.len * 0.18, y + 0.65, s * (fl.wid / 2 + 1.27)).multiply(new THREE.Matrix4().makeScale(3.2, 1, 0.06))));
          }
        }
      }
      for (let floor = 0; floor <= FLOORS + 1; floor++) slabMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(0, base + floor * FH, 0).multiply(new THREE.Matrix4().makeScale(fl.len + 0.5, 0.24, fl.wid + 0.5)))); // a slab line at every floor, and the roof
    });
    // the core with the lifts, the machine room and the tanks on the roof, the plinth under B and C
    const core = new THREE.Mesh(new THREE.BoxGeometry(block.shape === 'x' ? 15 : 12, top + 1.2, block.shape === 'x' ? 15 : 14), coreMat); core.position.set(bx, (top + 1.2) / 2, bz); core.castShadow = !phone; core.receiveShadow = true; scene.add(core);
    const machine = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), coreMat); machine.position.set(bx + 3, top + 2.7, bz - 3); machine.castShadow = !phone; scene.add(machine);
    for (const [tx, tz] of [[-4, 3], [-1, 3]]) { const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 12), new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.8 })); tank.position.set(bx + tx, top + 2, bz + tz); scene.add(tank); }
    if (base > 0) { const plinth = new THREE.Mesh(new THREE.BoxGeometry(block.shape === 'x' ? 70 : 40, base, block.shape === 'x' ? 70 : 56), new THREE.MeshStandardMaterial({ color: '#8a827a', roughness: 1 })); plinth.position.set(bx, base / 2, bz); plinth.receiveShadow = true; scene.add(plinth); }
  }
  const flats = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), facadeMat, flatMatrices.length);
  flatMatrices.forEach((m, i) => { flats.setMatrixAt(i, m); flats.setColorAt(i, flatColours[i]); });
  flats.castShadow = !phone; flats.receiveShadow = true; scene.add(flats);
  const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), slabMat, slabMatrices.length);
  slabMatrices.forEach((m, i) => slabs.setMatrixAt(i, m)); slabs.castShadow = !phone; scene.add(slabs);
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glass, winMatrices.length);
  winMatrices.forEach((m, i) => windows.setMatrixAt(i, m)); scene.add(windows);
  const balconies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), balconyMat, balcMatrices.length);
  balcMatrices.forEach((m, i) => balconies.setMatrixAt(i, m)); balconies.castShadow = !phone; scene.add(balconies);
  const rails = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), railMat, railMatrices.length);
  railMatrices.forEach((m, i) => rails.setMatrixAt(i, m)); scene.add(rails);

  // ---------- trees: palms along the parking row, round trees in the lawns and the garden, more outside ----------
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5a4634', roughness: 1 });
  const palms = 24;
  const palmTrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.28, 7, 6), trunkMat, palms);
  const palmCrown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.3, 0), new THREE.MeshStandardMaterial({ color: '#3f7a35', roughness: 1, flatShading: true }), palms);
  for (let i = 0; i < palms; i++) {
    const x = -108 + i * 9.4, z = 25.3;
    dummy.position.set(x, 3.5, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); palmTrunk.setMatrixAt(i, dummy.matrix);
    dummy.position.set(x, 7.2, z); dummy.scale.set(1, 0.5, 1); dummy.rotation.set(0, rnd() * 6, 0); dummy.updateMatrix(); palmCrown.setMatrixAt(i, dummy.matrix);
  }
  palmTrunk.castShadow = palmCrown.castShadow = !phone; scene.add(palmTrunk, palmCrown);
  const TREES = phone ? 260 : 520;
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.4, 1), new THREE.MeshStandardMaterial({ color: '#467f38', roughness: 1, flatShading: true }), TREES);
  const crown2 = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.4, 0), new THREE.MeshStandardMaterial({ color: '#5f9440', roughness: 1, flatShading: true }), TREES);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.3, 2.4, 5), trunkMat, TREES);
  let t = 0, ca = 0, cb = 0;
  const insidePlot = (x, z) => Math.abs(x) < 121 && Math.abs(z) < 36;
  const nearBlock = (x, z) => Object.values(blockPos).some(([bx, bz]) => Math.abs(x - bx) < 36 && Math.abs(z - bz) < 30);
  const spots = [];
  while (spots.length < (phone ? 60 : 110)) { // inside: the garden at the east end, the west strip, the lawns
    const r = rnd();
    const [x, z] = r < 0.45 ? [78 + rnd() * 40, -28 + rnd() * 56] : r < 0.7 ? [-119 + rnd() * 18, -32 + rnd() * 64] : [[-72, 34, -72, 34][Math.floor(rnd() * 4)] + (rnd() - 0.5) * 16, (rnd() < 0.5 ? -24 : 25) + (rnd() - 0.5) * 8];
    if (Math.hypot(x - 86, z + 16) < 13 || Math.hypot(x - 104, z - 10) < 16 || Math.hypot(x - 110, z + 20) < 10 || Math.hypot(x + 109, z + 22) < 10 || Math.hypot(x + 109, z - 26) < 9) continue;
    if (nearBlock(x, z) && Math.abs(z) <= 20) continue;
    spots.push([x, z, 0.8 + rnd() * 0.5]);
  }
  while (spots.length < TREES) {
    const x = (rnd() - 0.5) * 900, z = (rnd() - 0.5) * 700;
    if (insidePlot(x, z) || (Math.abs(z - 43) < 9 && Math.abs(x) < 160) || (Math.abs(Math.abs(x) - 129) < 9 && Math.abs(z) < 85)) continue;
    spots.push([x, z, 0.9 + rnd() * 1.1]);
  }
  spots.forEach(([x, z, s]) => {
    dummy.position.set(x, 1.2 * s, z); dummy.scale.set(s, s, s); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); trunk.setMatrixAt(t++, dummy.matrix);
    dummy.position.set(x, 4 * s, z); dummy.rotation.set(0, rnd() * 6, 0); dummy.updateMatrix();
    if (rnd() < 0.55) crown.setMatrixAt(ca++, dummy.matrix); else crown2.setMatrixAt(cb++, dummy.matrix);
  });
  crown.count = ca; crown2.count = cb; trunk.count = t;
  crown.castShadow = crown2.castShadow = !phone; scene.add(crown, crown2, trunk);

  // ---------- the neighbourhood: low blocks across the roads, so the towers stand in a city ----------
  const NB = phone ? 70 : 140;
  const hoods = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.95 }), NB);
  const hoodColours = ['#e3d9c6', '#d9cdb6', '#cfc4b4', '#e8e0d0', '#bfb3a3', '#d6c7ad'];
  let h = 0, guard = 0;
  while (h < NB && guard++ < 4000) {
    const x = (rnd() - 0.5) * 1000, z = (rnd() - 0.5) * 800;
    const w = 10 + rnd() * 14, d = 10 + rnd() * 14, fl = 1 + Math.floor(rnd() * 4);
    if (Math.abs(x) < 142 + w && Math.abs(z) < 60 + d) continue;
    dummy.position.set(x, (fl * 3.2) / 2, z); dummy.scale.set(w, fl * 3.2, d); dummy.rotation.set(0, rnd() < 0.5 ? 0 : Math.PI / 2, 0); dummy.updateMatrix();
    hoods.setMatrixAt(h, dummy.matrix); hoods.setColorAt(h, tmpColor.set(hoodColours[h % hoodColours.length])); h++;
  }
  hoods.count = h; hoods.castShadow = !phone; hoods.receiveShadow = true; scene.add(hoods);

  // ---------- the sky: a dome with a haze at the horizon and the sun in it, a few clouds ----------
  const skyUniforms = { top: { value: new THREE.Color('#3b78c6') }, horizon: { value: new THREE.Color('#ecdfc4') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color('#ffd79a') } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vDir = normalize(w.xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vDir;
      void main() { vec3 d = normalize(vDir); float t = pow(clamp(d.y, 0.0, 1.0), 0.45); vec3 c = mix(horizon, top, t);
        float s = max(dot(d, normalize(sunDir)), 0.0); c += sunColor * (pow(s, 4.0) * 0.25 + pow(s, 48.0) * 0.8 + pow(s, 900.0) * 3.0); gl_FragColor = vec4(c, 1.0); }`,
  }));
  sky.renderOrder = -1; scene.add(sky);
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#fff8ee', roughness: 1, flatShading: true });
  const puff = new THREE.SphereGeometry(1, 7, 5);
  [[-300, 150, -500, 2.2], [100, 170, -560, 2.8], [420, 140, -420, 2], [-520, 130, -200, 1.8], [560, 150, 100, 2.1], [-100, 180, -650, 3]].forEach(([cx, cy, cz, sc]) => {
    const g = new THREE.Group(); g.position.set(cx, cy, cz);
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(puff, cloudMat); m.position.set((i - 2.5) * 6 * sc, Math.cos(i * 1.7) * 1.5 * sc, Math.sin(i * 3.3) * 3); m.scale.set((7 + (i % 3) * 2) * sc, (3 + (i % 2)) * sc, (4 + (i % 2)) * sc); g.add(m); }
    scene.add(g);
  });

  // ---------- light ----------
  const sun = new THREE.DirectionalLight('#ffd9a6', 3);
  sun.castShadow = !phone; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 20, far: 600 }); sun.shadow.bias = -0.0008;
  sun.target.position.set(0, 10, 0); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#a8c0d8', '#6b5a40', 0.8); scene.add(hemi);
  scene.add(new THREE.AmbientLight('#ffe9c9', 0.12));
  const day = { top: new THREE.Color('#3b78c6'), horizon: new THREE.Color('#ecdfc4'), sun: new THREE.Color('#ffd9a6'), glow: new THREE.Color('#ffd79a'), hemi: new THREE.Color('#a8c0d8'), fog: new THREE.Color('#dccfb6'), water: new THREE.Color('#3f9bb4') };
  const dusk = { top: new THREE.Color('#2b2848'), horizon: new THREE.Color('#ee9450'), sun: new THREE.Color('#ff8a3c'), glow: new THREE.Color('#ff9a4a'), hemi: new THREE.Color('#6b4a5a'), fog: new THREE.Color('#6d4a44'), water: new THREE.Color('#b86a44') };
  scene.background = day.horizon.clone();
  scene.fog = new THREE.Fog(day.fog.clone(), 220, 1100);
  const setLight = (u) => {
    const el = THREE.MathUtils.lerp(0.5, 0.08, u), az = THREE.MathUtils.lerp(-0.8, -1.3, u);
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    sun.position.copy(dir).multiplyScalar(300).add(sun.target.position);
    sun.color.copy(day.sun).lerp(dusk.sun, u); sun.intensity = THREE.MathUtils.lerp(3, 1.5, u);
    hemi.color.copy(day.hemi).lerp(dusk.hemi, u); hemi.intensity = THREE.MathUtils.lerp(0.8, 0.65, u);
    skyUniforms.top.value.copy(day.top).lerp(dusk.top, u); skyUniforms.horizon.value.copy(day.horizon).lerp(dusk.horizon, u); skyUniforms.sunColor.value.copy(day.glow).lerp(dusk.glow, u); skyUniforms.sunDir.value.copy(dir);
    scene.fog.color.copy(day.fog).lerp(dusk.fog, u); scene.background.copy(scene.fog.color);
    waterMat.color.copy(day.water).lerp(dusk.water, u);
    cloudMat.color.setHex(0xfff8ee).lerp(new THREE.Color('#e08a62'), u);
    const on = THREE.MathUtils.smoothstep(u, 0.45, 0.92);
    glass.emissiveIntensity = on * 1.7; glass.color.setHex(on > 0.2 ? 0xffe6b8 : 0xa9c0d2);
  };

  // ---------- camera: the approach on scroll, the tour, a little parallax ----------
  const camPath = new THREE.CatmullRomCurve3([new THREE.Vector3(150, 78, 150), new THREE.Vector3(98, 46, 104), new THREE.Vector3(64, 28, 62), new THREE.Vector3(58, 20, 44)]);
  const lookFrom = new THREE.Vector3(-8, 10, 0), lookTo = new THREE.Vector3(38, 15, 4);
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3(), look = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  let progress = 0, mouseX = 0, mouseY = 0, px = 0, py = 0;
  const readScroll = () => { progress = Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight))); };
  readScroll();
  addEventListener('scroll', readScroll, { passive: true });
  if (!coarse && !reduced) {
    addEventListener('pointermove', (e) => { mouseX = (e.clientX / innerWidth) * 2 - 1; mouseY = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouseX = 0; mouseY = 0; });
  }
  const stops = [
    { pos: [14, 7, 62], look: [12, 5, 34], text: 'The gate on the south road. Sector 12, Vrindavan Yojna, off Shaheed Path.' },
    { pos: [-26, 11, 60], look: [-80, 8, 28], text: 'The drive runs the length of the plot, with the parking row under the palms.' },
    { pos: [-118, 22, 42], look: [-78, 16, 2], text: 'Block C, the west tower: 126 homes over the basement parking, finished in 2018.' },
    { pos: [-19, 16, 60], look: [-19, 14, 1], text: 'Block B, the two bedroom block in the middle of the plan.' },
    { pos: [96, 16, 36], look: [92, 2, -6], text: 'The pool, the sand pit and the club at the east end, with the courts behind.' },
    { pos: [72, 12, 54], look: [40, 14, 2], text: 'Block A, the Phase II tower, with shops on the ground floor. Finished November 2024.' },
    { pos: [62, 34, 34], look: [40, 22, 2], text: 'Every box is a home. Point at one and click it to open the flat.' },
  ];
  const tour = { on: false, i: 0, t: 0, from: new THREE.Vector3(), fromLook: new THREE.Vector3() };
  const ui = document.getElementById('hero-ui');
  const tourBtn = ui?.querySelector('[data-tour]');
  const caption = ui?.querySelector('[data-caption]');
  const say = (text) => { if (!caption) return; caption.textContent = text; caption.hidden = !text; };
  const startTour = () => { tour.on = true; tour.i = 0; tour.t = 0; tour.from.copy(camPos); tour.fromLook.copy(look); if (tourBtn) tourBtn.textContent = 'Stop the tour'; say(stops[0].text); start(); };
  const stopTour = () => { tour.on = false; if (tourBtn) tourBtn.textContent = 'Take the tour'; say(''); };
  tourBtn?.addEventListener('click', () => (tour.on ? stopTour() : startTour()));
  const ease = (x) => x * x * (3 - 2 * x);
  const tourStep = (dt) => {
    const stop = stops[tour.i];
    tour.t += dt;
    const fly = reduced ? 0.01 : 4.5, hold = 3;
    const u = ease(Math.min(1, tour.t / fly));
    camTarget.fromArray(stop.pos); camTarget.lerpVectors(tour.from, camTarget, u);
    lookTarget.fromArray(stop.look); lookTarget.lerpVectors(tour.fromLook, lookTarget, u);
    if (tour.t > fly + hold) {
      tour.i++; tour.t = 0; tour.from.fromArray(stop.pos); tour.fromLook.fromArray(stop.look);
      if (tour.i >= stops.length) { stopTour(); return; }
      say(stops[tour.i].text);
    }
  };

  const placeCamera = (immediate, dt) => {
    if (tour.on) { tourStep(dt); camPos.lerp(camTarget, 0.12); look.lerp(lookTarget, 0.12); }
    else {
      camPath.getPointAt(progress, camTarget); camTarget.x += px * 3; camTarget.y += -py * 1.5;
      lookTarget.copy(lookFrom).lerp(lookTo, progress); lookTarget.x += px * 2; lookTarget.y += -py * 0.8;
      if (immediate) { camPos.copy(camTarget); look.copy(lookTarget); } else { camPos.lerp(camTarget, 0.07); look.lerp(lookTarget, 0.07); }
    }
    camera.position.copy(camPos); camera.lookAt(look); sky.position.copy(camPos);
  };

  // ---------- picking a home ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  const gold = new THREE.Color('#d9b263'), goldHot = new THREE.Color('#f0c766');
  let hovered = -1, selected = -1, pickDirty = false;
  const paint = (i) => { if (i < 0) return; flats.setColorAt(i, i === selected ? goldHot : i === hovered ? gold : flatColours[i]); flats.instanceColor.needsUpdate = true; };
  const setHover = (i) => { if (i === hovered) return; const old = hovered; hovered = i; paint(old); paint(i); canvas.style.cursor = i >= 0 ? 'pointer' : ''; };
  const pickAt = () => {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(flats, false)[0];
    const i = hit && records[hit.instanceId]?.home ? hit.instanceId : -1;
    setHover(i);
    return i;
  };
  const card = document.getElementById('hero-pick');
  const showCard = (rec) => {
    if (!card) return;
    const plan = PLANS[rec.type];
    card.querySelector('[data-where]').textContent = `Block ${rec.block} · ${ordinal(rec.floor)} floor · flat ${rec.flat}`;
    card.querySelector('[data-type]').textContent = plan.name;
    card.querySelector('[data-facts]').textContent = `${plan.superArea.toLocaleString('en-IN')} sq ft super, ${plan.carpet} carpet · sample price ${plan.priceText}`;
    card.querySelector('[data-open]').href = `/flat.html?block=${rec.block}&floor=${rec.floor}&flat=${rec.flat}`;
    const form = card.querySelector('form');
    if (form) { form.elements.block.value = rec.block; form.elements.floor.value = rec.floor; form.elements.flat.value = rec.flat; }
    card.hidden = false;
  };
  const setPointer = (e) => { const r = canvas.getBoundingClientRect(); pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  canvas.addEventListener('pointermove', (e) => { setPointer(e); pickDirty = true; });
  canvas.addEventListener('pointerleave', () => { pointer.set(-2, -2); setHover(-1); });
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) { downAt = null; return; }
    downAt = null; setPointer(e);
    const i = pickAt();
    const old = selected; selected = i; paint(old); paint(i);
    if (i >= 0) showCard(records[i]);
  });
  card?.querySelector('[data-close]')?.addEventListener('click', () => { card.hidden = true; const old = selected; selected = -1; paint(old); });
  // the same card is a picker for keyboards and screen readers: block, floor, flat
  card?.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target.elements, block = f.block.value, floor = Number(f.floor.value), flat = Number(f.flat.value);
    const type = flatType(block, flat);
    if (!type) return;
    const i = records.findIndex((r) => r.block === block && r.floor === floor && r.flat === flat);
    const old = selected; selected = i; paint(old); paint(i);
    showCard({ block, floor, flat, type });
  });
  ui?.querySelector('[data-pick]')?.addEventListener('click', () => { if (card) { card.hidden = !card.hidden; if (!card.hidden) card.querySelector('select')?.focus(); } });

  // ---------- size, visibility, loop ----------
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 60 : 42; camera.updateProjectionMatrix();
  };
  new ResizeObserver(() => { resize(); if (reduced) renderOnce(); }).observe(stage);
  resize();

  const clock = new THREE.Clock();
  let visible = true, raf = 0, started = false;
  const render = () => {
    const dt = Math.min(0.1, clock.getDelta()), t = clock.getElapsedTime();
    px += (mouseX - px) * 0.05; py += (mouseY - py) * 0.05;
    placeCamera(!started, dt);
    setLight(reduced ? 0.25 : 0.5 - 0.5 * Math.cos((t / 84) * Math.PI * 2));
    if (pickDirty) { pickDirty = false; pickAt(); }
    renderer.render(scene, camera);
    if (!started) { started = true; hero.classList.add('is-3d'); if (ui) ui.hidden = false; }
  };
  const loop = () => { raf = 0; if (!visible || document.hidden) return; render(); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible && !document.hidden && (!reduced || tour.on)) raf = requestAnimationFrame(loop); };
  const renderOnce = () => { placeCamera(true, 0); render(); };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0 }).observe(stage);
  document.addEventListener('visibilitychange', start);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); hero.classList.remove('is-3d'); canvas.remove(); if (raf) cancelAnimationFrame(raf); visible = false; });

  stage.append(canvas);
  if (reduced) renderOnce(); else start();

  // a still of the scene, for the static fallback picture and the social image
  window.__heroSnapshot = (w = 1600, h = 900, light = 0.15, at = 0.3) => {
    const prevRatio = renderer.getPixelRatio(); renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 60 : 42; camera.updateProjectionMatrix();
    const saved = progress; progress = at; px = 0; py = 0; placeCamera(true, 0); setLight(light); renderer.render(scene, camera);
    const data = canvas.toDataURL('image/jpeg', 0.86);
    progress = saved; renderer.setPixelRatio(prevRatio); resize(); return data;
  };
}

if (hero && stage) init();
