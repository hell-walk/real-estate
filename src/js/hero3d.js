// Ratan Galaxy in three dimensions, built from the published master plan: the long plot off the south road, the two
// X-shaped towers and the H-shaped block in a row, ground plus nine floors each, fourteen homes a floor, the pool and
// the club at the east end, the courts at both ends, the gate on the south road, the parking row under the palms, and
// the flat Lucknow country around it. Every home is its own box: point at one and it lights up and is named, click it
// and a card opens the flat viewer. Scrolling brings the camera in; drag to look round the site, scroll to zoom; "Walk
// the grounds" puts you at the gate at eye level; "Take the tour" flies the camera round with captions; the time of
// day slider runs the light from afternoon to dusk and the windows and lamps come on; the filters pick out the two,
// three and four bedroom homes. Materials are drawn on canvases here (plaster, grass, asphalt, paving, railings, the
// gate board), reflections come from a room environment, and the sun casts shadows on screens that can afford them.
// Three.js 0.170.0 from the CDN, a static picture when WebGL is missing. Sizes are metres read off the plan.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
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

const loader = (() => { // the loading card on the hero: a step name and a percentage, then it goes
  const el = document.querySelector('[data-loader]'); if (!el) return { set() {}, done() {} };
  const step = el.querySelector('[data-step]'), bar = el.querySelector('[data-bar]'), pct = el.querySelector('[data-pct]');
  return {
    set(p, text) { if (bar) bar.style.width = `${p}%`; if (pct) pct.textContent = String(p); if (text && step) step.textContent = text; },
    done() { this.set(100, 'Pinned'); el.classList.add('is-done'); setTimeout(() => { el.hidden = true; }, 600); },
  };
})();
const frame = () => new Promise((r) => requestAnimationFrame(r));

