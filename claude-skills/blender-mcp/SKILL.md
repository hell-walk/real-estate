---
name: blender-mcp
description: Set up and use MCP for Blender (formerly blender-mcp) so Claude can model, texture, light and render scenes in Blender, and export assets as glb for 3D websites.
---

# Claude controlling Blender (MCP for Blender)

Use this skill when asked to set up Blender MCP, to create or edit 3D models or scenes in Blender with Claude, to pull free assets (Poly Haven, Sketchfab, Poly Pizza), to generate 3D models with AI, or to make `.glb` assets for a Three.js / React Three Fiber website.

Source repo: github.com/ahujasid/blender-mcp (now published on PyPI as **`mcp-for-blender`**, v2.2.x as of Nov 2026; `uvx blender-mcp` still works for older setups). Third party, not made by the Blender Foundation.

## How it works

Two parts talk over a local TCP socket (default `localhost:9876`):

1. **Blender addon** runs a socket server inside Blender.
2. **MCP server** (`uvx mcp-for-blender`) is launched by the AI app and forwards tool calls to Blender.

Requirements: Blender 3.0+, Python 3.10+, `uv`.

## Setup

One command (installs uv, configures detected AI apps, installs and enables the addon):

```powershell
# Windows PowerShell
irm https://www.mcp-for-blender.com/install.ps1 | iex
# or, if uv is already installed
uvx mcp-for-blender setup
```

```bash
# macOS / Linux
curl -LsSf https://www.mcp-for-blender.com/install.sh | sh
```

Manual setup:

1. Install uv: `winget install --id=astral-sh.uv -e` (Windows) or `brew install uv` (macOS). Use the official installer, not `pip install uv`.
2. Add the server to the Claude desktop app (Settings > Developer > Edit Config):
   ```json
   { "mcpServers": { "blender": { "command": "uvx", "args": ["mcp-for-blender"] } } }
   ```
   Claude Code: `claude mcp add blender uvx mcp-for-blender`
3. Install the addon: `uvx mcp-for-blender install-addon`, then in Blender: Edit > Preferences > Add-ons > enable **Interface: MCP for Blender**.
4. Fully quit and reopen the Claude app (on Windows, quit from the system tray).
5. Open Blender, press `N` in the 3D viewport, open the **MCP for Blender** tab, tick the asset sources wanted, and click **Connect / Start MCP Server**.

Do not run `uvx mcp-for-blender` yourself in a terminal; the AI app launches it. Run only one MCP client against Blender at a time.

In Cowork, local MCP servers configured in the Claude desktop app are reachable through the linked computer, so the Blender tools appear when the desktop app is open and Blender is running.

## Tools

| Tool | Use |
|---|---|
| `get_scene_info` | Compact scene summary; call first to see what exists |
| `execute_blender_code` | Run Blender Python (`bpy`) in the live session; this is how modelling, materials, lighting, animation and export happen |
| `look` | Check the result: `viewport`, `camera`, `angles` (multi-view sheet) or `frames`, shaded `solid`, `material`, `rendered`, `wireframe` or `xray`; can also show a render or image file |
| `search_assets` / `import_asset` | Poly Haven (CC0 HDRIs, textures, models, no key), Sketchfab (key), Poly Pizza (low-poly, key) |
| `generate_3d` | Text or image to 3D via Tripo, Meshy, Hyper3D Rodin or Hunyuan3D (own API key or paid Premium) |
| `get_addon_status` | Blender and addon version, which sources are enabled |
| `disable_telemetry` | Turn off data collection if the user asks |

## Working method

1. Ask the user to save their `.blend` first: `execute_blender_code` runs arbitrary Python and can't be undone reliably.
2. `get_scene_info` to understand the scene.
3. Make changes in **small steps** (one object or one material per call). Big scripts time out.
4. After each step, `look` (use `angles` for geometry, `camera` + `rendered` for final look) and fix what is wrong before moving on.
5. Use real-world scale (1 unit = 1 m), apply transforms before export, name objects clearly.

Useful `bpy` snippets:

```python
import bpy
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(0, 0, 1))
obj = bpy.context.active_object
obj.name = "HeroSphere"
bpy.ops.object.shade_smooth()

mat = bpy.data.materials.new("Glass")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.9, 0.95, 1, 1)
bsdf.inputs["Roughness"].default_value = 0.05
bsdf.inputs["Transmission Weight"].default_value = 1.0  # Blender 4.x name; 3.x uses "Transmission"
bsdf.inputs["IOR"].default_value = 1.45
obj.data.materials.append(mat)
```

## Export for the web (Blender to Three.js / R3F)

```python
import bpy
bpy.ops.export_scene.gltf(
    filepath="C:/path/to/site/public/model.glb",
    export_format='GLB',
    use_selection=False,
    export_apply=True,       # apply modifiers
    export_draco_mesh_compression_enable=True,
    export_animations=True,
)
```

- Bake complex procedural materials to image textures; glTF only carries Principled BSDF maps.
- Keep web assets light: under ~100k triangles, 1k to 2k textures.
- Then run `npx gltfjsx model.glb --transform --types` and load it in R3F with `useGLTF` (see the `web-3d-r3f` skill).

## Assets and licences

- Poly Haven: everything CC0, no credit needed. Ask for 1k or 2k resolution; large downloads freeze Blender's UI until done.
- Poly Pizza: about two thirds is CC-BY and needs credit; filter with `licence="CC0"` if credit is a problem. Credit is saved on the object as `polypizza_attribution`.
- Sketchfab: check each model's licence before commercial use.
- AI generators (Meshy, Tripo, Rodin, Hunyuan3D) need the user's own API key or the paid Premium plan.

## Troubleshooting

| Problem | Fix |
|---|---|
| Tools not showing | Fully quit and reopen the Claude app; check the config JSON is valid |
| Connection refused | Blender closed, addon disabled, or server not started in the N panel; restart Blender and the AI app |
| First command fails | Retry once; the first call sometimes drops |
| Timeouts | Break the request into smaller steps |
| Remote / WSL / Docker | Set Bind Address and Allow Remote Connections in addon prefs, and `BLENDER_HOST` / `BLENDER_PORT` env vars on the client. No auth or encryption, so only on a trusted network |
