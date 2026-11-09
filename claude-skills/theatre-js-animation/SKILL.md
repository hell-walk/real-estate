---
name: theatre-js-animation
description: Create keyframed, cinematic web animations and camera moves with Theatre.js, including scroll-driven 3D sequences for Three.js and React Three Fiber sites.
---

# Cinematic animation with Theatre.js

Use this skill when asked for keyframe animation on the web, cinematic camera fly-throughs, choreographed 3D sequences, scroll-scrubbed storytelling, or a visual timeline editor for tweaking animations in the browser.

Source repo: github.com/theatre-js/theatre ("Motion Design, for the web").

## Status check (read first)

- Latest npm release is **0.7.2** (May 2024). The public repo has been quiet since the team moved 1.0 work to a private repo. It works fine but is not actively updated.
- `@theatre/core` and `@theatre/studio` are framework-agnostic and work with any React or Three.js version.
- `@theatre/r3f` declares a peer dependency on **React Three Fiber 8** (React 18). On R3F 9 / React 19 projects it needs `--legacy-peer-deps` and may break. For R3F 9, prefer **Pattern B** below (core + `useFrame`), which has no R3F dependency.
- Always confirm with `npm view @theatre/r3f version peerDependencies` before choosing.

## Core concepts

- **Project**: `getProject('My Site', { state })` holds all animation data.
- **Sheet**: `project.sheet('Scene')` is one timeline (a scene or a section).
- **Object**: `sheet.object('Camera', { ...props })` is a set of animatable values.
- **Prop types**: `types.number(0, { range: [-10, 10] })`, `types.compound({ x, y, z })`, `types.rgba({ r, g, b, a })`, `types.boolean`, `types.string`, `types.stringLiteral('a', { a: 'A', b: 'B' })`.
- **Sequence**: `sheet.sequence.play({ iterationCount: Infinity, range: [0, 6], rate: 1, direction: 'alternate' })`, `.pause()`, `.position = seconds`.
- **Studio**: `@theatre/studio` is the visual editor (timeline, keyframes, curves). Load it only in development.
- **State JSON**: animations made in Studio are exported (Studio > project > Export) to a JSON file and passed back with `getProject('My Site', { state })` in production.

## Install

```bash
npm i @theatre/core
npm i -D @theatre/studio
# only for R3F 8 / React 18 projects:
npm i @theatre/r3f
```

## Pattern A: @theatre/r3f (React 18 + R3F 8 projects)

```tsx
import { getProject } from '@theatre/core'
import { editable as e, SheetProvider, PerspectiveCamera } from '@theatre/r3f'
import studio from '@theatre/studio'
import extension from '@theatre/r3f/dist/extension'
import state from './state.json'

if (import.meta.env.DEV) {
  studio.extend(extension)
  studio.initialize()
}

const sheet = getProject('Hero', { state }).sheet('Scene')

export function Scene() {
  useEffect(() => {
    sheet.project.ready.then(() => sheet.sequence.play({ iterationCount: Infinity, range: [0, 6] }))
  }, [])
  return (
    <Canvas>
      <SheetProvider sheet={sheet}>
        <PerspectiveCamera theatreKey="Camera" makeDefault position={[5, 5, -5]} fov={75} />
        <e.mesh theatreKey="Cube"><boxGeometry /><meshStandardMaterial /></e.mesh>
        <e.pointLight theatreKey="Light" position={[10, 10, 10]} />
      </SheetProvider>
    </Canvas>
  )
}
```

Editable types: `group`, `mesh`, `spotLight`, `directionalLight`, `pointLight`, `perspectiveCamera`, `orthographicCamera`. Wrap custom components with `editable(Component, 'mesh')`. Every editable needs a unique `theatreKey`.

## Pattern B: @theatre/core with R3F 9 or plain Three.js (recommended for new projects)

```tsx
import { getProject, types } from '@theatre/core'
import state from './state.json'

// In production `state` is required: without it (and without Studio loaded) getProject throws
// "config.state is empty" and every value stays at its default. During development, while
// Studio is running, you can leave it out until you export.
const project = getProject('Hero', { state })
const sheet = project.sheet('Scene')

const camObj = sheet.object('Camera', {
  position: types.compound({
    x: types.number(5, { range: [-20, 20] }),
    y: types.number(2, { range: [-20, 20] }),
    z: types.number(8, { range: [-20, 20] }),
  }),
  fov: types.number(45, { range: [10, 120] }),
})

function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  useEffect(() => camObj.onValuesChange((v) => {
    camera.position.set(v.position.x, v.position.y, v.position.z)
    camera.fov = v.fov
    camera.updateProjectionMatrix()
    camera.lookAt(0, 0, 0)
  }), [camera])
  return null
}
```

`onValuesChange` returns an unsubscribe function, so returning it from `useEffect` cleans up. For plain Three.js, do the same without React.

Load the editor only in development, with a dynamic import so it never ships to production:

```ts
if (import.meta.env.DEV) {
  import('@theatre/studio').then(({ default: studio }) => studio.initialize())
}
```

## Scroll-driven sequences

Map scroll progress to sequence position instead of calling `play()`:

```tsx
import { val } from '@theatre/core'
import { useScroll } from '@react-three/drei'

function ScrollSync() {
  const scroll = useScroll()
  useFrame(() => {
    const length = val(sheet.sequence.pointer.length)
    sheet.sequence.position = scroll.offset * length
  })
  return null
}
// <ScrollControls pages={5} damping={0.2}><ScrollSync />...</ScrollControls>
```

Without Drei, compute `window.scrollY / (document.body.scrollHeight - innerHeight)` and set the position the same way.

## Workflow

1. Build the scene and decide which things move (camera, hero object, lights, material colors).
2. Expose them as Theatre objects (editable components or `sheet.object`).
3. Run the dev server; Studio appears as an overlay. Scrub the timeline, set keyframes (click the diamond next to a prop), shape easing in the curve editor.
4. Export the project state to `src/state.json` and pass it to `getProject`.
5. In production, play on load, on click, or tie the sequence position to scroll.
6. Before shipping, confirm Studio is not in the production bundle and that `project.ready` resolves before `play()`.

## Tips for a cinematic feel

- Animate the camera, not just the object; slow dolly + slight orbit reads as "film".
- Use ease-in-out curves, avoid linear for camera moves.
- Keep sequences short (4 to 8 s) and loop with `direction: 'alternate'` for idle hero shots.
- Pair with depth of field and bloom from `@react-three/postprocessing` (see the `web-3d-r3f` skill).
- Theatre can also animate DOM/CSS or any JS value: subscribe with `onValuesChange` and write the values wherever needed.
