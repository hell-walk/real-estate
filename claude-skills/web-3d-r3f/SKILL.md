---
name: web-3d-r3f
description: Build interactive 3D websites, hero sections, product viewers and 3D dashboards with Three.js, React Three Fiber, Drei, React Postprocessing and React Three Rapier.
---

# 3D web design with Three.js + React Three Fiber

Use this skill when asked to build a 3D website, a 3D hero/landing section, a product configurator or viewer, a 3D dashboard, glass/chrome/realistic materials, scroll-driven 3D, cinematic effects (bloom, depth of field) or physics (falling, bouncing, colliding objects).

Source repos (as of Nov 2026):

| Library | Repo | npm | Version |
|---|---|---|---|
| Three.js | github.com/mrdoob/three.js | `three` | 0.187 |
| React Three Fiber (R3F) | github.com/pmndrs/react-three-fiber | `@react-three/fiber` | 9.x (React 19 only) |
| Drei | github.com/pmndrs/drei | `@react-three/drei` | 10.x (needs R3F 9, three >= 0.159) |
| React Postprocessing | github.com/pmndrs/react-postprocessing | `@react-three/postprocessing` + `postprocessing` | 3.x (needs R3F >= 9.7) |
| React Three Rapier | github.com/pmndrs/react-three-rapier | `@react-three/rapier` | 2.x |

Always check the live versions with `npm view <pkg> version peerDependencies` before pinning; these move fast.

## 1. Project setup

```bash
npm create vite@latest my-3d-site -- --template react-ts
cd my-3d-site
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing @react-three/rapier
npm i -D @types/three
```

React must be 19.x for R3F 9. If a project is stuck on React 18, use R3F 8 + Drei 9 + postprocessing 2 + rapier 1 instead.

For a single self-contained HTML file with no build step (quick demos, artifacts), use plain Three.js through an import map:

```html
<script type="importmap">
{ "imports": {
  "three": "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js",
  "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/"
}}
</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
</script>
```

## 2. Scene skeleton (R3F)

```tsx
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import { Suspense } from 'react'

export default function App() {
  return (
    <div style={{ height: '100vh' }}>
      <Canvas camera={{ position: [0, 1.5, 5], fov: 45 }} dpr={[1, 2]} shadows>
        <color attach="background" args={['#0b0b10']} />
        <Suspense fallback={null}>
          <Environment preset="city" />
          <Hero />
          <ContactShadows position={[0, -1, 0]} opacity={0.5} blur={2.5} scale={10} />
        </Suspense>
        <OrbitControls enableDamping makeDefault />
      </Canvas>
    </div>
  )
}
```

The `<Canvas>` needs a parent with a real height. JSX elements map 1:1 to Three.js classes in camelCase (`<mesh>`, `<boxGeometry args={[1,1,1]} />`, `<meshStandardMaterial color="hotpink" />`). Constructor arguments go in `args`; nested props use dashes (`position-x`, `material-color`).

## 3. R3F rules that matter

- Hooks (`useFrame`, `useThree`, `useLoader`) only work inside components rendered under `<Canvas>`.
- Animate by mutating refs inside `useFrame((state, delta) => ...)`. Never call `setState` per frame or on fast pointer events.
- Multiply motion by `delta` so speed is the same on 60 Hz and 120 Hz screens. Smooth with `THREE.MathUtils.lerp` or `damp`.
- Do not allocate in the loop (`new THREE.Vector3()` inside `useFrame`); create once outside or with `useMemo`.
- Prefer toggling `visible` over mounting and unmounting heavy objects; every new material compiles shaders.
- Share geometries and materials; use `<Instances>` / `<instancedMesh>` for many copies.
- For static scenes use `<Canvas frameloop="demand">` and call `invalidate()` after changes.
- Events: `onClick`, `onPointerOver`, `onPointerOut`, `onPointerMove` work on meshes. Call `e.stopPropagation()` to stop hits passing through to objects behind.

## 4. Drei: the shortcuts to reach for first

