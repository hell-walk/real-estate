# Renders the picture the home stage shows while the model loads (and where WebGL is missing): the same view the stage
# opens on, an orthographic isometric view of the plot on a dark slab at dusk, from the south-east.
#   blender -b blender/ratan-galaxy.blend -P blender/render_overview.py
# then: python blender/make_overview.py   (lays it over the backdrop and writes assets/hero-fallback.jpg)
import bpy, os, math
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
exec(open(os.path.join(ROOT, 'blender', 'build_site.py'), encoding='utf-8').read())
build('all')

W, H = 1600, 900
sc = bpy.context.scene
for o in bpy.data.collections['Surroundings'].objects:   # the model stands alone on its slab
    if o.type != 'CAMERA':
        o.hide_render = True
slab = Builder('slab', material('slab_dark', '#211d19', 1.0), 'Site')
slab.box((0, 0, -2.98), (246, 76, 6))
slab.build()
for name, colour in (('paving', '#3c3d42'), ('parking', '#45464a'), ('footpath', '#4a4a4c')):   # the ground goes dark with the light
    bsdf_of(bpy.data.materials[name]).inputs['Base Color'].default_value = lin(colour)
for name, strength in (('glass', 3.0), ('lamp_glow', 6.0)):
    bsdf_of(bpy.data.materials[name]).inputs['Emission Strength'].default_value = strength
water = bsdf_of(bpy.data.materials['water'])
water.inputs['Emission Color'].default_value = lin('#1f9fc0'); water.inputs['Emission Strength'].default_value = 0.8

# the stage's camera: the true isometric angle, bearing 45 degrees east of south, the slab and the towers in frame
el, az = math.atan(math.sqrt(0.5)), math.pi / 4
d3 = Vector((math.cos(el) * math.sin(az), math.sin(el), math.cos(el) * math.cos(az)))   # three.js axes: x east, y up, z south
direction = Vector((d3.x, -d3.z, d3.y))
centre = Vector((0, 0, 15))
cam = bpy.data.objects['Camera']
cam.data.type = 'ORTHO'
cam.location = centre + direction * 600
cam.rotation_euler = (centre - cam.location).to_track_quat('-Z', 'Y').to_euler()
cam.data.clip_start = 1; cam.data.clip_end = 1600
bpy.context.view_layer.update()
inv = cam.matrix_world.inverted()
hw = hh = 0.0
for x in (-123, 123):
    for y in (-38, 38):
        for z in (-6, 36):
            v = inv @ Vector((x, y, z))
            hw, hh = max(hw, abs(v.x)), max(hh, abs(v.y))
aspect = W / H
height = max(hh * 2, hw * 2 / aspect) * 0.96
cam.data.sensor_fit = 'HORIZONTAL'
cam.data.ortho_scale = height * aspect
cam.data.shift_x = 0.0
cam.data.shift_y = -(height * 0.07) / (height * aspect)   # the model sits a little high, clear of the card and the button
sc.camera = cam

set_world(os.path.join(ROOT, 'blender', 'hdri', 'dusk.hdr'), 0.9, math.radians(150))
try:
    sc.render.engine = 'CYCLES'
except TypeError as e:
    print(e)
cy = sc.cycles
cy.samples = 64; cy.use_adaptive_sampling = True; cy.use_denoising = True; cy.device = 'GPU'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for backend in ('CUDA', 'HIP', 'ONEAPI', 'METAL'):
        try:
            prefs.compute_device_type = backend; prefs.get_devices()
            if any(dv.use for dv in prefs.devices if dv.type != 'CPU'):
                break
        except Exception:
            continue
    else:
        cy.device = 'CPU'
except Exception:
    cy.device = 'CPU'
sc.render.film_transparent = True
sc.render.resolution_x = W; sc.render.resolution_y = H; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'; sc.render.image_settings.color_depth = '8'
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = 0.2
sc.render.filepath = os.path.join(ROOT, 'blender', 'renders', 'overview.png')
bpy.ops.render.render(write_still=True)
print('rendered', sc.render.filepath)
