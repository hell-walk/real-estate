// The ridge in three dimensions: a low-poly Sahyadri ridge with the six blocks of Verdant Ridge on its crest,
// the lake in the valley, the ridge road climbing to the gate. Scrolling climbs the road; the pointer tilts the view;
// the light shifts slowly from afternoon to dusk and the windows come on. Falls back to the static render in the
// hero when WebGL is missing, pauses when hidden, caps pixel ratio on phones. Three.js 0.170.0 from the CDN.
import * as THREE from 'three';

const hero = document.querySelector('.hero');
const stage = document.getElementById('hero-stage');
if (hero && stage) init();

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}

function init() {
  if (!webglAvailable()) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const phone = coarse || innerWidth < 768;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !phone, powerPreference: 'high-performance', alpha: false });
  } catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, phone ? 1.25 : 1.5));
  renderer.shadowMap.enabled = !phone;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);

  // ---------- terrain ----------
  const SIZE = 220, SEG = phone ? 110 : 170;
  const plateau = (x, z) => x > -24 && x < 24 && z > -14 && z < 6;
  // 1 inside the plateau, fading to 0 over ten units outside it, so the crest flattens without a cliff
  const plateauMix = (x, z) => {
    const dx = Math.max(0, Math.abs(x) - 24), dz = Math.max(0, z < -14 ? -14 - z : z - 6);
    const d = Math.hypot(dx, dz); return d >= 10 ? 0 : 1 - THREE.MathUtils.smoothstep(d, 0, 10);
  };
  const height = (x, z) => {
    const mix = plateauMix(x, z);
    if (mix >= 1) return 10;
    const ridge = 10 * Math.exp(-(((z + 4) / 16) ** 2)) * (0.78 + 0.22 * Math.sin(x * 0.11 + 1.2));
    const back = 17 * Math.exp(-(((z + 62) / 26) ** 2)) * (0.6 + 0.4 * Math.cos(x * 0.07));
    const far = 24 * Math.exp(-(((z + 110) / 30) ** 2)) * (0.7 + 0.3 * Math.sin(x * 0.05 + 2));
    const noise = 0.7 * Math.sin(x * 0.63) * Math.cos(z * 0.57) + 0.35 * Math.sin(x * 1.7 + z * 1.1) + 0.2 * Math.cos(x * 2.9 - z * 2.3);
    const valley = -0.6 * Math.exp(-(((z - 44) / 22) ** 2)) * Math.exp(-(((x + 44) / 40) ** 2));
    const edge = Math.min(1, Math.max(0, (1 - (Math.abs(x) / (SIZE / 2)) ** 6)));
    const natural = (ridge + back + far + noise * (0.3 + 0.7 * Math.min(1, (ridge + back) / 6)) + valley * 8) * edge;
    return THREE.MathUtils.lerp(natural, 10, mix);
  };
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cLow = new THREE.Color('#3f5a35'), cMid = new THREE.Color('#5e7a43'), cHigh = new THREE.Color('#8d8a6a'), cRock = new THREE.Color('#6a5c4e'), cPlateau = new THREE.Color('#55713f');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = height(x, z);
    pos.setY(i, y);
    const slope = Math.abs(height(x + 1, z) - y) + Math.abs(height(x, z + 1) - y);
    if (plateau(x, z)) tmp.copy(cPlateau);
    else if (slope > 2.3) tmp.copy(cRock);
    else { const t = Math.min(1, y / 20); tmp.copy(cLow).lerp(cMid, Math.min(1, t * 2)).lerp(cHigh, Math.max(0, t * 2 - 1)); }
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ---------- the lake in the valley ----------
  const lake = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: '#2b4752', roughness: 0.18, metalness: 0.55 }));
  lake.rotation.x = -Math.PI / 2; lake.position.set(-46, 0.25, 46); lake.scale.set(1.5, 0.9, 1);
  scene.add(lake);

  // ---------- the enclave: six blocks, a club, a pool ----------
  const stone = new THREE.MeshStandardMaterial({ color: '#e2d6c1', roughness: 0.92 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: '#b8a98c', roughness: 0.95 });
  const gold = new THREE.MeshStandardMaterial({ color: '#c9a45a', roughness: 0.5, metalness: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: '#ffd9a0', emissive: '#ffb860', emissiveIntensity: 0, roughness: 0.4 });
  const enclave = new THREE.Group();
  const blocks = [[-15, -8, 0], [-5, -10, 0.2], [5, -9, -0.1], [15, -7, 0.15], [-9, -1, -0.2], [9, 0, 0.1]];
  const windowMatrices = [];
  const dummy = new THREE.Object3D();
  blocks.forEach(([bx, bz, rot], i) => {
    const floors = 11, fh = 0.86, w = 6.4, d = 7.2;
    const g = new THREE.Group(); g.position.set(bx, 10, bz); g.rotation.y = rot;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, floors * fh, d), stone);
    body.position.y = (floors * fh) / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    // stepped terraces on the west face (the side that faces the hills)
    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.4, (floors - s * 3) * fh, d * 0.7), s % 2 ? stoneDark : stone);
      step.position.set(-w / 2 - 0.7 - s * 1.4, ((floors - s * 3) * fh) / 2, 0); step.castShadow = true; g.add(step);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.18, d + 0.4), gold); roof.position.y = floors * fh + 0.09; g.add(roof);
    const core = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.2), stoneDark); core.position.set(1.4, floors * fh + 0.6, -1.2); g.add(core);
    // windows on north and south faces
    for (let f = 0; f < floors; f++) for (let k = 0; k < 5; k++) for (const side of [-1, 1]) {
      dummy.position.set(-w / 2 + 0.9 + k * 1.15, f * fh + 0.5, side * (d / 2 + 0.02)); dummy.rotation.set(0, side > 0 ? 0 : Math.PI, 0); dummy.scale.set(1, 1, 1);
      dummy.updateMatrix(); const m = dummy.matrix.clone(); m.premultiply(new THREE.Matrix4().makeRotationY(rot)).premultiply(new THREE.Matrix4().makeTranslation(bx, 10, bz));
      windowMatrices.push(m);
    }
    enclave.add(g);
    void i;
  });
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.62, 0.42), glass, windowMatrices.length);
  windowMatrices.forEach((m, i) => windows.setMatrixAt(i, m));
  enclave.add(windows);
  const club = new THREE.Mesh(new THREE.BoxGeometry(12, 2.2, 7), stone); club.position.set(-21, 11.1, 2); club.castShadow = true; enclave.add(club);
  const clubRoof = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.18, 7.6), gold); clubRoof.position.set(-21, 12.3, 2); enclave.add(clubRoof);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), new THREE.MeshStandardMaterial({ color: '#3b7f8c', roughness: 0.1, metalness: 0.5 })); pool.rotation.x = -Math.PI / 2; pool.position.set(-20, 10.06, -5.5); enclave.add(pool);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(46, 18), new THREE.MeshStandardMaterial({ color: '#5b7b40', roughness: 1 })); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, 10.02, -4); lawn.receiveShadow = true; enclave.add(lawn);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(48, 0.6, 0.5), stoneDark); wall.position.set(0, 10.3, 5.6); enclave.add(wall);
  scene.add(enclave);

  // ---------- the ridge road, climbing from the valley to the gate ----------
  const roadPts = [[14, 60], [22, 48], [16, 36], [26, 26], [18, 16], [8, 10], [0, 6.2]].map(([x, z]) => new THREE.Vector3(x, height(x, z) + 0.15, z));
  const roadCurve = new THREE.CatmullRomCurve3(roadPts, false, 'catmullrom', 0.4);
  // a flat strip laid on the ground: left and right edges offset from the curve, each point at ground height
  const STEPS = 140, HALF = 1.15, rv = [], ri = [];
  for (let i = 0; i <= STEPS; i++) {
    const p = roadCurve.getPointAt(i / STEPS), tangent = roadCurve.getTangentAt(i / STEPS);
    const nx = -tangent.z, nz = tangent.x, len = Math.hypot(nx, nz) || 1;
    for (const s of [-1, 1]) { const x = p.x + (nx / len) * HALF * s, z = p.z + (nz / len) * HALF * s; rv.push(x, height(x, z) + 0.14, z); }
    if (i < STEPS) { const a = i * 2; ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); roadGeo.setIndex(ri); roadGeo.computeVertexNormals();
  const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ color: '#3a322a', roughness: 1, side: THREE.DoubleSide }));
  scene.add(road);
  const lampMat = new THREE.MeshStandardMaterial({ color: '#5a4e3e', emissive: '#ffcf7a', emissiveIntensity: 0 });
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 6, 6), lampMat, 16);
  for (let i = 0; i < 16; i++) { const p = roadCurve.getPointAt(i / 15); dummy.position.set(p.x + 1.4, p.y + 2.1, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); lamps.setMatrixAt(i, dummy.matrix); }
  scene.add(lamps);

  // ---------- trees: cones on trunks, scattered where the ground is gentle ----------
  const COUNT = phone ? 180 : 320;
  const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(1.1, 2.6, 6), new THREE.MeshStandardMaterial({ color: '#2f4a2b', roughness: 1, flatShading: true }), COUNT);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 5), new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1 }), COUNT);
  let placed = 0, seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  while (placed < COUNT) {
    const x = (rnd() - 0.5) * 170, z = (rnd() - 0.5) * 140 - 30;
    if (plateau(x - 3, z - 3) || plateau(x + 3, z + 3)) { if (rnd() > 0.12) continue; }
    const y = height(x, z);
    const slope = Math.abs(height(x + 1, z) - y) + Math.abs(height(x, z + 1) - y);
    if (y < 0.6 || slope > 1.4 || roadCurve.getPoints(40).some((p) => p.distanceTo(new THREE.Vector3(x, y, z)) < 2.4)) continue;
    const s = 0.7 + rnd() * 0.8;
    dummy.position.set(x, y + 1.1 * s + 1.1, z); dummy.scale.setScalar(s); dummy.rotation.set(0, rnd() * 6.28, 0); dummy.updateMatrix(); crown.setMatrixAt(placed, dummy.matrix);
    dummy.position.set(x, y + 0.5 * s, z); dummy.updateMatrix(); trunk.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  crown.castShadow = !phone; scene.add(crown, trunk);

  // ---------- light ----------
  const sun = new THREE.DirectionalLight('#fff1d6', 2.2);
  sun.castShadow = !phone;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -40; sun.shadow.camera.right = 40; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40; sun.shadow.camera.near = 10; sun.shadow.camera.far = 160; sun.shadow.bias = -0.0008;
  sun.target.position.set(0, 10, -4); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#cfd6dc', '#2b2419', 0.9); scene.add(hemi);
  const ambient = new THREE.AmbientLight('#ffffff', 0.12); scene.add(ambient);
  const skyDay = new THREE.Color('#aebcc6'), skyDusk = new THREE.Color('#3a2a24');
  const sunDay = new THREE.Color('#fff1d6'), sunDusk = new THREE.Color('#ff9a4a');
  const hemiDay = new THREE.Color('#cfd6dc'), hemiDusk = new THREE.Color('#5a3f36');
  scene.background = skyDay.clone();
  scene.fog = new THREE.Fog(scene.background, 60, 230);

  // ---------- camera path: the climb ----------
  const camPath = new THREE.CatmullRomCurve3([new THREE.Vector3(6, 3.5, 104), new THREE.Vector3(24, 9, 66), new THREE.Vector3(32, 18, 34), new THREE.Vector3(26, 27, 14)]);
  const lookFrom = new THREE.Vector3(0, 9, -4), lookTo = new THREE.Vector3(-2, 10, -4);
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3(), look = new THREE.Vector3();
  let progress = 0, mouseX = 0, mouseY = 0, px = 0, py = 0;
  const readScroll = () => { progress = Math.min(1, Math.max(0, scrollY / Math.max(1, hero.offsetHeight))); };
  readScroll();
  addEventListener('scroll', readScroll, { passive: true });
  if (!coarse && !reduced) {
    addEventListener('pointermove', (e) => { mouseX = (e.clientX / innerWidth) * 2 - 1; mouseY = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
    hero.addEventListener('pointerleave', () => { mouseX = 0; mouseY = 0; });
  }

  const placeCamera = (immediate) => {
    camPath.getPointAt(progress, camTarget);
    camTarget.x += px * 2.2; camTarget.y += -py * 1.2;
    if (immediate) camPos.copy(camTarget); else camPos.lerp(camTarget, 0.08);
    look.copy(lookFrom).lerp(lookTo, progress);
    look.x += px * 1.5; look.y += -py * 0.6;
    camera.position.copy(camPos); camera.lookAt(look);
  };

  const setLight = (u) => {
    // u: 0 afternoon, 1 dusk
    const el = THREE.MathUtils.lerp(0.62, 0.09, u), az = THREE.MathUtils.lerp(-2.4, -2.05, u);
    sun.position.set(Math.cos(el) * Math.sin(az) * 90, Math.sin(el) * 90, Math.cos(el) * Math.cos(az) * 90).add(sun.target.position);
    sun.color.copy(sunDay).lerp(sunDusk, u); sun.intensity = THREE.MathUtils.lerp(2.2, 0.75, u);
    hemi.color.copy(hemiDay).lerp(hemiDusk, u); hemi.intensity = THREE.MathUtils.lerp(0.9, 0.5, u);
    scene.background.copy(skyDay).lerp(skyDusk, u); scene.fog.color.copy(scene.background);
    const on = THREE.MathUtils.smoothstep(u, 0.45, 0.92);
    glass.emissiveIntensity = on * 1.8; glass.color.setHex(on > 0.2 ? 0xffe6b8 : 0x8a9aa3);
    lampMat.emissiveIntensity = on * 2.5; lampMat.color.setHex(on > 0.2 ? 0xffe3b0 : 0x5a4e3e);
  };

  // ---------- size, visibility, loop ----------
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 50 : 36; camera.updateProjectionMatrix();
  };
  new ResizeObserver(() => { resize(); if (reduced) renderOnce(); }).observe(stage);
  resize();

  const clock = new THREE.Clock();
  let visible = true, raf = 0, started = false;
  const render = () => {
    const t = clock.getElapsedTime();
    px += (mouseX - px) * 0.05; py += (mouseY - py) * 0.05;
    placeCamera(!started);
    setLight(reduced ? 0.55 : 0.5 - 0.5 * Math.cos((t / 52) * Math.PI * 2));
    renderer.render(scene, camera);
    if (!started) { started = true; hero.classList.add('is-3d'); }
  };
  const loop = () => { raf = 0; if (!visible || document.hidden) return; render(); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop); };
  const renderOnce = () => { placeCamera(true); render(); };

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0 }).observe(stage);
  document.addEventListener('visibilitychange', start);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); hero.classList.remove('is-3d'); canvas.remove(); if (raf) cancelAnimationFrame(raf); visible = false; });

  stage.append(canvas);
  if (reduced) renderOnce(); else start();

  // a still of the scene, for the static fallback picture and the social image
  window.__heroSnapshot = (w = 1600, h = 900, light = 0.2, at = 0.14) => { // afternoon light by default; the fallback picture is made from this
    const prevRatio = renderer.getPixelRatio(); renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = 42; camera.updateProjectionMatrix();
    const saved = progress; progress = at; px = 0; py = 0; placeCamera(true); setLight(light); renderer.render(scene, camera);
    const data = canvas.toDataURL('image/jpeg', 0.86);
    progress = saved; renderer.setPixelRatio(prevRatio); resize(); return data;
  };
}