| Need | Drei component |
|---|---|
| Realistic lighting and reflections | `<Environment preset="city" />` (also studio, sunset, dawn, night, warehouse, forest, apartment, park, lobby) (presets download HDRs from a CDN; for production self-host with `files="/hdr/x.hdr"`), or build a studio from `<Lightformer>` children with no download at all |
| Product-shot setup in one line | `<Stage environment="city" intensity={0.5}>` |
| Soft ground shadows | `<ContactShadows>`, `<AccumulativeShadows>` + `<RandomizedLight>` |
| Glass, crystal, liquid | `<MeshTransmissionMaterial transmission={1} thickness={0.5} roughness={0} ior={1.5} chromaticAberration={0.05} anisotropicBlur={0.1} backside />` |
| Wobbly / distorted blobs | `<MeshDistortMaterial>`, `<MeshWobbleMaterial>` |
| Mirror floor | `<MeshReflectorMaterial>` |
| Load 3D models | `useGLTF('/model.glb')` (+ `useGLTF.preload`), `useTexture`, `useFBX`, `useKTX2` |
| Camera controls | `<OrbitControls>`, `<CameraControls>`, `<PresentationControls>` (product spin), `<KeyboardControls>` |
| Scroll-driven 3D | `<ScrollControls pages={3} damping={0.2}>` + `useScroll()` (`offset`, `range()`, `curve()`, `visible()`) + `<Scroll html>` for DOM sections |
| HTML labels in 3D | `<Html transform occlude>` |
| 3D text | `<Text font="/fonts/Inter.woff">` (SDF, fast; without `font` it fetches a default from a CDN and suspends forever if that fails), `<Text3D font="/font.json">` (extruded) |
| Idle motion | `<Float speed={2} rotationIntensity={1}>`, `<Sparkles>`, `<Stars>`, `<Cloud>` |
| Center and fit | `<Center>`, `<Bounds fit clip observe>` |
| Loading bar | `useProgress()` or `<Loader />` |
| Performance | `<AdaptiveDpr>`, `<PerformanceMonitor>`, `<Bvh>`, `<Preload all />`, `<BakeShadows />`, `<Detailed>` (LOD) |
| Gizmos for editing | `<TransformControls>`, `<PivotControls>`, `<GizmoHelper>` |

Convert a `.glb` into a typed React component with `npx gltfjsx model.glb --transform --types` (compresses with Draco and resizes textures). Then edit materials and add animation in JSX.

## 5. Postprocessing (cinematic look)

```tsx
import { EffectComposer, Bloom, DepthOfField, Vignette, Noise, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

<EffectComposer multisampling={4}>
  <Bloom mipmapBlur luminanceThreshold={1} intensity={1.2} />
  <DepthOfField focusDistance={4} focusRange={2} bokehScale={3} />
  <Noise opacity={0.03} />
  <Vignette offset={0.3} darkness={0.7} />
  <ToneMapping mode={ToneMappingMode.AGX} />
</EffectComposer>
```

- Place `<EffectComposer>` inside `<Canvas>`, after the scene.
- Selective glow: set `luminanceThreshold={1}` and give glowing materials `toneMapped={false}` with colors above 1, e.g. `<meshStandardMaterial emissive="orange" emissiveIntensity={4} toneMapped={false} />`.
- `DepthOfField` focus values are in world units (focusDistance, focusRange). Use `<Autofocus>` to follow the pointer or a target.
- Other effects: `ChromaticAberration`, `SSAO` (needs `enableNormalPass`), `GodRays`, `LensFlare`, `Glitch`, `Pixelation`, `Outline` + `<Selection>`, `TiltShift2`, `HueSaturation`, `BrightnessContrast`, `LUT`, `SMAA`, `FXAA`.
- Effects cost GPU time; keep to 3 to 5 and lower `resolutionScale` on mobile.

## 6. Physics (React Three Rapier)

