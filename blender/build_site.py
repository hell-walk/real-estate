# Builds the Ratan Galaxy site model in Blender, step by step, from the same plan the home page's procedural model
# (src/js/hero3d.js) uses: the long plot off the south road, Block C (an X tower) at the west end, Block B (the H block)
# in the middle, Block A (the X tower with the shops) at the east end, the pool and the club at the east end, the courts
# at both ends, the gate on the south road. 1 unit = 1 m. Blender x is the site's east, Blender y is north (the home
# page's three.js z is south, so y = -z), Blender z is up. The glTF exporter turns that back into three.js's y-up frame.
#
# Run from the MCP for Blender session or from a Blender console:
#   exec(open(r"C:\...\blender\build_site.py").read()); build("materials"); build("ground"); ...
# or build("all"). Each step is quick (pure bmesh work), so the MCP connection never times out.
#
# Every mesh is flat shaded, Principled BSDF only, and the parts that the website must address by name are named:
# A_flats, B_flats, C_flats carry one box per home with a "_flat" float attribute (the index into the "flats" JSON
# custom property on the object: block, floor, flat number) and a colour attribute, so the page can pick a home with a
# raycast and recolour it; "glass", "water" and "lamp_glow" are the materials the page drives with the time of day; the
# gate's parts are named gate_*. The "Surroundings" collection (the country, the roads outside the wall, the
# neighbourhood) is for the renders only and is not exported.
import bpy, bmesh, math, json, random
from mathutils import Vector, Matrix

FH = 3.0       # one floor, metres
STILT = 3.2    # the stilt parking floor
FLOORS = 9     # homes on floors 1 to 9
BLOCK_POS = {'C': (-78, 2), 'B': (-19, 1), 'A': (40, 2)}   # three.js (x, z)
BLOCK_SHAPE = {'C': 'x', 'B': 'h', 'A': 'x'}
BLOCK_GROUND = {'C': 'lobby', 'B': 'lobby', 'A': 'shops'}

_seed = [11]
def rnd():
    _seed[0] = (_seed[0] * 16807) % 2147483647
    return _seed[0] / 2147483647

def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lin(hexstr):
    h = hexstr.lstrip('#')
    return tuple(srgb_to_lin(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)) + (1.0,)

