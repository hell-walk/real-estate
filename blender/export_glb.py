# Rebuilds the site model from build_site.py and exports assets/models/ratan-galaxy.glb (Draco, transforms applied,
# the "Site" collection only). Headless:
#   blender -b -P blender/export_glb.py
# or, in a Blender that has ratan-galaxy.blend open: exec(open(r"...\blender\export_glb.py").read())
import bpy, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) if '__file__' in globals() else r"C:\Users\ASUS\Desktop\real-estate-landing"
exec(open(os.path.join(ROOT, 'blender', 'build_site.py'), encoding='utf-8').read())
if not bpy.data.collections.get('Site'):
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
build('all')
for name, strength in (('glass', 1.0), ('lamp_glow', 1.0)):   # the page drives these with the time of day
    bsdf_of(bpy.data.materials[name]).inputs['Emission Strength'].default_value = strength
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.collections['Site'].objects:
    o.select_set(True)
out = os.path.join(ROOT, 'assets', 'models', 'ratan-galaxy.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6,
                          export_attributes=True, export_extras=True, export_yup=True, export_animations=False,
                          export_lights=False, export_cameras=False, export_vertex_color='MATERIAL')
for name in ('glass', 'lamp_glow'):
    bsdf_of(bpy.data.materials[name]).inputs['Emission Strength'].default_value = 0.0
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.data.collections['Site'].objects if o.type == 'MESH')
print('exported', out, os.path.getsize(out), 'bytes,', tris, 'triangles')