```tsx
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'

<Suspense>
  <Physics gravity={[0, -9.81, 0]} debug={false}>
    <RigidBody colliders="hull" restitution={0.6} position={[0, 5, 0]}>
      <mesh castShadow><icosahedronGeometry /><meshStandardMaterial /></mesh>
    </RigidBody>
    <RigidBody type="fixed">
      <CuboidCollider args={[20, 0.5, 20]} position={[0, -1, 0]} />
    </RigidBody>
  </Physics>
</Suspense>
```

- `<Physics>` loads WASM lazily, so it must sit inside `<Suspense>`.
- Body `type`: `"dynamic"` (default), `"fixed"` (floors, walls), `"kinematicPosition"` / `"kinematicVelocity"` (moved by code, pushes others).
- Auto colliders: `colliders="cuboid" | "ball" | "hull" | "trimesh" | false`. Prefer `cuboid`/`ball`/`hull`; `trimesh` only for static bodies.
- Manual colliders: `CuboidCollider`, `BallCollider`, `CapsuleCollider`, `CylinderCollider`, `ConvexHullCollider`, `MeshCollider`.
- Forces through a ref: `ref.current.applyImpulse({x,y,z}, true)`, `addForce`, `applyTorqueImpulse`, `setLinvel`, `setTranslation`, `setNextKinematicTranslation`.
- Events: `onCollisionEnter`, `onCollisionExit`, `onContactForce`; trigger zones with `sensor` + `onIntersectionEnter`.
- Joints: `useFixedJoint`, `useSphericalJoint`, `useRevoluteJoint`, `usePrismaticJoint`, `useRopeJoint`, `useSpringJoint`.
- Many bodies: `<InstancedRigidBodies instances={...}>`.
- Turn on `debug` while building to see colliders.

## 7. Plain Three.js essentials (when not using React)

- Core objects: `Scene`, `PerspectiveCamera`, `WebGLRenderer({ antialias: true })`, `Mesh(geometry, material)`, `renderer.setAnimationLoop(fn)`.
- Set `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` and handle `resize` (update `camera.aspect`, `camera.updateProjectionMatrix()`, `renderer.setSize`).
- Realistic materials: `MeshStandardMaterial` / `MeshPhysicalMaterial` (`transmission`, `thickness`, `ior`, `clearcoat`, `iridescence`, `sheen`). Light them with an HDRI via `HDRLoader` (RGBELoader is deprecated since r180) + `PMREMGenerator` or `RoomEnvironment`.
- Load models with `GLTFLoader` (+ `DRACOLoader`, `KTX2Loader`); play clips with `AnimationMixer`.
- Addons live under `three/addons/...` (controls, loaders, postprocessing).
- `WebGPURenderer` and TSL node materials exist in `three/webgpu`; use them only when asked, WebGL is still the safe default.
- Dispose of geometries, materials and textures you remove (`.dispose()`).

## 8. Design guidance for "wow" 3D sites

- One hero object, one strong light setup (HDRI + 1 key light), soft contact shadow, dark or gradient background.
- Glass objects need something colorful behind them to refract; add text, gradients or emissive shapes behind.
- Motion: slow idle float, pointer-follow tilt with damping, scroll-linked camera moves. Avoid fast constant spinning.
- Keep text in the DOM over the canvas for SEO and accessibility; use the canvas for visuals.
- Respect `prefers-reduced-motion`; provide a static poster image fallback.
- Mobile budget: under ~100k triangles, textures 1k to 2k, DPR capped at 2, fewer post effects.

## 9. Workflow

1. Clarify the brief: hero vs full experience, brand colors, model source (provided `.glb`, Blender, generated, or primitives).
2. Scaffold with Vite, install the stack, get a lit scene rendering first.
3. Add the hero object and materials, then motion, then post effects, then physics if needed.
4. Run `npm run build` to type-check, and test in a browser at desktop and phone sizes.
5. Check performance (`<Perf>` from `r3f-perf` or Drei `<Stats>`) before shipping.

Related skills: `theatre-js-animation` for keyframed cinematic camera paths, `blender-mcp` for modelling assets in Blender and exporting `.glb`.