def collection(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c

def bsdf_of(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')

def material(name, color=None, rough=0.9, metal=0.0, emit=None, emit_strength=1.0, vertex_color=False, alpha=None):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = bsdf_of(m)
    if vertex_color:
        attr = m.node_tree.nodes.new('ShaderNodeVertexColor')
        attr.layer_name = 'Col'
        m.node_tree.links.new(attr.outputs['Color'], b.inputs['Base Color'])
    elif color:
        b.inputs['Base Color'].default_value = lin(color)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = lin(emit)
        b.inputs['Emission Strength'].default_value = emit_strength
    if alpha is not None:
        b.inputs['Alpha'].default_value = alpha
        for attr, val in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    return m

# ---------- a mesh builder: boxes, cylinders, planes and icospheres into one bmesh, then one flat-shaded object ----------
class Builder:
    def __init__(self, name, mat, coll='Site', flat_ids=False, colors=False):
        self.name, self.mat, self.coll = name, mat, coll
        self.bm = bmesh.new()
        self.flat_layer = self.bm.verts.layers.float.new('_flat') if flat_ids else None
        self.col_layer = self.bm.verts.layers.float_color.new('Col') if colors else None
        self.count = 0

    def _tag(self, verts, flat=-1, color=None):
        for v in verts:
            if self.flat_layer is not None:
                v[self.flat_layer] = float(flat)
            if self.col_layer is not None and color is not None:
                v[self.col_layer] = color
        self.count += 1

    def box(self, center, size, rot_z=0.0, flat=-1, color=None, rot_y=0.0, rot_x=0.0):
        m = Matrix.Translation(Vector(center)) @ Matrix.Rotation(rot_z, 4, 'Z') @ Matrix.Rotation(rot_y, 4, 'Y') @ Matrix.Rotation(rot_x, 4, 'X') @ Matrix.Diagonal(Vector(size).to_4d())
        r = bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)
        self._tag(r['verts'], flat, color)

    def cyl(self, center, radius, height, segs=12, radius_top=None, caps=True, flat=-1, color=None, scale_y=1.0, rot_x=0.0, rot_z=0.0):
        rt = radius if radius_top is None else radius_top
        m = Matrix.Translation(Vector(center)) @ Matrix.Rotation(rot_z, 4, 'Z') @ Matrix.Rotation(rot_x, 4, 'X') @ Matrix.Diagonal(Vector((1, scale_y, 1)).to_4d())
        r = bmesh.ops.create_cone(self.bm, cap_ends=caps, cap_tris=False, segments=segs, radius1=radius, radius2=rt, depth=height, matrix=m)
        self._tag(r['verts'], flat, color)

    def plane(self, center, w, h, rot_x=0.0, rot_y=0.0, rot_z=0.0, flat=-1, color=None):
        m = Matrix.Translation(Vector(center)) @ Matrix.Rotation(rot_z, 4, 'Z') @ Matrix.Rotation(rot_y, 4, 'Y') @ Matrix.Rotation(rot_x, 4, 'X') @ Matrix.Diagonal(Vector((w, h, 1)).to_4d())
        r = bmesh.ops.create_grid(self.bm, x_segments=1, y_segments=1, size=0.5, matrix=m)
        self._tag(r['verts'], flat, color)

    def ico(self, center, radius, jitter=0.0, scale=(1, 1, 1), color=None, subdiv=1):
        m = Matrix.Translation(Vector(center)) @ Matrix.Diagonal(Vector(scale).to_4d())
        r = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=radius, matrix=m)
        if jitter:
            c = Vector(center)
            for v in r['verts']:
                v.co = c + (v.co - c) * (1 - jitter / 2 + rnd() * jitter)
        self._tag(r['verts'], -1, color)

    def build(self, extras=None):
        old = bpy.data.objects.get(self.name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        me.materials.append(self.mat)
        for p in me.polygons:
            p.use_smooth = False
        ob = bpy.data.objects.new(self.name, me)
        collection(self.coll).objects.link(ob)
        if extras:
            for k, v in extras.items():
                ob[k] = v
        return ob

# three.js helpers: a point (x, y up, z south) and an axis-aligned box in three.js terms
def P(x, y, z):
    return (x, -z, y)

def fbox(b, x, z, w, d, y0, h, rot=0.0, **kw):   # centre (x, z), width w east-west, depth d north-south, from y0 up h
    b.box((x, -z, y0 + h / 2), (w, d, h), rot_z=rot, **kw)

def place(cx, cz, rot, lx, ly, lz):   # a point in a flat's own frame (three.js: x along the flat, y up, z across it)
    c, s = math.cos(rot), math.sin(rot)
    bx, by = lx, -lz
    return (cx + bx * c - by * s, -cz + bx * s + by * c, ly)

# ---------- where the fourteen homes of a floor sit, in a block's own coordinates (the same rule as hero3d.js) ----------
def floor_layout(shape):
    flats = []
    if shape == 'x':
        wings = [(1, -1), (1, 1), (-1, 1), (-1, -1)]   # NE, SE, SW, NW in three.js (x east, z south)
        n = 1
        for w, (dx, dz) in enumerate(wings):
            l = math.hypot(dx, dz); dx /= l; dz /= l
            px, pz = -dz, dx
            for seg in (1, 0):
                for side in (-1, 1):
                    lobby = seg == 0 and side == 1 and w in (1, 3)
                    r = 9 + seg * 12 + 6
                    flats.append(dict(n=0 if lobby else n, lobby=lobby, cx=dx * r + px * side * 3.5, cz=dz * r + pz * side * 3.5, rot=math.atan2(-dz, dx), len=12, wid=7, side=side, tip=seg == 1, tipDir=1, wing=w))
                    if not lobby:
                        n += 1
    else:
        n = 1
        for bar in (-1, 1):
            for seg in range(3):
                for side in (-1, 1):
                    flats.append(dict(n=n, lobby=False, cx=bar * 12 + side * 3, cz=(seg - 1) * 16.67, rot=math.pi / 2, len=16.67, wid=6, side=side, tip=seg != 1, tipDir=-1 if seg == 2 else 1, wing=-1))
                    n += 1
                    if seg == 1 and side == 1 and bar == -1:
                        flats.append(dict(n=n, lobby=False, cx=0, cz=-10.5, rot=0, len=12, wid=7, side=-1, tip=False, tipDir=1, wing=-1)); n += 1
                        flats.append(dict(n=n, lobby=False, cx=0, cz=10.5, rot=0, len=12, wid=7, side=1, tip=False, tipDir=1, wing=-1)); n += 1
    return flats

# ---------- steps ----------
def step_materials():
    material('walls', vertex_color=True, rough=0.92)
    material('slab', '#e8e5de', 0.9)
    material('blue', '#56657a', 0.9)
    material('balcony', '#5c6b7e', 0.95)
    material('rail', '#1c1a19', 0.6, 0.4, alpha=0.72)
    material('glass', '#5c7082', 0.15, 0.6, emit='#ffb860', emit_strength=0.0)
    material('glass_dark', '#2c3644', 0.15, 0.6)   # the windows with nobody home: they stay dark when the others light up
    material('ac', '#d9d9d6', 0.7, 0.2)
    material('column', '#b9b3a9', 0.95)
    material('shops', '#7f94a6', 0.9)
    material('plinth', '#8f877e', 1.0)
    material('plaster', '#f4efe6', 0.9)
    material('white', '#f3f0ea', 0.9)
    material('board', '#1b1613', 0.6)
    material('gold', '#c9a45a', 0.4, 0.6)
    material('lawn', '#6f9a45', 1.0)
    material('garden', '#789f4e', 1.0)
    material('country', '#8aa557', 1.0)
    material('asphalt', '#4b494b', 1.0)
    material('paving', '#908b85', 1.0)
    material('deck', '#dad1c0', 1.0)
    material('kerb', '#8a8580', 1.0)
    material('footpath', '#b9b3a9', 1.0)
    material('parking', '#a9a5a2', 1.0)
    material('court_green', '#4f8a46', 0.85)
    material('court_orange', '#c0683f', 0.85)
    material('line', '#f1ede5', 0.9)
    material('water', '#3f9bb4', 0.05, 0.5)
    material('sand', '#dcc99b', 1.0)
    material('bench', '#6b4a32', 0.9)
    material('lamp_post', '#3a3a3c', 0.6, 0.5)
    material('lamp_glow', '#fff4dc', 0.4, emit='#ffd27a', emit_strength=0.0)
    material('trunk', '#5a4634', 1.0)
    material('leaf', '#3f7a35', 1.0)
    material('canopy', vertex_color=True, rough=1.0)
    material('hood', vertex_color=True, rough=0.95)
    material('dash', '#d8c35e', 1.0)
    material('tank', '#2b2b2b', 0.8)
    material('club_glass', '#8fb0c8', 0.15, 0.6)
    material('wall', '#d9cdb8', 0.95)
    material('pier', '#c9bca6', 0.95)
    material('car_glass', '#2a3036', 0.1, 0.7)
    material('car', vertex_color=True, rough=0.25, metal=0.6)
    material('dark', '#2f2d2b', 0.7)

def step_ground():
    g = Builder('ground_paving', material('paving')); fbox(g, 0, 0, 239, 69, 0.0, 0.12); g.build()
    b = Builder('lawns', material('lawn'))
    for x, z, w, h in [(-72, -24, 18, 9), (34, -24, 18, 9), (-72, 25, 18, 9), (34, 25, 18, 9), (-50, 2, 10, 20), (8, 2, 10, 20)]:
        fbox(b, x, z, w, h, 0.12, 0.06)
    b.build()
    b = Builder('gardens', material('garden'))
    fbox(b, 95, 2, 46, 60, 0.12, 0.05)     # the garden at the east end
    fbox(b, -110, 0, 20, 56, 0.12, 0.05)   # the strip at the west end
    b.build()
    b = Builder('paths', material('footpath'))
    fbox(b, 0, 34.5, 240, 2.5, 0.12, 0.06)   # the footpath along the inside of the wall
    fbox(b, 70, 0, 2.2, 70, 0.12, 0.06)      # between Block A and the garden
    fbox(b, 92, -4, 1.8, 44, 0.12, 0.07)
    fbox(b, 12, 31, 16, 10, 0.12, 0.08)      # the drive in at the gate
    b.build()
    b = Builder('parking_row', material('parking')); fbox(b, 0, 29.5, 222, 7, 0.12, 0.04); b.build()
    b = Builder('parking_lines', material('line'))
    for i in range(90):
        fbox(b, -110 + i * 2.5, 29.5, 0.12, 5, 0.16, 0.02)
    b.build()
    # courts: a green one and an orange one at the west end, an orange one at the east end
    for name, mat, (x, z, w, h) in [('court_tennis', 'court_green', (-109, -22, 16, 9)), ('court_basket_w', 'court_orange', (-109, 26, 14, 8)), ('court_basket_e', 'court_orange', (110, -20, 16, 9))]:
        b = Builder(name, material(mat)); fbox(b, x, z, w, h, 0.12, 0.08); b.build()
        l = Builder(name + '_lines', material('line'))
        fbox(l, x, z, w - 1, 0.12, 0.2, 0.02); fbox(l, x - w / 2 + 0.5, z, 0.12, h - 1, 0.2, 0.02); fbox(l, x + w / 2 - 0.5, z, 0.12, h - 1, 0.2, 0.02)
        l.build()
    b = Builder('pool_deck', material('deck')); fbox(b, 86, -15, 24, 15, 0.12, 0.08); b.build()
    w = Builder('pool', material('water'))
    w.cyl(P(86, 0.22, -16), 9, 0.06, segs=40, scale_y=5 / 9)
    w.cyl(P(96, 0.22, -8), 3, 0.06, segs=24)
    w.build()
    b = Builder('sand_pit', material('sand')); b.cyl(P(86, 0.19, 3), 6, 0.04, segs=24); b.build()

def step_surroundings():
    b = Builder('country', material('country'), 'Surroundings'); fbox(b, 0, 0, 1600, 1600, -0.1, 0.1); b.build()
    r = Builder('roads', material('asphalt'), 'Surroundings')
    fbox(r, 0, 43, 300, 14, 0.0, 0.04); fbox(r, -129, 0, 14, 160, 0.0, 0.04); fbox(r, 129, 0, 14, 160, 0.0, 0.04)
    r.build()
    d = Builder('road_dashes', material('dash'), 'Surroundings')
    for i in range(50):
        fbox(d, -147 + i * 6, 43, 3, 0.2, 0.04, 0.02)
    d.build()
    f = Builder('road_footpath', material('footpath'), 'Surroundings'); fbox(f, 0, 51.5, 300, 3, 0.0, 0.12); f.build()
    k = Builder('road_kerb', material('kerb'), 'Surroundings'); fbox(k, 0, 50, 300, 0.3, 0.0, 0.14); k.build()
    # the neighbourhood: low blocks across the roads
    h = Builder('neighbourhood', material('hood'), 'Surroundings', colors=True)
    cols = ['#e3d9c6', '#d9cdb6', '#cfc4b4', '#e8e0d0', '#bfb3a3', '#d6c7ad']
    n = guard = 0
    while n < 140 and guard < 4000:
        guard += 1
        x, z = (rnd() - 0.5) * 1000, (rnd() - 0.5) * 800
        w, dd, fl = 10 + rnd() * 14, 10 + rnd() * 14, 1 + int(rnd() * 4)
        if abs(x) < 142 + w and abs(z) < 60 + dd:
            continue
        rot = 0 if rnd() < 0.5 else math.pi / 2
        fbox(h, x, z, w, dd, 0, fl * 3.2, rot=rot, color=lin(cols[n % len(cols)])); n += 1
    h.build()
    # lamps along the road
    posts = Builder('road_lamp_posts', material('lamp_post'), 'Surroundings')
    heads = Builder('road_lamp_heads', material('lamp_glow'), 'Surroundings')
    for x in range(-140, 141, 20):
        posts.cyl(P(x, 3, 50.5), 0.1, 6, segs=6, radius_top=0.07)
        heads.ico(P(x, 6.1, 50.5), 0.32)
    posts.build(); heads.build()

def step_wall_gate():
    w = Builder('boundary_wall', material('wall'))
    pieces = [(240, 0.4, 0, -35), (0.4, 70, -120, 0), (0.4, 70, 120, 0), (124, 0.4, -58, 35), (100, 0.4, 70, 35)]   # the gap from 4 to 20 on the south is the gate
    for pw, pd, x, z in pieces:
        fbox(w, x, z, pw, pd, 0, 2.2)
    w.build()
    g = Builder('wall_grille', material('rail'))
    for pw, pd, x, z in pieces:
        for y in (2.3, 2.6, 2.9):
            fbox(g, x, z, pw if pw > pd else 0.05, pd if pd > pw else 0.05, y, 0.05)
    g.build()
    p = Builder('wall_piers', material('pier'))
    for x in range(-120, 121, 12):
        fbox(p, x, -35, 0.7, 0.7, 0, 2.6)
        if x < 2 or x > 22:
            fbox(p, x, 35, 0.7, 0.7, 0, 2.6)
    for z in range(-23, 24, 12):
        fbox(p, -120, z, 0.7, 0.7, 0, 2.6); fbox(p, 120, z, 0.7, 0.7, 0, 2.6)
    p.build()
    # the gate: two pillars, the beam, the moulded cornice, the dark board with the name, one leaf standing open
    b = Builder('gate_pillars', material('white'))
    for x in (4.5, 19.5):
        fbox(b, x, 35, 1.4, 1.4, 0, 5)
        fbox(b, x, 35, 1.8, 1.8, 0, 0.5)       # a plinth
        fbox(b, x, 35, 1.7, 1.7, 4.6, 0.3)     # a capital
    b.build()
    b = Builder('gate_beam', material('white')); fbox(b, 12, 35, 16.4, 1.4, 5.05, 0.5); b.build()
    b = Builder('gate_cornice', material('white')); fbox(b, 12, 35, 17.6, 2.2, 5.55, 0.3); fbox(b, 12, 35, 18.2, 2.6, 5.85, 0.15); b.build()
    b = Builder('gate_board', material('board')); fbox(b, 12, 35, 11, 0.3, 5.9, 2.4); b.build()
    b = Builder('gate_leaf', material('rail'))
    a = 1.2
    cx, cz = 5.2 + 3.5 * math.cos(a), 35 - 3.5 * math.sin(a)
    for k in range(-3, 4):
        off = k * 1.0
        fbox(b, cx + off * math.cos(a), cz - off * math.sin(a), 0.06, 0.06, 0.1, 2.3, rot=a)
    for y in (0.2, 1.3, 2.3):
        fbox(b, cx, cz, 7, 0.05, y, 0.06, rot=a)
    b.build()
    b = Builder('gatehouse', material('plaster')); fbox(b, 24, 32.5, 5, 3.5, 0, 3.2); b.build()
    b = Builder('gatehouse_roof', material('white')); fbox(b, 24, 32.5, 6, 4.5, 3.2, 0.3); b.build()
    b = Builder('gatehouse_window', material('glass')); b.plane(P(22.6, 1.6, 32.5), 2.2, 1.2, rot_x=math.pi / 2, rot_y=0, rot_z=math.pi / 2); b.build()
    # the name on the board: a text object turned into a mesh, on the south face
    for name in ('gate_name', 'gate_sub'):
        old = bpy.data.objects.get(name)
        if old:
            bpy.data.objects.remove(old, do_unlink=True)
    cu = bpy.data.curves.new('gate_name', 'FONT')
    cu.body = 'RATAN GALAXY'; cu.size = 1.1; cu.extrude = 0.02; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    ob = bpy.data.objects.new('gate_name', cu)
    collection('Site').objects.link(ob)
    ob.location = (12, -35.16, 7.3); ob.rotation_euler = (math.pi / 2, 0, 0)
    ob.data.materials.append(material('gold'))
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob.select_set(False)
    cu2 = bpy.data.curves.new('gate_sub', 'FONT')
    cu2.body = 'VRINDAVAN YOJNA  ·  SECTOR 12'; cu2.size = 0.42; cu2.extrude = 0.015; cu2.align_x = 'CENTER'; cu2.align_y = 'CENTER'
    ob2 = bpy.data.objects.new('gate_sub', cu2)
    collection('Site').objects.link(ob2)
    ob2.location = (12, -35.16, 6.45); ob2.rotation_euler = (math.pi / 2, 0, 0)
    ob2.data.materials.append(material('gold'))
    bpy.context.view_layer.objects.active = ob2
    ob2.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob2.select_set(False)

def step_block(bid):
    shape, (bx, bz) = BLOCK_SHAPE[bid], BLOCK_POS[bid]
    layout = floor_layout(shape)
    base = 0.0 if BLOCK_GROUND[bid] == 'shops' else 1.0   # B and C stand on a plinth
    top = base + STILT + FLOORS * FH
    def fy(floor):   # the floor level of a floor: 0 is the stilt
        return base + (0 if floor == 0 else STILT + (floor - 1) * FH)
    def fh(floor):
        return STILT if floor == 0 else FH
    cream = lin('#f2efe9') if bid != 'B' else lin('#ebe8e1')
    lobby = lin('#56657a')
    flats = Builder(f'{bid}_flats', material('walls'), flat_ids=True, colors=True)
    stilt = Builder(f'{bid}_stilt', material('shops') if bid == 'A' else material('column'))
    slabs = Builder(f'{bid}_slabs', material('slab'))
    blue = Builder(f'{bid}_blue', material('blue'))
    balc = Builder(f'{bid}_balconies', material('balcony'))
    rails = Builder(f'{bid}_rails', material('rail'))
    glass = Builder(f'{bid}_glass', material('glass'))
    dark = Builder(f'{bid}_glass_dark', material('glass_dark'))
    acs = Builder(f'{bid}_ac', material('ac'))
    records = []
    for fl in layout:
        cx, cz, rot, L, W, s = bx + fl['cx'], bz + fl['cz'], fl['rot'], fl['len'], fl['wid'], fl['side']
        td = fl['tipDir']
        for floor in range(0, FLOORS + 1):
            y, h = fy(floor), fh(floor)
            if floor == 0:
                if bid == 'A' and fl['wing'] in (1, 2):   # the shops on the stilt floor of Block A, on the two wings facing the road
                    stilt.box(place(cx, cz, rot, 0, y + h / 2, 0), (L, W, h - 0.1), rot_z=rot)
                else:   # open parking on columns
                    for lx in (-L / 2 + 0.4, 0, L / 2 - 0.4):
                        for lz in (-W / 2 + 0.4, W / 2 - 0.4):
                            stilt.box(place(cx, cz, rot, lx, y + h / 2, lz), (0.45, 0.45, h), rot_z=rot)
                    if fl['lobby']:
                        stilt.box(place(cx, cz, rot, 0, y + h / 2, 0), (L, W, h - 0.1), rot_z=rot)
            elif fl['lobby']:
                blue.box(place(cx, cz, rot, 0, y + h / 2, 0), (L, W, h - 0.08), rot_z=rot)
            else:
                idx = len(records)
                records.append(dict(i=idx, block=bid, floor=floor, flat=fl['n']))
                c = (cream[0] * (0.99 + rnd() * 0.02), cream[1] * (0.99 + rnd() * 0.02), cream[2] * (0.99 + rnd() * 0.02), 1.0)
                flats.box(place(cx, cz, rot, 0, y + h / 2, 0), (L, W, h - 0.08), rot_z=rot, flat=idx, color=c)
            # windows along the open side and at the tip, a balcony with its rail, an AC unit under some windows
            if floor > 0 or (bid == 'A' and fl['wing'] in (1, 2)):
                zf = s * (W / 2 + 0.03)
                count = 4 if L > 14 else 3
                for k in range(count):
                    wx = (k - (count - 1) / 2) * (L / count)
                    if floor == 0 and bid == 'A' and k == 2 and fl['wing'] == 2 and fl['side'] == 1 and fl['tip']:
                        continue   # eleven shop fronts, not twelve
                    ww, wh = (2.6, 2.4) if floor == 0 else (1.5, 1.3)
                    (glass if floor == 0 or rnd() < 0.56 else dark).plane(place(cx, cz, rot, wx, y + (1.5 if floor == 0 else 1.7), zf), ww, wh, rot_x=s * math.pi / 2, rot_z=rot)
                    if floor > 0 and k != 1 and rnd() < 0.4:
                        acs.box(place(cx, cz, rot, wx + 0.9, y + 0.85, s * (W / 2 + 0.2)), (0.6, 0.35, 0.45), rot_z=rot)
                if fl['tip'] and floor > 0:
                    for k in (-1.6, 1.6):
                        (glass if rnd() < 0.56 else dark).plane(place(cx, cz, rot, td * (L / 2 + 0.03), y + 1.7, k), 1.5, 1.3, rot_y=td * math.pi / 2, rot_z=rot)
                if floor > 0 and not fl['lobby']:
                    balc.box(place(cx, cz, rot, L * 0.18, y + 0.19, s * (W / 2 + 0.65)), (3.2, 1.3, 0.18), rot_z=rot)
                    rails.box(place(cx, cz, rot, L * 0.18, y + 0.75, s * (W / 2 + 1.27)), (3.2, 0.05, 1.0), rot_z=rot)
                    rails.box(place(cx, cz, rot, L * 0.18 - 1.6, y + 0.75, s * (W / 2 + 0.95)), (0.05, 0.6, 1.0), rot_z=rot)
                    rails.box(place(cx, cz, rot, L * 0.18 + 1.6, y + 0.75, s * (W / 2 + 0.95)), (0.05, 0.6, 1.0), rot_z=rot)
                    if fl['tip']:   # the curved balcony at the tip of every wing, a blue fascia with a rail
                        balc.box(place(cx, cz, rot, td * (L / 2 + 0.6), y + 0.19, 0), (1.2, W - 0.6, 0.18), rot_z=rot)
                        rails.box(place(cx, cz, rot, td * (L / 2 + 1.2), y + 0.75, 0), (0.05, W - 0.6, 1.0), rot_z=rot)
        if fl['tip']:   # the blue band up the tip of every wing
            blue.box(place(cx, cz, rot, td * (L / 2 + 0.1), (base + top) / 2, 0), (0.2, 1.5, top - base), rot_z=rot)
        for floor in range(0, FLOORS + 2):   # a slab line at every floor and the roof
            slabs.box(place(cx, cz, rot, 0, fy(floor) if floor <= FLOORS else top, 0), (L + 0.5, W + 0.5, 0.24), rot_z=rot)
        slabs.box(place(cx, cz, rot, 0, top + 0.5, 0), (L + 0.5, 0.3, 0.9), rot_z=rot)   # the parapet
    # the core with the lifts, the machine room and the tanks on the roof, the plinth under B and C, the entrance canopy
    coreW, coreD = (15, 15) if shape == 'x' else (12, 14)
    blue.box((bx, -bz, (top + 1.2) / 2), (coreW, coreD, top + 1.2))
    blue.box((bx + 3, -(bz - 3), top + 2.7), (6, 5, 3))
    tanks = Builder(f'{bid}_tanks', material('tank'))
    for tx, tz in ((-4, 3), (-1, 3)):
        tanks.cyl((bx + tx, -(bz + tz), top + 2.0), 1.2, 1.6, segs=12)
    tanks.build()
    if base > 0:
        pl = Builder(f'{bid}_plinth', material('plinth'))
        pw, pd = (70, 70) if shape == 'x' else (40, 56)
        pl.box((bx, -bz, base / 2), (pw, pd, base))
        pl.build()
    canopy = Builder(f'{bid}_canopy', material('white'))
    cz_ = bz + coreD / 2 + 2.5 + (2 if shape == 'x' else 0)
    canopy.box((bx, -cz_, base + 3.3), (9, 5, 0.3))
    canopy.build()
    flats.build(extras={'flats': json.dumps(records), 'block': bid})
    for b in (stilt, slabs, blue, balc, rails, glass, dark, acs):
        b.build()
    return len(records)

def step_club():
    b = Builder('club', material('plaster')); b.cyl(P(104, 3.5, 10), 9, 7, segs=36); b.build()
    b = Builder('club_glass', material('club_glass')); b.cyl(P(104, 4.2, 10), 9.08, 2.2, segs=36, caps=False); b.build()
    b = Builder('club_roof', material('white')); b.cyl(P(104, 7.25, 10), 9.8, 0.5, segs=36); b.build()
    b = Builder('club_steps', material('deck'))
    for s in range(3):
        b.cyl(P(104, 0.2 + (2 - s) * 0.4, 10), 11 + s * 1.6, 0.4, segs=36)
    b.build()
    b = Builder('gazebo', material('white')); b.cyl(P(92, 3.9, 22), 3, 1.6, segs=8, radius_top=0.0); b.build()
    b = Builder('gazebo_posts', material('plaster'))
    for i in range(6):
        a = i / 6 * math.tau
        b.cyl(P(92 + math.cos(a) * 2.2, 1.5, 22 + math.sin(a) * 2.2), 0.12, 3, segs=6)
    b.build()
    b = Builder('benches', material('bench'))
    for x, z in ((80, 12), (100, -4), (112, 24), (-104, 4), (-112, -4), (60, -26)):
        fbox(b, x, z, 1.8, 0.5, 0.5, 0.1); fbox(b, x, z - 0.2, 1.6, 0.08, 0.1, 0.65)
    b.build()
    posts = Builder('lamp_posts', material('lamp_post'))
    heads = Builder('lamp_heads', material('lamp_glow'))
    spots = [(x, 33.2) for x in range(-112, 113, 24)]
    for z in range(-30, 31, 20):
        spots += [(-118.6, z), (118.6, z)]
    spots += [(70, -28), (70, 28), (94, -26), (112, 2), (-104, 12), (-104, -12)]
    for x, z in spots:
        posts.cyl(P(x, 3, z), 0.1, 6, segs=6, radius_top=0.07)
        heads.ico(P(x, 6.1, z), 0.32)
    posts.build(); heads.build()

def step_trees():
    # palms along the parking row
    trunks = Builder('palm_trunks', material('trunk'))
    fronds = Builder('palm_fronds', material('leaf'))
    for i in range(24):
        x, z = -108 + i * 9.4, 25.3
        trunks.cyl(P(x, 3.5, z), 0.28, 7, segs=7, radius_top=0.16)
        for f in range(8):
            yaw = f / 8 * math.tau + rnd() * 0.4
            tilt = 0.55 + rnd() * 0.35
            c, s = math.cos(yaw), math.sin(yaw)
            m = Matrix.Translation(P(x, 7, z)) @ Matrix.Rotation(yaw, 4, 'Z') @ Matrix.Rotation(tilt, 4, 'Y') @ Matrix.Translation((1.8, 0, 0)) @ Matrix.Diagonal(Vector((3.6, 0.7, 0.08)).to_4d())
            r = bmesh.ops.create_cube(fronds.bm, size=1.0, matrix=m)
            fronds.count += 1
    trunks.build(); fronds.build()
    # round trees: inside the plot (the garden, the west strip, the lawns), then the country round it
    greens = ['#467f38', '#5f9440', '#3f7a35', '#6a9a46', '#527f33']
    def forest(name, coll, spots):
        crowns = Builder(name + '_crowns', material('canopy'), coll, colors=True)
        trunks = Builder(name + '_trunks', material('trunk'), coll)
        for x, z, s in spots:
            trunks.cyl(P(x, 1.3 * s, z), 0.32 * s, 2.6 * s, segs=6, radius_top=0.2 * s)
            crowns.ico(P(x, 4.2 * s, z), 2.4 * s, jitter=0.28, scale=(1, 1, 0.9), color=lin(greens[int(rnd() * 5)]))
            crowns.ico(P(x + (rnd() - 0.5) * 1.2 * s, 5.4 * s, z + (rnd() - 0.5) * 1.2 * s), 1.7 * s, jitter=0.28, color=lin(greens[int(rnd() * 5)]))
        crowns.build(); trunks.build()
    inside = []
    while len(inside) < 110:
        r = rnd()
        if r < 0.45:
            x, z = 78 + rnd() * 40, -28 + rnd() * 56
        elif r < 0.7:
            x, z = -119 + rnd() * 18, -32 + rnd() * 64
        else:
            x = [-72, 34, -72, 34][int(rnd() * 4)] + (rnd() - 0.5) * 16
            z = (-24 if rnd() < 0.5 else 25) + (rnd() - 0.5) * 8
        if math.hypot(x - 86, z + 16) < 13 or math.hypot(x - 104, z - 10) < 16 or math.hypot(x - 110, z + 20) < 10 or math.hypot(x + 109, z + 22) < 10 or math.hypot(x + 109, z - 26) < 9:
            continue
        if any(abs(x - bx) < 36 and abs(z - bz) < 30 for bx, bz in BLOCK_POS.values()) and abs(z) <= 20:
            continue
        inside.append((x, z, 0.8 + rnd() * 0.5))
    forest('trees', 'Site', inside)
    outside = []
    while len(outside) < 400:
        x, z = (rnd() - 0.5) * 900, (rnd() - 0.5) * 700
        if (abs(x) < 121 and abs(z) < 36) or (abs(z - 43) < 9 and abs(x) < 160) or (abs(abs(x) - 129) < 9 and abs(z) < 85):
            continue
        outside.append((x, z, 0.9 + rnd() * 1.1))
    forest('country_trees', 'Surroundings', outside)

def step_cars():
    body = Builder('cars', material('car'), colors=True)
    cabs = Builder('car_cabs', material('car_glass'))
    cols = ['#d9d6d0', '#2b2b2e', '#8f8f93', '#7a2c2a', '#2c3e6b', '#e9e5dc', '#4a4a4c', '#b8b2a5']
    for i in range(34):
        x = -108 + int(i * 2.6) * 2.5 + 1.25
        fbox(body, x, 29.5, 1.7, 4.2, 0.2, 0.7, color=lin(cols[i % len(cols)]))
        fbox(cabs, x, 29.3, 1.5, 2.2, 0.9, 0.6)
    body.build(); cabs.build()

def step_camera():
    sc = bpy.context.scene
    cam = bpy.data.objects.get('Camera')
    if not cam:
        cd = bpy.data.cameras.new('Camera'); cam = bpy.data.objects.new('Camera', cd); collection('Surroundings').objects.link(cam)
    cam.data.lens_unit = 'FOV'; cam.data.angle = math.radians(52)   # vertical 42 degrees at 16:9
    cam.data.sensor_fit = 'VERTICAL'; cam.data.angle = math.radians(42)
    cam.data.clip_end = 3000
    cam.location = P(118.8, 58.8, 122.4)
    target = Vector(P(5.8, 11.5, 1.2))
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sc.render.resolution_x = 2800; sc.render.resolution_y = 1575; sc.render.resolution_percentage = 100

def set_world(hdr_path, strength=1.0, rotation=0.0):
    sc = bpy.context.scene
    w = sc.world or bpy.data.worlds.new('World')
    sc.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    bg = nt.nodes.new('ShaderNodeBackground')
    env = nt.nodes.new('ShaderNodeTexEnvironment')
    mp = nt.nodes.new('ShaderNodeMapping')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    env.image = bpy.data.images.load(hdr_path, check_existing=True)
    mp.inputs['Rotation'].default_value = (0, 0, rotation)
    bg.inputs['Strength'].default_value = strength
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
    nt.links.new(env.outputs['Color'], bg.inputs['Color'])
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])

STEPS = ['materials', 'ground', 'surroundings', 'wall_gate', 'A', 'B', 'C', 'club', 'trees', 'cars', 'camera']

def build(step):
    if step == 'all':
        for s in STEPS:
            build(s)
        return
    if step in ('A', 'B', 'C'):
        n = step_block(step); print(f'block {step}: {n} homes'); return
    globals()['step_' + step]()
    print('built', step)
