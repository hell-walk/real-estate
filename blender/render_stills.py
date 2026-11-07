# Renders the day and the dusk still of the site model with Cycles under a Poly Haven sky (CC0), from the saved
# ratan-galaxy.blend, in a background Blender:
#   blender -b blender/ratan-galaxy.blend -P blender/render_stills.py -- day dusk
# The stills land in blender/renders/<pass>.png; make_stills.py turns them into the site's JPG renditions.
import bpy, sys, os, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
passes = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else ['day', 'dusk']
exec(open(os.path.join(ROOT, 'blender', 'build_site.py'), encoding='utf-8').read())

LOOKS = {
    # sky file, its strength, its rotation about z, the glow of the windows and of the lamps
    'day': dict(hdr='day.hdr', strength=1.0, rot=math.radians(205), glass=0.0, lamps=0.0, exposure=0.3),
    'dusk': dict(hdr='dusk.hdr', strength=1.3, rot=math.radians(150), glass=2.4, lamps=3.4, exposure=0.6),
}

sc = bpy.context.scene
try:
    sc.render.engine = 'CYCLES'
except TypeError as e:
    print(e)
cy = sc.cycles
cy.samples = 64
cy.use_adaptive_sampling = True
cy.use_denoising = True
cy.device = 'GPU'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for backend in ('CUDA', 'HIP', 'ONEAPI', 'METAL'):   # not OptiX: its kernel failed to load on this machine
        try:
            prefs.compute_device_type = backend
            prefs.get_devices()
            if any(d.use for d in prefs.devices if d.type != 'CPU'):
                print('GPU backend', backend); break
        except Exception:
            continue
    else:
        cy.device = 'CPU'; print('CPU render')
except Exception as e:
    cy.device = 'CPU'; print('CPU render', e)
sc.render.resolution_x = 2800
sc.render.resolution_y = 1575
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_depth = '8'
sc.view_settings.view_transform = 'AgX'
sc.view_settings.look = 'AgX - Medium High Contrast'

for name in passes:
    L = LOOKS[name]
    set_world(os.path.join(ROOT, 'blender', 'hdri', L['hdr']), L['strength'], L['rot'])
    for mat, s in (('glass', L['glass']), ('lamp_glow', L['lamps'])):
        m = bpy.data.materials[mat]
        bsdf_of(m).inputs['Emission Strength'].default_value = s
    sc.view_settings.exposure = L['exposure']
    out = os.path.join(ROOT, 'blender', 'renders', name + '.png')
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('rendered', out)