async function init() {
  if (!webglAvailable()) { loader.done(); return; }
  loader.set(18, 'Mixing the plaster and the paint');
  await frame();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const phone = coarse || innerWidth < 768;

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: !phone, powerPreference: 'high-performance', alpha: false }); } catch { loader.done(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.25 : 1.5));
  renderer.shadowMap.enabled = !phone;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  const shadows = !phone;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 1400);
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // reflections for the glass, the cars and the water come from a neutral room, not from the scene itself
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  // ---------- the picture: the scene in linear light, a glow off anything brighter than white (the sun, the lit windows and the lamps at dusk), a vignette, then the tone mapping ----------
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 0 }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), phone ? 0.3 : 0.42, 0.4, 1.4); composer.addPass(bloom);
  const bloomSize = bloom.setSize.bind(bloom); bloom.setSize = (w, h) => bloomSize(w / 2, h / 2); // the glow is soft anyway: blur it at half size
  const vignette = new ShaderPass(VignetteShader); vignette.uniforms.offset.value = 0.95; vignette.uniforms.darkness.value = 0.8; composer.addPass(vignette);
  const fxaa = new ShaderPass(FXAAShader); fxaa.enabled = true; composer.addPass(fxaa); // the passes render off screen with no multisampling, so this smooths the edges (cheaper than a multisampled target)
  composer.addPass(new OutputPass());
  window.__heroPost = (on) => { bloom.enabled = on; vignette.enabled = on; }; // for the performance check

  // ---------- materials drawn on canvases: plaster, grass, asphalt, paving, railings, the gate board ----------
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const makeTex = (size, draw, repeat = [1, 1], srgb = true) => {
    const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
  };
  const speckle = (g, size, base, n, dark = 0.08, light = 0.06, w = 2) => {
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    for (let i = 0; i < n; i++) { const d = rnd() < 0.5; g.fillStyle = d ? `rgba(0,0,0,${(rnd() * dark).toFixed(3)})` : `rgba(255,255,255,${(rnd() * light).toFixed(3)})`; g.fillRect(rnd() * size, rnd() * size, 1 + rnd() * w, 1 + rnd() * w); }
  };
  const plasterTex = makeTex(256, (g, s) => speckle(g, s, '#f4efe6', 5000, 0.07, 0.05, 3), [3, 1]);
  const wallTex = makeTex(256, (g, s) => { speckle(g, s, '#d9cdb8', 4000, 0.1, 0.05, 3); g.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 0; y < s; y += 32) g.fillRect(0, y, s, 1); }, [40, 1]);
  const grassTex = makeTex(256, (g, s) => { speckle(g, s, '#6f9a45', 9000, 0.22, 0.1, 2); g.fillStyle = 'rgba(70,110,40,0.25)'; for (let i = 0; i < 300; i++) g.fillRect(rnd() * s, rnd() * s, 1, 2 + rnd() * 4); }, [400, 400]);
  const lawnTex = grassTex.clone(); lawnTex.repeat.set(4, 2); lawnTex.needsUpdate = true;
  const asphaltTex = makeTex(256, (g, s) => speckle(g, s, '#4b494b', 9000, 0.3, 0.12, 2), [40, 2]);
  const pavingTex = makeTex(256, (g, s) => { speckle(g, s, '#908b85', 5000, 0.12, 0.06, 3); g.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i <= s; i += 64) { g.fillRect(i, 0, 1, s); g.fillRect(0, i, s, 1); } }, [60, 18]);
  const deckTex = makeTex(256, (g, s) => { speckle(g, s, '#dad1c0', 4000, 0.1, 0.05, 3); g.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = 0; i <= s; i += 32) { g.fillRect(i, 0, 1, s); g.fillRect(0, i, s, 1); } }, [8, 5]);
  const railTex = makeTex(128, (g, s) => { g.clearRect(0, 0, s, s); g.fillStyle = '#1c1a19'; g.fillRect(0, 0, s, 6); g.fillRect(0, s - 4, s, 4); g.fillRect(0, s / 2 - 1, s, 2); for (let x = 2; x < s; x += 14) g.fillRect(x, 0, 3, s); }, [4, 1]);
  const grilleTex = makeTex(128, (g, s) => { g.clearRect(0, 0, s, s); g.fillStyle = '#2f2a26'; g.fillRect(0, 0, s, 5); for (let x = 2; x < s; x += 12) g.fillRect(x, 0, 3, s); }, [200, 1]);
  const boardTex = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 224; const g = c.getContext('2d');
    g.fillStyle = '#1b1613'; g.fillRect(0, 0, 1024, 224); g.fillStyle = '#c9a45a'; g.fillRect(40, 30, 944, 2); g.fillRect(40, 192, 944, 2);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#e9e2d3'; g.font = '600 92px "Clash Grotesk", "Segoe UI", sans-serif'; g.fillText('RATAN GALAXY', 512, 96);
    g.fillStyle = '#c9a45a'; g.font = '500 34px "Clash Grotesk", "Segoe UI", sans-serif'; g.fillText('VRINDAVAN YOJNA · SECTOR 12', 512, 160);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
  })();
  const plinthTex = makeTex(256, (g, s) => { speckle(g, s, '#8f877e', 4000, 0.14, 0.05, 3); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i <= s; i += 32) g.fillRect(i, 0, 1, s); }, [20, 1]);

  loader.set(34, 'Laying the ground and the roads'); await frame();
  // ---------- the ground: flat Lucknow country, the plot paved inside its wall ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(239, 69), new THREE.MeshStandardMaterial({ map: pavingTex, roughness: 1 }));
  paving.rotation.x = -Math.PI / 2; paving.position.y = 0.06; paving.receiveShadow = true; scene.add(paving);

  const flat = (geo, color, x, z, y = 0.1, rot = 0, extra = {}) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, ...extra })); m.rotation.x = -Math.PI / 2; m.rotation.z = rot; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
  [[-72, -24, 18, 9], [34, -24, 18, 9], [-72, 25, 18, 9], [34, 25, 18, 9], [-50, 2, 10, 20], [8, 2, 10, 20]].forEach(([x, z, w, h]) => flat(new THREE.PlaneGeometry(w, h), '#ffffff', x, z, 0.12, 0, { map: lawnTex }));
  const gardenTex = grassTex.clone(); gardenTex.repeat.set(10, 12); gardenTex.needsUpdate = true;
  flat(new THREE.PlaneGeometry(46, 60), '#f2f7ea', 95, 2, 0.1, 0, { map: gardenTex }); // the garden at the east end
  const stripTex = grassTex.clone(); stripTex.repeat.set(4, 12); stripTex.needsUpdate = true;
  flat(new THREE.PlaneGeometry(20, 56), '#f2f7ea', -110, 0, 0.1, 0, { map: stripTex }); // and the strip at the west end

  // roads: the south road the gate opens on, and the ones down both sides
  flat(new THREE.PlaneGeometry(300, 14), '#ffffff', 0, 43, 0.04, 0, { map: asphaltTex });
  const sideTex = asphaltTex.clone(); sideTex.repeat.set(2, 24); sideTex.needsUpdate = true;
  flat(new THREE.PlaneGeometry(14, 160), '#ffffff', -129, 0, 0.04, 0, { map: sideTex });
  flat(new THREE.PlaneGeometry(14, 160), '#ffffff', 129, 0, 0.04, 0, { map: sideTex });
  const dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 0.2), new THREE.MeshStandardMaterial({ color: '#d8c35e', roughness: 1 }), 50);
  for (let i = 0; i < 50; i++) { dummy.position.set(-147 + i * 6, 0.05, 43); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); dashes.setMatrixAt(i, dummy.matrix); }
  scene.add(dashes);
  flat(new THREE.PlaneGeometry(300, 3), '#b9b3a9', 0, 51.5, 0.05); // the footpath across the road
  flat(new THREE.PlaneGeometry(300, 0.3), '#8a8580', 0, 50, 0.06); // its kerb
  flat(new THREE.PlaneGeometry(240, 2.5), '#b9b3a9', 0, 34.5, 0.07); // and the one along the wall

  // the parking row inside the south wall, white lines and a few cars
  const parkTex = asphaltTex.clone(); parkTex.repeat.set(30, 1); parkTex.needsUpdate = true;
  flat(new THREE.PlaneGeometry(222, 7), '#a9a5a2', 0, 29.5, 0.08, 0, { map: parkTex });
  const lines = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.12, 5), new THREE.MeshStandardMaterial({ color: '#e8e4dc', roughness: 1 }), 90);
  for (let i = 0; i < 90; i++) { dummy.position.set(-110 + i * 2.5, 0.09, 29.5); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); lines.setMatrixAt(i, dummy.matrix); }
  scene.add(lines);
  const carBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 0.7, 4.2), new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.6 }), 34);
  const carCab = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.6, 2.2), new THREE.MeshStandardMaterial({ color: '#2a3036', roughness: 0.1, metalness: 0.7 }), 34);
  const carColours = ['#d9d6d0', '#2b2b2e', '#8f8f93', '#7a2c2a', '#2c3e6b', '#e9e5dc', '#4a4a4c', '#b8b2a5'];
  for (let i = 0; i < 34; i++) {
    const x = -108 + Math.floor(i * 2.6) * 2.5 + 1.25;
    dummy.position.set(x, 0.55, 29.5); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); carBody.setMatrixAt(i, dummy.matrix); carBody.setColorAt(i, tmpColor.set(carColours[i % carColours.length]));
    dummy.position.set(x, 1.2, 29.3); dummy.updateMatrix(); carCab.setMatrixAt(i, dummy.matrix);
  }
  carBody.castShadow = carCab.castShadow = shadows; scene.add(carBody, carCab);

  // the boundary wall with its piers and the grille on top, the gate with its board, the gatehouse
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
  const wallPiece = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), wallMat); m.position.set(x, 1.1, z); m.castShadow = shadows; m.receiveShadow = true; scene.add(m); };
  wallPiece(240, 0.4, 0, -35); wallPiece(0.4, 70, -120, 0); wallPiece(0.4, 70, 120, 0);
  wallPiece(124, 0.4, -58, 35); wallPiece(100, 0.4, 70, 35); // the gap from 4 to 20 is the gate
  const grilleMat = new THREE.MeshStandardMaterial({ map: grilleTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 });
  const grille = (w, x, z, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.8), grilleMat); m.position.set(x, 2.6, z); m.rotation.y = rot; scene.add(m); };
  grille(240, 0, -35, 0); grille(70, -120, 0, Math.PI / 2); grille(70, 120, 0, Math.PI / 2); grille(124, -58, 35, 0); grille(100, 70, 35, 0);
  const pierMat = new THREE.MeshStandardMaterial({ color: '#c9bca6', roughness: 0.95 });
  const piers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 2.6, 0.7), pierMat, 70);
  let pc = 0;
  const pier = (x, z) => { dummy.position.set(x, 1.3, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); piers.setMatrixAt(pc++, dummy.matrix); };
  for (let x = -120; x <= 120; x += 12) { pier(x, -35); if (x < 2 || x > 22) pier(x, 35); }
  for (let z = -23; z <= 23; z += 12) { pier(-120, z); pier(120, z); }
  piers.count = pc; piers.castShadow = shadows; scene.add(piers);
  const pillarMat = new THREE.MeshStandardMaterial({ color: '#f3f0ea', roughness: 0.9 }); // the gate, the canopies and the gatehouse roof are white plaster, as in the photographs
  const gateParts = [];
  [[4.5, 35], [19.5, 35]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5, 1.4), pillarMat); p.position.set(x, 2.5, z); p.castShadow = shadows; scene.add(p); gateParts.push(p); });
  const gateBeam = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.5, 1.4), pillarMat); gateBeam.position.set(12, 5.3, 35); gateBeam.castShadow = shadows; scene.add(gateBeam);
  const gateCornice = new THREE.Mesh(new THREE.BoxGeometry(17.6, 0.3, 2.2), pillarMat); gateCornice.position.set(12, 5.7, 35); gateCornice.castShadow = shadows; scene.add(gateCornice); // the moulded cornice over the gate
  const boardSide = new THREE.MeshStandardMaterial({ color: '#1b1613' }), boardFace = new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.6 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(11, 2.4, 0.3), [boardSide, boardSide, boardSide, boardSide, boardFace, boardFace]);
  board.position.set(12, 7.1, 35); board.castShadow = shadows; scene.add(board);
  gateParts.push(gateBeam, gateCornice, board);
  const leafTex = grilleTex.clone(); leafTex.repeat.set(7, 3); leafTex.needsUpdate = true;
  const gateLeaf = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.4), new THREE.MeshStandardMaterial({ map: leafTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 }));
  gateLeaf.position.set(5.2 + 3.5 * Math.cos(1.2), 1.4, 35 - 3.5 * Math.sin(1.2)); gateLeaf.rotation.y = -1.2; scene.add(gateLeaf); // one leaf, standing open
  const gatehouse = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 3.5), new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.9 })); gatehouse.position.set(24, 1.6, 32.5); gatehouse.castShadow = shadows; scene.add(gatehouse);
  const gatehouseRoof = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 4.5), pillarMat); gatehouseRoof.position.set(24, 3.35, 32.5); scene.add(gatehouseRoof);
  const driveTex = pavingTex.clone(); driveTex.repeat.set(5, 3); driveTex.needsUpdate = true;
  flat(new THREE.PlaneGeometry(16, 10), '#9a9591', 12, 31, 0.1, 0, { map: driveTex }); // the drive in

  // courts, the pool, the kids' pool, the sand pit, the club and its amphitheatre, the gazebo
  const court = (x, z, w, h, color) => { flat(new THREE.PlaneGeometry(w, h), color, x, z, 0.14, 0, { roughness: 0.85 }); flat(new THREE.PlaneGeometry(w - 1, 0.12), '#f1ede5', x, z, 0.18); flat(new THREE.PlaneGeometry(0.12, h - 1), '#f1ede5', x - w / 2 + 0.5, z, 0.18); flat(new THREE.PlaneGeometry(0.12, h - 1), '#f1ede5', x + w / 2 - 0.5, z, 0.18); };
  court(-109, -22, 16, 9, '#4f8a46'); court(-109, 26, 14, 8, '#c0683f'); court(110, -20, 16, 9, '#c0683f');
  const waterMat = new THREE.MeshStandardMaterial({ color: '#3f9bb4', roughness: 0.05, metalness: 0.55, envMapIntensity: 1.2 });
  flat(new THREE.PlaneGeometry(24, 15), '#ffffff', 86, -15, 0.13, 0, { map: deckTex }); // the pool deck
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1, 40), waterMat); pool.rotation.x = -Math.PI / 2; pool.scale.set(9, 5, 1); pool.position.set(86, 0.2, -16); scene.add(pool);
  const kidsPool = new THREE.Mesh(new THREE.CircleGeometry(3, 24), waterMat); kidsPool.rotation.x = -Math.PI / 2; kidsPool.position.set(96, 0.2, -8); scene.add(kidsPool);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(6, 24), new THREE.MeshStandardMaterial({ color: '#dcc99b', roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.set(86, 0.16, 3); scene.add(sand);
  const clubMat = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.9 });
  const club = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 7, 36), clubMat); club.position.set(104, 3.5, 10); club.castShadow = shadows; club.receiveShadow = true; scene.add(club);
  const clubGlass = new THREE.Mesh(new THREE.CylinderGeometry(9.05, 9.05, 2.2, 36, 1, true), new THREE.MeshStandardMaterial({ color: '#8fb0c8', roughness: 0.15, metalness: 0.6, side: THREE.DoubleSide })); clubGlass.position.set(104, 4.2, 10); scene.add(clubGlass);
  const clubRoof = new THREE.Mesh(new THREE.CylinderGeometry(9.8, 9.8, 0.5, 36), pillarMat); clubRoof.position.set(104, 7.25, 10); clubRoof.castShadow = shadows; scene.add(clubRoof);
  for (let s = 0; s < 3; s++) { const step = new THREE.Mesh(new THREE.CylinderGeometry(11 + s * 1.6, 11 + s * 1.6, 0.4, 36), new THREE.MeshStandardMaterial({ color: s % 2 ? '#c9bda8' : '#d8cdb8', roughness: 1 })); step.position.set(104, 0.2 + (2 - s) * 0.4, 10); step.receiveShadow = true; scene.add(step); }
  const gazebo = new THREE.Mesh(new THREE.ConeGeometry(3, 1.6, 8), pillarMat); gazebo.position.set(92, 3.9, 22); gazebo.castShadow = shadows; scene.add(gazebo);
  for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 6), clubMat); p.position.set(92 + Math.cos((i / 6) * 6.283) * 2.2, 1.5, 22 + Math.sin((i / 6) * 6.283) * 2.2); scene.add(p); }
  flat(new THREE.PlaneGeometry(2.2, 70), '#9b9793', 70, 0, 0.11); // the path between Block A and the garden
  flat(new THREE.PlaneGeometry(1.8, 44), '#9b9793', 92, -4, 0.12);
  const benchMat = new THREE.MeshStandardMaterial({ color: '#6b4a32', roughness: 0.9 });
  [[80, 12], [100, -4], [112, 24], [-104, 4], [-112, -4], [60, -26]].forEach(([x, z]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), benchMat); b.position.set(x, 0.55, z); b.castShadow = shadows; scene.add(b); const l = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.08), benchMat); l.position.set(x, 0.3, z - 0.2); scene.add(l); });

  // lamps along the road and inside the wall: a post, and a head that glows when the light goes
  const lampMat = new THREE.MeshStandardMaterial({ color: '#3a3a3c', roughness: 0.6, metalness: 0.5 });
  const lampGlow = new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: '#ffd27a', emissiveIntensity: 0, roughness: 0.4 });
  const lampSpots = [];
  for (let x = -140; x <= 140; x += 20) lampSpots.push([x, 50.5]);
  for (let x = -112; x <= 112; x += 24) lampSpots.push([x, 33.2]);
  for (let z = -30; z <= 30; z += 20) { lampSpots.push([-118.6, z]); lampSpots.push([118.6, z]); }
  [[70, -28], [70, 28], [94, -26], [112, 2], [-104, 12], [-104, -12]].forEach((p) => lampSpots.push(p));
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 6, 6), lampMat, lampSpots.length);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 10, 8), lampGlow, lampSpots.length);
  lampSpots.forEach(([x, z], i) => { dummy.position.set(x, 3, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); posts.setMatrixAt(i, dummy.matrix); dummy.position.set(x, 6.1, z); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix); });
  posts.castShadow = shadows; scene.add(posts, heads);

  loader.set(52, 'Raising the three blocks'); await frame();
  // ---------- the three blocks ----------
  const facadeMat = new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.92 });
  const slabMat = new THREE.MeshStandardMaterial({ color: '#e8e5de', roughness: 0.9 }); // the slab lines and the parapet are white plaster
  const coreMat = new THREE.MeshStandardMaterial({ color: '#56657a', roughness: 0.9 }); // the core, the lobby band and the wing tips are the slate blue of the built towers
  const balconyMat = new THREE.MeshStandardMaterial({ color: '#5c6b7e', roughness: 0.95 }); // and so are the balcony fascias
  const railMat = new THREE.MeshStandardMaterial({ map: railTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#2f2d2b', roughness: 0.7 });
  const acMat = new THREE.MeshStandardMaterial({ color: '#d9d9d6', roughness: 0.7, metalness: 0.2 });
  const glass = new THREE.MeshStandardMaterial({ color: '#a9c0d2', emissive: '#ffb860', emissiveIntensity: 0, roughness: 0.12, metalness: 0.65, envMapIntensity: 1.1 });
  const blockPos = { C: [-78, 2], B: [-19, 1], A: [40, 2] };
  const records = []; // one per box, in instance order
  const solids = []; // what you cannot walk through: ground floor footprints, in each one's own frame
  const flatMatrices = [], flatColours = [], slabMatrices = [], winMatrices = [], balcMatrices = [], railMatrices = [], acMatrices = [], bandMatrices = [];
  const cream = new THREE.Color('#f2efe9'), creamB = new THREE.Color('#ebe8e1'), shopC = new THREE.Color('#7f94a6'), under = new THREE.Color('#6a615a'), lobbyC = new THREE.Color('#56657a');
  const place = (fl, bx, bz, local) => new THREE.Matrix4().makeTranslation(bx + fl.cx, 0, bz + fl.cz).multiply(new THREE.Matrix4().makeRotationY(fl.rot)).multiply(local);
  for (const id of ['C', 'B', 'A']) {
    const block = BLOCKS[id], [bx, bz] = blockPos[id];
    const layout = floorLayout(block.shape);
    const base = block.ground === 'shops' ? 0 : 1; // B and C stand on a plinth; the stilt floor under every block is the parking
    const top = base + (FLOORS + 1) * FH;
    layout.forEach((fl) => {
      solids.push({ x: bx + fl.cx, z: bz + fl.cz, rot: fl.rot, hl: fl.len / 2 + 0.9, hw: fl.wid / 2 + 1.2 });
      for (let floor = 0; floor <= FLOORS; floor++) {
        const y = base + floor * FH;
        const home = floor > 0 && !fl.lobby;
        flatMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(0, y + FH / 2, 0).multiply(new THREE.Matrix4().makeScale(fl.len, FH - 0.08, fl.wid))));
        flatColours.push(floor === 0 ? (block.ground === 'shops' ? shopC : under) : fl.lobby ? lobbyC : (id === 'B' ? creamB : cream).clone().offsetHSL(0, 0, (rnd() - 0.5) * 0.02));
        records.push({ block: id, floor, flat: fl.n, type: home ? flatType(id, fl.n) : null, home });
        // windows along the open side and at the tip; a balcony with a rail on the open side; an AC unit under some
        if (floor > 0 || block.ground === 'shops') {
          const s = fl.side, zf = s * (fl.wid / 2 + 0.03);
          const count = fl.len > 14 ? 4 : 3;
          for (let k = 0; k < count; k++) {
            const wx = (k - (count - 1) / 2) * (fl.len / count);
            winMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(wx, y + 1.7, zf).multiply(new THREE.Matrix4().makeRotationY(s > 0 ? 0 : Math.PI)).multiply(new THREE.Matrix4().makeScale(floor === 0 ? 2.6 : 1.5, floor === 0 ? 2.4 : 1.3, 1))));
            if (floor > 0 && k !== 1 && rnd() < 0.4) acMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(wx + 0.9, y + 0.85, s * (fl.wid / 2 + 0.2)).multiply(new THREE.Matrix4().makeScale(0.6, 0.45, 0.35))));
          }
          if (fl.tip) for (const k of [-1.6, 1.6]) winMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation((fl.tipDir || 1) * (fl.len / 2 + 0.03), y + 1.7, k).multiply(new THREE.Matrix4().makeRotationY((fl.tipDir || 1) * Math.PI / 2)).multiply(new THREE.Matrix4().makeScale(1.5, 1.3, 1))));
          if (floor > 0 && !fl.lobby) {
            balcMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(fl.len * 0.18, y + 0.1, s * (fl.wid / 2 + 0.65)).multiply(new THREE.Matrix4().makeScale(3.2, 0.18, 1.3))));
            railMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(fl.len * 0.18, y + 0.65, s * (fl.wid / 2 + 1.27)).multiply(new THREE.Matrix4().makeScale(3.2, 1, 1))));
          }
        }
      }
      if (fl.tip) bandMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation((fl.tipDir || 1) * (fl.len / 2 + 0.1), (base + top) / 2, 0).multiply(new THREE.Matrix4().makeScale(0.2, top - base, 1.5)))); // the blue band up the tip of every wing
      for (let floor = 0; floor <= FLOORS + 1; floor++) slabMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(0, base + floor * FH, 0).multiply(new THREE.Matrix4().makeScale(fl.len + 0.5, 0.24, fl.wid + 0.5)))); // a slab line at every floor, and the roof
      slabMatrices.push(place(fl, bx, bz, new THREE.Matrix4().makeTranslation(0, top + 0.5, 0).multiply(new THREE.Matrix4().makeScale(fl.len + 0.5, 0.9, 0.3)))); // the parapet
    });
    // the core with the lifts, the machine room and the tanks on the roof, the plinth under B and C
    const coreW = block.shape === 'x' ? 15 : 12, coreD = block.shape === 'x' ? 15 : 14;
    const core = new THREE.Mesh(new THREE.BoxGeometry(coreW, top + 1.2, coreD), coreMat); core.position.set(bx, (top + 1.2) / 2, bz); core.castShadow = shadows; core.receiveShadow = true; scene.add(core);
    solids.push({ x: bx, z: bz, rot: 0, hl: coreW / 2 + 0.8, hw: coreD / 2 + 0.8 });
    const machine = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 5), coreMat); machine.position.set(bx + 3, top + 2.7, bz - 3); machine.castShadow = shadows; scene.add(machine);
    for (const [tx, tz] of [[-4, 3], [-1, 3]]) { const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.6, 12), new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.8 })); tank.position.set(bx + tx, top + 2, bz + tz); scene.add(tank); }
    if (base > 0) { const plinth = new THREE.Mesh(new THREE.BoxGeometry(block.shape === 'x' ? 70 : 40, base, block.shape === 'x' ? 70 : 56), new THREE.MeshStandardMaterial({ map: plinthTex, roughness: 1 })); plinth.position.set(bx, base / 2, bz); plinth.receiveShadow = true; scene.add(plinth); }
    // a canopy over the entrance on the south side
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 5), pillarMat); canopy.position.set(bx, base + 3.3, bz + coreD / 2 + 2.5 + (block.shape === 'x' ? 2 : 0)); canopy.castShadow = shadows; scene.add(canopy);
  }
  const flats = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), facadeMat, flatMatrices.length);
  flatMatrices.forEach((m, i) => { flats.setMatrixAt(i, m); flats.setColorAt(i, flatColours[i]); });
  flats.castShadow = shadows; flats.receiveShadow = true; scene.add(flats);
  const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), slabMat, slabMatrices.length);
  slabMatrices.forEach((m, i) => slabs.setMatrixAt(i, m)); slabs.castShadow = shadows; scene.add(slabs);
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), glass, winMatrices.length);
  winMatrices.forEach((m, i) => windows.setMatrixAt(i, m)); scene.add(windows);
  const frameGeo = new THREE.PlaneGeometry(1.14, 1.14); frameGeo.translate(0, 0, -0.012);
  const frames = new THREE.InstancedMesh(frameGeo, frameMat, winMatrices.length);
  winMatrices.forEach((m, i) => frames.setMatrixAt(i, m)); scene.add(frames);
  const balconies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), balconyMat, balcMatrices.length);
  balcMatrices.forEach((m, i) => balconies.setMatrixAt(i, m)); balconies.castShadow = shadows; scene.add(balconies);
  const bands = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), coreMat, bandMatrices.length);
  bandMatrices.forEach((m, i) => bands.setMatrixAt(i, m)); bands.castShadow = shadows; scene.add(bands);
  const rails = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), railMat, railMatrices.length);
  railMatrices.forEach((m, i) => rails.setMatrixAt(i, m)); scene.add(rails);
  const acs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), acMat, acMatrices.length);
  acMatrices.forEach((m, i) => acs.setMatrixAt(i, m)); scene.add(acs);

  loader.set(72, 'Planting the palms and the trees'); await frame();
  // ---------- trees: palms along the parking row, round trees in the lawns and the garden, more outside ----------
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5a4634', roughness: 1 });
  const palms = 24;
  const palmTrunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.28, 7, 7), trunkMat, palms);
  const frondGeo = new THREE.BoxGeometry(3.6, 0.08, 0.7); frondGeo.translate(1.8, 0, 0);
  const fronds = new THREE.InstancedMesh(frondGeo, new THREE.MeshStandardMaterial({ color: '#3f7a35', roughness: 1, side: THREE.DoubleSide }), palms * 8);
  for (let i = 0; i < palms; i++) {
    const x = -108 + i * 9.4, z = 25.3, lean = (rnd() - 0.5) * 0.12;
    dummy.position.set(x, 3.5, z); dummy.rotation.set(lean, 0, lean); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); palmTrunk.setMatrixAt(i, dummy.matrix);
    for (let f = 0; f < 8; f++) { dummy.position.set(x, 7, z); dummy.rotation.order = 'YXZ'; dummy.rotation.set(0, (f / 8) * 6.283 + rnd() * 0.4, -0.55 - rnd() * 0.35); dummy.updateMatrix(); fronds.setMatrixAt(i * 8 + f, dummy.matrix); dummy.rotation.order = 'XYZ'; }
  }
  palmTrunk.castShadow = fronds.castShadow = shadows; scene.add(palmTrunk, fronds);
  const TREES = phone ? 260 : 520;
  const canopyGeo = new THREE.IcosahedronGeometry(2.4, 2);
  { const p = canopyGeo.attributes.position; for (let i = 0; i < p.count; i++) { const s = 0.86 + rnd() * 0.28; p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.9, p.getZ(i) * s); } canopyGeo.computeVertexNormals(); }
  const crown = new THREE.InstancedMesh(canopyGeo, new THREE.MeshStandardMaterial({ roughness: 1 }), TREES);
  const crown2 = new THREE.InstancedMesh(canopyGeo, new THREE.MeshStandardMaterial({ roughness: 1 }), TREES);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.32, 2.6, 6), trunkMat, TREES);
  let t = 0;
  const greens = ['#467f38', '#5f9440', '#3f7a35', '#6a9a46', '#527f33'];
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
    dummy.position.set(x, 1.3 * s, z); dummy.scale.set(s, s, s); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); trunk.setMatrixAt(t, dummy.matrix);
    dummy.position.set(x, 4.2 * s, z); dummy.rotation.set(0, rnd() * 6, 0); dummy.updateMatrix(); crown.setMatrixAt(t, dummy.matrix); crown.setColorAt(t, tmpColor.set(greens[Math.floor(rnd() * greens.length)]));
    dummy.position.set(x + (rnd() - 0.5) * 1.2 * s, 5.4 * s, z + (rnd() - 0.5) * 1.2 * s); dummy.scale.set(s * 0.7, s * 0.7, s * 0.7); dummy.rotation.set(0, rnd() * 6, 0); dummy.updateMatrix(); crown2.setMatrixAt(t, dummy.matrix); crown2.setColorAt(t, tmpColor.set(greens[Math.floor(rnd() * greens.length)]).offsetHSL(0, 0, 0.05));
    t++;
  });
  crown.count = crown2.count = trunk.count = t;
  crown.castShadow = crown2.castShadow = shadows; scene.add(crown, crown2, trunk);
  spots.slice(0, phone ? 60 : 110).forEach(([x, z]) => solids.push({ x, z, rot: 0, hl: 0.5, hw: 0.5 }));

  // ---------- the neighbourhood: low blocks across the roads, so the towers stand in a city ----------
  const NB = phone ? 70 : 140;
  const hoods = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 }), NB);
  const hoodColours = ['#e3d9c6', '#d9cdb6', '#cfc4b4', '#e8e0d0', '#bfb3a3', '#d6c7ad'];
  let h = 0, guard = 0;
  while (h < NB && guard++ < 4000) {
    const x = (rnd() - 0.5) * 1000, z = (rnd() - 0.5) * 800;
    const w = 10 + rnd() * 14, d = 10 + rnd() * 14, fl = 1 + Math.floor(rnd() * 4);
    if (Math.abs(x) < 142 + w && Math.abs(z) < 60 + d) continue;
    dummy.position.set(x, (fl * 3.2) / 2, z); dummy.scale.set(w, fl * 3.2, d); dummy.rotation.set(0, rnd() < 0.5 ? 0 : Math.PI / 2, 0); dummy.updateMatrix();
    hoods.setMatrixAt(h, dummy.matrix); hoods.setColorAt(h, tmpColor.set(hoodColours[h % hoodColours.length])); h++;
  }
  hoods.count = h; hoods.castShadow = shadows; hoods.receiveShadow = true; scene.add(hoods);

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
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#fff8ee', roughness: 1 });
  const puff = new THREE.SphereGeometry(1, 10, 7);
  [[-300, 150, -500, 2.2], [100, 170, -560, 2.8], [420, 140, -420, 2], [-520, 130, -200, 1.8], [560, 150, 100, 2.1], [-100, 180, -650, 3]].forEach(([cx, cy, cz, sc]) => {
    const g = new THREE.Group(); g.position.set(cx, cy, cz);
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(puff, cloudMat); m.position.set((i - 2.5) * 6 * sc, Math.cos(i * 1.7) * 1.5 * sc, Math.sin(i * 3.3) * 3); m.scale.set((7 + (i % 3) * 2) * sc, (3 + (i % 2)) * sc, (4 + (i % 2)) * sc); g.add(m); }
    scene.add(g);
  });

  loader.set(88, 'Waiting for the afternoon light'); await frame();
  // ---------- light ----------
  const sun = new THREE.DirectionalLight('#ffd9a6', 3);
  sun.castShadow = shadows; sun.shadow.mapSize.set(phone ? 1024 : 4096, phone ? 1024 : 4096);
  Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 20, far: 600 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.3;
  sun.target.position.set(0, 10, 0); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#a8c0d8', '#6b5a40', 0.8); scene.add(hemi);
  scene.add(new THREE.AmbientLight('#ffe9c9', 0.12));
  const day = { top: new THREE.Color('#3b78c6'), horizon: new THREE.Color('#e9e3d6'), sun: new THREE.Color('#ffd9a6'), glow: new THREE.Color('#ffd79a'), hemi: new THREE.Color('#a8c0d8'), fog: new THREE.Color('#dbd6ca'), water: new THREE.Color('#3f9bb4') };
  const dusk = { top: new THREE.Color('#2b2848'), horizon: new THREE.Color('#ee9450'), sun: new THREE.Color('#ff8a3c'), glow: new THREE.Color('#ff9a4a'), hemi: new THREE.Color('#6b4a5a'), fog: new THREE.Color('#6d4a44'), water: new THREE.Color('#b86a44') };
  scene.background = day.horizon.clone();
  scene.fog = new THREE.Fog(day.fog.clone(), 220, 1100);
  const setLight = (u) => {
    const el = THREE.MathUtils.lerp(0.5, 0.08, u), az = THREE.MathUtils.lerp(-0.8, -1.3, u);
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    sun.position.copy(dir).multiplyScalar(300).add(sun.target.position);
    sun.color.copy(day.sun).lerp(dusk.sun, u); sun.intensity = THREE.MathUtils.lerp(3, 1.5, u);
    hemi.color.copy(day.hemi).lerp(dusk.hemi, u); hemi.intensity = THREE.MathUtils.lerp(0.8, 0.65, u);
    scene.environmentIntensity = THREE.MathUtils.lerp(0.45, 0.25, u);
    skyUniforms.top.value.copy(day.top).lerp(dusk.top, u); skyUniforms.horizon.value.copy(day.horizon).lerp(dusk.horizon, u); skyUniforms.sunColor.value.copy(day.glow).lerp(dusk.glow, u); skyUniforms.sunDir.value.copy(dir);
    scene.fog.color.copy(day.fog).lerp(dusk.fog, u); scene.background.copy(scene.fog.color);
    waterMat.color.copy(day.water).lerp(dusk.water, u);
    cloudMat.color.setHex(0xfff8ee).lerp(new THREE.Color('#e08a62'), u);
    const on = THREE.MathUtils.smoothstep(u, 0.45, 0.92);
    glass.emissiveIntensity = on * 2.4; glass.color.setHex(on > 0.2 ? 0xffe6b8 : 0xa9c0d2);
    lampGlow.emissiveIntensity = on * 3.4;
  };

  // ---------- the camera: the approach on scroll, free orbit, the walk, the tour ----------
  const camPath = new THREE.CatmullRomCurve3([new THREE.Vector3(150, 78, 150), new THREE.Vector3(98, 46, 104), new THREE.Vector3(64, 28, 62), new THREE.Vector3(58, 20, 44)]);
  const lookFrom = new THREE.Vector3(-8, 10, 0), lookTo = new THREE.Vector3(38, 15, 4);
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3(), look = new THREE.Vector3(), lookTarget = new THREE.Vector3();
  let progress = 0, mouseX = 0, mouseY = 0, px = 0, py = 0;
  let mode = 'approach'; // approach | orbit | walk | tour
  const readScroll = () => { progress = Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight))); };
  readScroll();
  addEventListener('scroll', readScroll, { passive: true });
  if (!coarse && !reduced) {
    addEventListener('pointermove', (e) => { mouseX = (e.clientX / innerWidth) * 2 - 1; mouseY = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouseX = 0; mouseY = 0; });
  }
  const ui = document.getElementById('hero-ui');
  const q = (sel) => ui?.querySelector(sel);
  const tourBtn = q('[data-tour]'), walkBtn = q('[data-walk]'), resetBtn = q('[data-reset]'), caption = q('[data-caption]'), tip = q('[data-tip]'), dpad = q('[data-dpad]'), timeInput = q('[data-time]');
  const say = (text) => { if (!caption) return; caption.textContent = text; caption.hidden = !text; };

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = !phone; controls.screenSpacePanning = false;
  controls.minDistance = 12; controls.maxDistance = 420; controls.maxPolarAngle = Math.PI / 2 - 0.04; controls.minPolarAngle = 0.15;
  controls.enableZoom = false; controls.target.set(0, 12, 0);
  canvas.style.touchAction = 'pan-y';
  let pointerDown = false;
  controls.addEventListener('change', () => { if (mode === 'approach' && pointerDown) setMode('orbit'); });

  const walker = { pos: new THREE.Vector3(12, 1.75, 44), yaw: 0, pitch: 0 }; // on the road outside the gate, facing in
  const keys = new Set();
  const walkable = (x, z) => {
    const inPlot = Math.abs(x) < 119.4 && Math.abs(z) < 34.6, onRoad = z > 35.4 && z < 50.5 && Math.abs(x) < 148, inGate = x > 5.4 && x < 18.6 && z >= 33 && z <= 37;
    if (!(inPlot || onRoad || inGate)) return false;
    if (Math.hypot(x - 104, z - 10) < 12.2 || Math.hypot((x - 86) / 9.6, (z + 16) / 5.6) < 1 || Math.hypot(x - 96, z + 8) < 3.6) return false; // the club, the pool, the kids' pool
    if (Math.abs(x - 24) < 3.1 && Math.abs(z - 32.5) < 2.3) return false; // the gatehouse
    for (const s of solids) { const dx = x - s.x, dz = z - s.z, c = Math.cos(-s.rot), sn = Math.sin(-s.rot); const lx = dx * c - dz * sn, lz = dx * sn + dz * c; if (Math.abs(lx) < s.hl && Math.abs(lz) < s.hw) return false; }
    return true;
  };
  const plinthAt = (x, z) => (Math.abs(x + 78) < 35 && Math.abs(z - 2) < 35) || (Math.abs(x + 19) < 20 && Math.abs(z - 1) < 28);
  const fwd = new THREE.Vector3(), side = new THREE.Vector3();
  const walkStep = (dt) => {
    const speed = 3.2 * dt;
    fwd.set(-Math.sin(walker.yaw), 0, -Math.cos(walker.yaw)); side.set(fwd.z, 0, -fwd.x);
    let dx = 0, dz = 0;
    if (keys.has('w') || keys.has('arrowup')) { dx += fwd.x; dz += fwd.z; }
    if (keys.has('s') || keys.has('arrowdown')) { dx -= fwd.x; dz -= fwd.z; }
    if (keys.has('a') || keys.has('arrowleft')) { dx -= side.x; dz -= side.z; }
    if (keys.has('d') || keys.has('arrowright')) { dx += side.x; dz += side.z; }
    if (dx || dz) {
      const l = Math.hypot(dx, dz); dx = (dx / l) * speed; dz = (dz / l) * speed;
      if (walkable(walker.pos.x + dx, walker.pos.z + dz)) { walker.pos.x += dx; walker.pos.z += dz; }
      else if (walkable(walker.pos.x + dx, walker.pos.z)) walker.pos.x += dx;
      else if (walkable(walker.pos.x, walker.pos.z + dz)) walker.pos.z += dz;
    }
    walker.pos.y += ((plinthAt(walker.pos.x, walker.pos.z) ? 2.75 : 1.75) - walker.pos.y) * 0.2;
  };
  let looking = null;
  canvas.addEventListener('keydown', (e) => { if (mode !== 'walk') return; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); keys.add(e.key.toLowerCase()); });
  canvas.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  canvas.addEventListener('blur', () => keys.clear());
  dpad?.querySelectorAll('button').forEach((b) => { const k = b.dataset.key; const on = (e) => { e.preventDefault(); keys.add(k); }; const off = () => keys.delete(k); b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); });

  const stops = [
    { pos: [14, 7, 62], look: [12, 5, 34], text: 'The gate on the south road. Sector 12, Vrindavan Yojna, off Shaheed Path.' },
    { pos: [-26, 11, 60], look: [-80, 8, 28], text: 'The drive runs the length of the plot, with the parking row under the palms.' },
    { pos: [-118, 22, 42], look: [-78, 16, 2], text: 'Block C, the west tower: 126 homes over the stilt parking, finished in 2018.' },
    { pos: [-19, 16, 60], look: [-19, 14, 1], text: 'Block B, the two bedroom block in the middle of the plan.' },
    { pos: [96, 16, 36], look: [92, 2, -6], text: 'The pool, the sand pit and the club at the east end, with the courts behind.' },
    { pos: [72, 12, 54], look: [40, 14, 2], text: 'Block A, the Phase II tower, with shops on the ground floor. Finished November 2024.' },
    { pos: [62, 34, 34], look: [40, 22, 2], text: 'Every box is a home. Point at one and click it to open the flat.' },
  ];
  const tour = { on: false, i: 0, t: 0, from: new THREE.Vector3(), fromLook: new THREE.Vector3() };
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
      if (tour.i >= stops.length) { setMode('approach'); return; }
      say(stops[tour.i].text);
    }
  };

  const hints = {
    approach: '',
    orbit: coarse ? 'Drag to turn round the site, pinch to zoom. Tap a home to open it.' : 'Drag to turn round the site, scroll to zoom, right drag to slide. Click a home to open it.',
    walk: coarse ? 'You are at the gate. Drag to look round, the pad walks you.' : 'You are at the gate. Drag to look round, W A S D or the arrows walk you.',
  };
  const setMode = (m) => {
    const was = mode; mode = m;
    tour.on = m === 'tour';
    if (tourBtn) tourBtn.textContent = tour.on ? 'Stop the tour' : 'Take the tour';
    if (walkBtn) walkBtn.textContent = m === 'walk' ? 'Stop walking' : 'Walk the grounds';
    if (resetBtn) resetBtn.hidden = m === 'approach';
    if (dpad) dpad.hidden = !(m === 'walk' && coarse);
    controls.enabled = m === 'orbit' || m === 'approach';
    controls.enableZoom = m === 'orbit';
    canvas.style.touchAction = m === 'approach' ? 'pan-y' : 'none';
    canvas.tabIndex = m === 'walk' ? 0 : -1;
    if (m === 'orbit') { controls.target.copy(look); controls.update(); }
    if (m === 'walk') { if (was !== 'walk') { walker.pos.set(12, 1.75, 44); walker.yaw = 0; walker.pitch = 0.02; } canvas.focus({ preventScroll: true }); }
    if (m === 'tour') { tour.i = 0; tour.t = 0; tour.from.copy(camPos); tour.fromLook.copy(look); say(stops[0].text); } else say(hints[m] || '');
    keys.clear(); start();
  };
  tourBtn?.addEventListener('click', () => setMode(tour.on ? 'approach' : 'tour'));
  walkBtn?.addEventListener('click', () => setMode(mode === 'walk' ? 'approach' : 'walk'));
  resetBtn?.addEventListener('click', () => setMode('approach'));

  const placeCamera = (immediate, dt) => {
    if (mode === 'tour') { tourStep(dt); camPos.lerp(camTarget, 0.12); look.lerp(lookTarget, 0.12); camera.position.copy(camPos); camera.lookAt(look); }
    else if (mode === 'walk') {
      walkStep(dt); camPos.copy(walker.pos);
      camera.position.copy(camPos); camera.rotation.order = 'YXZ'; camera.rotation.set(-walker.pitch, walker.yaw, 0);
      look.copy(camPos).add(new THREE.Vector3(-Math.sin(walker.yaw) * 10, 0, -Math.cos(walker.yaw) * 10));
    } else if (mode === 'orbit') { controls.update(); camPos.copy(camera.position); look.copy(controls.target); }
    else {
      camPath.getPointAt(progress, camTarget); camTarget.x += px * 3; camTarget.y += -py * 1.5;
      lookTarget.copy(lookFrom).lerp(lookTo, progress); lookTarget.x += px * 2; lookTarget.y += -py * 0.8;
      if (immediate) { camPos.copy(camTarget); look.copy(lookTarget); } else { camPos.lerp(camTarget, 0.07); look.lerp(lookTarget, 0.07); }
      camera.position.copy(camPos); camera.lookAt(look);
    }
    sky.position.copy(camera.position);
  };

  // ---------- picking a home: hover names it, click opens the card; the filters pick out a size ----------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-2, -2);
  const gold = new THREE.Color('#d9b263'), goldHot = new THREE.Color('#f0c766'), dim = new THREE.Color('#9f978c');
  let hovered = -1, selected = -1, pickDirty = false, filter = 'all';
  const shown = (i) => filter === 'all' || !records[i].home || (records[i].type && records[i].type.startsWith(filter));
  const paint = (i) => { if (i < 0) return; flats.setColorAt(i, i === selected ? goldHot : i === hovered ? gold : shown(i) ? flatColours[i] : dim); flats.instanceColor.needsUpdate = true; };
  const setHover = (i) => {
    if (i === hovered) return;
    const old = hovered; hovered = i; paint(old); paint(i); canvas.style.cursor = i >= 0 ? 'pointer' : '';
    if (tip) { if (i >= 0) { const r = records[i]; tip.textContent = `Block ${r.block} · ${ordinal(r.floor)} floor · flat ${r.flat} · ${PLANS[r.type]?.name || ''}`; tip.hidden = false; } else tip.hidden = true; }
  };
  let overGate = false;
  const pickAt = () => {
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(flats, false)[0];
    const i = hit && records[hit.instanceId]?.home ? hit.instanceId : -1;
    setHover(i);
    overGate = i < 0 && mode !== 'walk' && raycaster.intersectObjects(gateParts, false).length > 0; // the gate: a click walks you in
    if (overGate) { canvas.style.cursor = 'pointer'; if (tip) { tip.textContent = 'Walk in at the gate'; tip.hidden = false; } }
    return i;
  };
  const setFilter = (f) => { filter = f; for (let i = 0; i < records.length; i++) paint(i); ui?.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === f))); start(); };
  ui?.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => setFilter(b.dataset.filter)));
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
  const setPointer = (e) => { const r = canvas.getBoundingClientRect(); pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); if (tip) tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 18}px)`; };
  canvas.addEventListener('pointermove', (e) => {
    setPointer(e); pickDirty = true;
    if (looking && mode === 'walk') { walker.yaw = looking.yaw - (e.clientX - looking.x) * 0.005; walker.pitch = Math.max(-1.1, Math.min(1.1, looking.pitch + (e.clientY - looking.y) * 0.004)); }
  });
  canvas.addEventListener('pointerleave', () => { pointer.set(-2, -2); setHover(-1); });
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; pointerDown = true; if (mode === 'walk') { looking = { x: e.clientX, y: e.clientY, yaw: walker.yaw, pitch: walker.pitch }; canvas.setPointerCapture(e.pointerId); canvas.focus({ preventScroll: true }); } });
  const endPointer = (e) => {
    pointerDown = false; looking = null;
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) { downAt = null; return; }
    downAt = null; setPointer(e);
    const i = pickAt();
    if (i < 0 && overGate) { setMode('walk'); return; }
    const old = selected; selected = i; paint(old); paint(i);
    if (i >= 0) showCard(records[i]);
  };
  canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', () => { pointerDown = false; looking = null; downAt = null; });
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
  q('[data-pick]')?.addEventListener('click', () => { if (card) { card.hidden = !card.hidden; if (!card.hidden) card.querySelector('select')?.focus(); } });

  // the time of day: runs on its own until the slider is touched
  let manualLight = null;
  timeInput?.addEventListener('input', () => { manualLight = Number(timeInput.value) / 100; start(); pressPreset(); });
  const presets = Array.from(document.querySelectorAll('[data-time-set]'));
  const pressPreset = () => { const v = manualLight === null ? null : Math.round(manualLight * 100); presets.forEach((b) => b.setAttribute('aria-pressed', String(v !== null && Math.abs(Number(b.dataset.timeSet) - v) < 8))); };
  presets.forEach((b) => b.addEventListener('click', () => { manualLight = Number(b.dataset.timeSet) / 100; if (timeInput) timeInput.value = b.dataset.timeSet; start(); pressPreset(); }));

  // ---------- size, visibility, loop ----------
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    const pr = renderer.getPixelRatio(); fxaa.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    camera.aspect = w / h; camera.fov = mode === 'walk' ? (w < h ? 80 : 66) : (w < h ? 60 : 42); camera.updateProjectionMatrix();
  };
  new ResizeObserver(() => { resize(); if (reduced) renderOnce(); }).observe(stage);
  resize();

  const clock = new THREE.Clock();
  let visible = true, raf = 0, started = false, lastMode = mode;
  // a screen that cannot keep 30 frames a second for a while loses the glow and renders at one pixel a pixel
  let slowFrames = 0, eased = false;
  const easeOff = () => { eased = true; bloom.enabled = false; renderer.setPixelRatio(1); composer.setPixelRatio(1); resize(); };
  const render = () => {
    const dt = Math.min(0.1, clock.getDelta()), t = clock.getElapsedTime();
    if (mode !== lastMode) { lastMode = mode; resize(); }
    px = THREE.MathUtils.damp(px, mouseX, 3, dt); py = THREE.MathUtils.damp(py, mouseY, 3, dt);
    placeCamera(!started, dt);
    const u = manualLight ?? (reduced ? 0.25 : 0.5 - 0.5 * Math.cos((t / 84) * Math.PI * 2));
    setLight(u);
    if (timeInput && manualLight === null) timeInput.value = String(Math.round(u * 100));
    if (pickDirty) { pickDirty = false; pickAt(); }
    composer.render(dt);
    if (started && !eased) { slowFrames = dt > 0.034 ? slowFrames + 1 : Math.max(0, slowFrames - 1); if (slowFrames > 45) easeOff(); }
    if (!started) { started = true; hero.classList.add('is-3d'); if (ui) ui.hidden = false; loader.done(); }
  };
  const loop = () => { raf = 0; if (!visible || document.hidden) return; render(); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible && !document.hidden && (!reduced || mode !== 'approach')) raf = requestAnimationFrame(loop); };
  const renderOnce = () => { placeCamera(true, 0); render(); };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0 }).observe(stage);
  document.addEventListener('visibilitychange', start);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); hero.classList.remove('is-3d'); canvas.remove(); if (raf) cancelAnimationFrame(raf); visible = false; });

  stage.append(canvas);
  if (reduced) renderOnce(); else start();

  // a still of the scene, for the static fallback picture and the social image
  window.__heroSnapshot = (w = 1600, h = 900, light = 0.15, at = 0.3) => {
    const prevRatio = renderer.getPixelRatio(); renderer.setPixelRatio(1); composer.setPixelRatio(1); renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h; camera.fov = w < h ? 60 : 42; camera.updateProjectionMatrix();
    const saved = progress, savedMode = mode; mode = 'approach'; progress = at; px = 0; py = 0; placeCamera(true, 0); setLight(light); composer.render();
    const data = canvas.toDataURL('image/jpeg', 0.86);
    progress = saved; mode = savedMode; renderer.setPixelRatio(prevRatio); composer.setPixelRatio(prevRatio); resize(); return data;
  };
}

if (hero && stage) init();
