// The ridge in three dimensions: a low-poly Sahyadri ridge with the six blocks of Verdant Ridge on its crest,
// the lake in the valley, the ridge road climbing to the gate, a sky with a sun in it and a few clouds. Scrolling
// climbs the road; the pointer tilts the view; the light moves slowly from golden afternoon to dusk and the windows
// come on. Falls back to the static render in the hero when WebGL is missing, pauses when hidden, caps pixel ratio
// on phones. Three.js 0.170.0 from the CDN.
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
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 700);

  // ---------- terrain ----------
  const SIZE = 240, SEG = phone ? 110 : 180;
  const plateau = (x, z) => x > -26 && x < 26 && z > -15 && z < 7;
  // 1 inside the plateau, fading to 0 over ten units outside it, so the crest flattens without a cliff
  const plateauMix = (x, z) => {
    const dx = Math.max(0, Math.abs(x) - 26), dz = Math.max(0, z < -15 ? -15 - z : z - 7);
    const d = Math.hypot(dx, dz); return d >= 10 ? 0 : 1 - THREE.MathUtils.smoothstep(d, 0, 10);
  };
  const height = (x, z) => {
    const mix = plateauMix(x, z);
    if (mix >= 1) return 10;
    const ridge = 10 * Math.exp(-(((z + 4) / 17) ** 2)) * (0.78 + 0.22 * Math.sin(x * 0.11 + 1.2));
    const back = 19 * Math.exp(-(((z + 64) / 26) ** 2)) * (0.6 + 0.4 * Math.cos(x * 0.07));
    const far = 28 * Math.exp(-(((z + 112) / 30) ** 2)) * (0.7 + 0.3 * Math.sin(x * 0.05 + 2));
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
  // the Sahyadri after the rains: deep green in the folds, brighter grass on the shoulders, dry gold on the tops, dark basalt where it is steep
  const cLow = new THREE.Color('#2e5a2c'), cMid = new THREE.Color('#5f8e3a'), cMid2 = new THREE.Color('#7da245'), cHigh = new THREE.Color('#b3a15a'), cRock = new THREE.Color('#5a4636'), cPlateau = new THREE.Color('#6a9a40');
  const tmp = new THREE.Color();
  const hash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = height(x, z);
    pos.setY(i, y);
    const slope = Math.abs(height(x + 1, z) - y) + Math.abs(height(x, z + 1) - y);
    const patch = 0.5 + 0.5 * Math.sin(x * 0.21 + 1.7) * Math.cos(z * 0.17 - 0.4); // broad fields of lighter and darker grass
    if (plateau(x, z)) tmp.copy(cPlateau);
    else if (slope > 2.4) tmp.copy(cRock).lerp(cHigh, 0.25 * hash(x, z));
    else { const t = Math.min(1, y / 22); tmp.copy(cLow).lerp(cMid, Math.min(1, t * 2.2)).lerp(cMid2, patch * 0.6).lerp(cHigh, Math.max(0, t * 2 - 1.1)); }
    tmp.offsetHSL(0, 0, (hash(x + 1, z) - 0.5) * 0.06);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  terrain.receiveShadow = true;
  scene.add(terrain);

  // ---------- the lake in the valley ----------
  const lakeMat = new THREE.MeshStandardMaterial({ color: '#8fb7c9', roughness: 0.1, metalness: 0.3 });
  const lake = new THREE.Mesh(new THREE.CircleGeometry(30, 48), lakeMat);
  lake.rotation.x = -Math.PI / 2; lake.position.set(-62, 0.25, 36); lake.scale.set(1.3, 0.8, 1);
  scene.add(lake);

  // ---------- the sky: a dome with a horizon haze and the sun in it ----------
  const skyUniforms = { top: { value: new THREE.Color('#2f6fc4') }, horizon: { value: new THREE.Color('#f0dcb4') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color('#ffd79a') } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({
    uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vDir = normalize(w.xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float t = pow(clamp(d.y, 0.0, 1.0), 0.5);
        vec3 c = mix(horizon, top, t);
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunColor * (pow(s, 4.0) * 0.28 + pow(s, 48.0) * 0.9 + pow(s, 900.0) * 3.0);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  sky.renderOrder = -1;
  scene.add(sky);

  // a few flat-bottomed clouds, far off, so the sky has something in it
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#fff8ee', roughness: 1, flatShading: true });
  const clouds = new THREE.Group();
  const puff = new THREE.SphereGeometry(1, 7, 5);
  const cloudSpots = [[-120, 58, -170, 1.6], [-40, 66, -210, 2.1], [60, 54, -180, 1.4], [150, 62, -160, 1.8], [-170, 48, -90, 1.2], [200, 52, -60, 1.3], [-80, 72, -240, 2.4], [110, 70, -230, 1.9]];
  cloudSpots.forEach(([cx, cy, cz, sc]) => {
    const g = new THREE.Group(); g.position.set(cx, cy, cz);
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(puff, cloudMat);
      m.position.set((i - 2.5) * 5.5 * sc + Math.sin(i * 2.1) * 2, Math.cos(i * 1.7) * 1.5 * sc, Math.sin(i * 3.3) * 3);
      m.scale.set((6 + (i % 3) * 2) * sc, (3 + (i % 2) * 1.2) * sc, (4 + (i % 2)) * sc);
      g.add(m);
    }
    clouds.add(g);
  });
  scene.add(clouds);

  // ---------- the enclave: six blocks, a club, a pool ----------
  const stone = new THREE.MeshStandardMaterial({ color: '#ead9bd', roughness: 0.88 });
  const stoneDark = new THREE.MeshStandardMaterial({ color: '#b9a687', roughness: 0.95 });
  const basalt = new THREE.MeshStandardMaterial({ color: '#4a3f36', roughness: 1 });
  const gold = new THREE.MeshStandardMaterial({ color: '#c9a45a', roughness: 0.45, metalness: 0.45 });
  const glass = new THREE.MeshStandardMaterial({ color: '#cfe0ec', emissive: '#ffb860', emissiveIntensity: 0, roughness: 0.3, metalness: 0.35 });
  const enclave = new THREE.Group();
  const blocks = [[-17, -8, 0], [-6, -10, 0.2], [5, -9, -0.1], [16, -7, 0.15], [-10, 0, -0.2], [10, 1, 0.1]];
  const windowMatrices = [], balconyMatrices = [];
  const dummy = new THREE.Object3D();
  blocks.forEach(([bx, bz, rot]) => {
    const floors = 13, fh = 0.9, w = 7, d = 8;
    const place = (m) => m.premultiply(new THREE.Matrix4().makeRotationY(rot)).premultiply(new THREE.Matrix4().makeTranslation(bx, 10, bz));
    const g = new THREE.Group(); g.position.set(bx, 10, bz); g.rotation.y = rot;
    const podium = new THREE.Mesh(new THREE.BoxGeometry(w + 2.4, 1, d + 2.4), basalt); podium.position.y = 0.5; podium.receiveShadow = true; g.add(podium);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, floors * fh, d), stone);
    body.position.y = (floors * fh) / 2 + 0.2; body.castShadow = true; body.receiveShadow = true; g.add(body);
    // stepped terraces on the west face (the side that faces the hills)
    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.5, (floors - s * 3) * fh, d * 0.7), s % 2 ? stoneDark : stone);
      step.position.set(-w / 2 - 0.75 - s * 1.5, ((floors - s * 3) * fh) / 2 + 0.2, 0); step.castShadow = true; g.add(step);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.2, d + 0.5), gold); roof.position.y = floors * fh + 0.3; g.add(roof);
    const core = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 2.4), stoneDark); core.position.set(1.5, floors * fh + 0.95, -1.3); g.add(core);
    // windows on both long faces, a balcony slab under each row on the valley side
    for (let f = 0; f < floors; f++) {
      for (let k = 0; k < 5; k++) for (const side of [-1, 1]) {
        dummy.position.set(-w / 2 + 1 + k * 1.25, f * fh + 0.75, side * (d / 2 + 0.02)); dummy.rotation.set(0, side > 0 ? 0 : Math.PI, 0); dummy.scale.set(1, 1, 1);
        dummy.updateMatrix(); windowMatrices.push(place(dummy.matrix.clone()));
      }
      dummy.position.set(0.3, f * fh + 0.42, d / 2 + 0.6); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      balconyMatrices.push(place(dummy.matrix.clone()));
    }
    enclave.add(g);
  });
  const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.7, 0.5), glass, windowMatrices.length);
  windowMatrices.forEach((m, i) => windows.setMatrixAt(i, m));
  const balconies = new THREE.InstancedMesh(new THREE.BoxGeometry(5.6, 0.14, 1.2), stoneDark, balconyMatrices.length);
  balconyMatrices.forEach((m, i) => balconies.setMatrixAt(i, m));
  balconies.castShadow = !phone;
  enclave.add(windows, balconies);
  const club = new THREE.Mesh(new THREE.BoxGeometry(13, 2.4, 7.5), stone); club.position.set(-23, 11.2, 3); club.castShadow = true; enclave.add(club);
  const clubRoof = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.2, 8.1), gold); clubRoof.position.set(-23, 12.5, 3); enclave.add(clubRoof);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), new THREE.MeshStandardMaterial({ color: '#4fa3b4', roughness: 0.08, metalness: 0.5 })); pool.rotation.x = -Math.PI / 2; pool.position.set(-22, 10.06, -5.5); enclave.add(pool);
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(50, 20), new THREE.MeshStandardMaterial({ color: '#6c9c42', roughness: 1 })); lawn.rotation.x = -Math.PI / 2; lawn.position.set(0, 10.02, -4); lawn.receiveShadow = true; enclave.add(lawn);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(52, 0.45, 0.5), stoneDark); wall.position.set(0, 10.22, 6.6); enclave.add(wall);
  scene.add(enclave);

  // ---------- the ridge road, climbing from the valley to the gate ----------
  const roadPts = [[14, 62], [22, 50], [16, 38], [26, 28], [18, 17], [8, 11], [0, 7.2]].map(([x, z]) => new THREE.Vector3(x, height(x, z) + 0.15, z));
  const roadCurve = new THREE.CatmullRomCurve3(roadPts, false, 'catmullrom', 0.4);
  // a flat strip laid on the ground: left and right edges offset from the curve, each point at ground height
  const STEPS = 140, HALF = 1.2, rv = [], ri = [];
  for (let i = 0; i <= STEPS; i++) {
    const p = roadCurve.getPointAt(i / STEPS), tangent = roadCurve.getTangentAt(i / STEPS);
    const nx = -tangent.z, nz = tangent.x, len = Math.hypot(nx, nz) || 1;
    for (const s of [-1, 1]) { const x = p.x + (nx / len) * HALF * s, z = p.z + (nz / len) * HALF * s; rv.push(x, height(x, z) + 0.14, z); }
    if (i < STEPS) { const a = i * 2; ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); roadGeo.setIndex(ri); roadGeo.computeVertexNormals();
  const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ color: '#4a4036', roughness: 1, side: THREE.DoubleSide }));
  scene.add(road);
  const lampMat = new THREE.MeshStandardMaterial({ color: '#5a4e3e', emissive: '#ffcf7a', emissiveIntensity: 0 });
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 6), lampMat, 16);
  for (let i = 0; i < 16; i++) { const p = roadCurve.getPointAt(i / 15); dummy.position.set(p.x + 1.5, p.y + 2.1, p.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); lamps.setMatrixAt(i, dummy.matrix); }
  scene.add(lamps);

  // ---------- trees: cones on trunks, scattered where the ground is gentle, two greens ----------
  const COUNT = phone ? 220 : 420;
  const crownGeo = new THREE.ConeGeometry(1.2, 2.8, 6);
  const crownA = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: '#2f5f2e', roughness: 1, flatShading: true }), COUNT);
  const crownB = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.5, 0), new THREE.MeshStandardMaterial({ color: '#4d7f33', roughness: 1, flatShading: true }), COUNT);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 1.1, 5), new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1 }), COUNT);
  let placed = 0, seed = 7, na = 0, nb = 0;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const roadSamples = roadCurve.getPoints(40);
  const probe = new THREE.Vector3();
  while (placed < COUNT) {
    const x = (rnd() - 0.5) * 190, z = (rnd() - 0.5) * 150 - 30;
    if (plateau(x - 3, z - 3) || plateau(x + 3, z + 3)) { if (rnd() > 0.12) continue; }
    const y = height(x, z);
    const slope = Math.abs(height(x + 1, z) - y) + Math.abs(height(x, z + 1) - y);
    if (y < 0.6 || slope > 1.5 || roadSamples.some((p) => p.distanceTo(probe.set(x, y, z)) < 2.6)) continue;
    const s = 0.7 + rnd() * 0.9;
    dummy.position.set(x, y + 1.2 * s + 1.1, z); dummy.scale.setScalar(s); dummy.rotation.set(0, rnd() * 6.28, 0); dummy.updateMatrix();
    if (rnd() < 0.5) crownA.setMatrixAt(na++, dummy.matrix); else { dummy.position.y -= 0.3 * s; dummy.updateMatrix(); crownB.setMatrixAt(nb++, dummy.matrix); }
    dummy.position.set(x, y + 0.5 * s, z); dummy.updateMatrix(); trunk.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  crownA.count = na; crownB.count = nb;
  crownA.castShadow = crownB.castShadow = !phone; scene.add(crownA, crownB, trunk);

  // ---------- light ----------
  const sun = new THREE.DirectionalLight('#ffd9a6', 3);
  sun.castShadow = !phone;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -48; sun.shadow.camera.right = 48; sun.shadow.camera.top = 48; sun.shadow.camera.bottom = -48; sun.shadow.camera.near = 10; sun.shadow.camera.far = 220; sun.shadow.bias = -0.0006;
  sun.target.position.set(0, 10, -4); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#9fb8d0', '#4a3b25', 0.85); scene.add(hemi);
  const ambient = new THREE.AmbientLight('#ffe9c9', 0.12); scene.add(ambient);
  const day = { top: new THREE.Color('#2f6fc4'), horizon: new THREE.Color('#f0dcb4'), sun: new THREE.Color('#ffd9a6'), sunGlow: new THREE.Color('#ffd79a'), hemi: new THREE.Color('#9fb8d0'), fog: new THREE.Color('#d7c7ab'), lake: new THREE.Color('#8fb7c9') };
  const dusk = { top: new THREE.Color('#2a2746'), horizon: new THREE.Color('#f0924e'), sun: new THREE.Color('#ff8a3c'), sunGlow: new THREE.Color('#ff9a4a'), hemi: new THREE.Color('#6b4a5a'), fog: new THREE.Color('#6d4a44'), lake: new THREE.Color('#c77a4a') };
  scene.background = day.horizon.clone();
  scene.fog = new THREE.Fog(day.fog.clone(), 48, 230);

  // ---------- camera path: the climb ----------
  const camPath = new THREE.CatmullRomCurve3([new THREE.Vector3(8, 7.5, 80), new THREE.Vector3(26, 11, 56), new THREE.Vector3(32, 18, 32), new THREE.Vector3(26, 27, 14)]);
  const lookFrom = new THREE.Vector3(0, 12, -4), lookTo = new THREE.Vector3(-2, 10, -4);
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
    sky.position.copy(camPos);
  };

  const setLight = (u) => {
    // u: 0 golden afternoon, 1 dusk
    const el = THREE.MathUtils.lerp(0.42, 0.07, u), az = THREE.MathUtils.lerp(-1.15, -1.45, u);
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    sun.position.copy(dir).multiplyScalar(110).add(sun.target.position);
    sun.color.copy(day.sun).lerp(dusk.sun, u); sun.intensity = THREE.MathUtils.lerp(3, 0.9, u);
    hemi.color.copy(day.hemi).lerp(dusk.hemi, u); hemi.intensity = THREE.MathUtils.lerp(0.85, 0.5, u);
    skyUniforms.top.value.copy(day.top).lerp(dusk.top, u);
    skyUniforms.horizon.value.copy(day.horizon).lerp(dusk.horizon, u);
    skyUniforms.sunColor.value.copy(day.sunGlow).lerp(dusk.sunGlow, u);
    skyUniforms.sunDir.value.copy(dir);
    scene.fog.color.copy(day.fog).lerp(dusk.fog, u); scene.background.copy(scene.fog.color);
    lakeMat.color.copy(day.lake).lerp(dusk.lake, u);
    cloudMat.color.setHex(0xfff8ee).lerp(new THREE.Color('#e08a62'), u);
    const on = THREE.MathUtils.smoothstep(u, 0.45, 0.92);
    glass.emissiveIntensity = on * 1.8; glass.color.setHex(on > 0.2 ? 0xffe6b8 : 0xcfe0ec);
    lampMat.emissiveIntensity = on * 2.5; lampMat.color.setHex(on > 0.2 ? 0xffe3b0 : 0x5a4e3e);
  };

  // ---------- size, visibility, loop ----------
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 54 : 38; camera.updateProjectionMatrix();
  };
  new ResizeObserver(() => { resize(); if (reduced) renderOnce(); }).observe(stage);
  resize();

  const clock = new THREE.Clock();
  let visible = true, raf = 0, started = false;
  const render = () => {
    const t = clock.getElapsedTime();
    px += (mouseX - px) * 0.05; py += (mouseY - py) * 0.05;
    placeCamera(!started);
    setLight(reduced ? 0.3 : 0.5 - 0.5 * Math.cos((t / 52) * Math.PI * 2));
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
  window.__heroSnapshot = (w = 1600, h = 900, light = 0.15, at = 0.1) => { // golden light by default; the fallback picture is made from this
    const prevRatio = renderer.getPixelRatio(); renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = w < h ? 54 : 38; camera.updateProjectionMatrix();
    const saved = progress; progress = at; px = 0; py = 0; placeCamera(true); setLight(light); renderer.render(scene, camera);
    const data = canvas.toDataURL('image/jpeg', 0.86);
    progress = saved; renderer.setPixelRatio(prevRatio); resize(); return data;
  };
}
