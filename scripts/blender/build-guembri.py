"""
Builds the showroom guembri in Blender and exports public/models/guembri.glb.

  blender --background --factory-startup --python scripts/blender/build-guembri.py -- public/models/guembri.glb [preview.png]

Dimensions match GEO in src/data/notes.ts (metres; app space +X = neck tip,
+Y = up out of the skin). Blender is Z-up, so app (x, y, z) = Blender (x, z, -y);
the glTF exporter converts back. Strings are NOT in the GLB: the site draws them
(they vibrate in a shader), so the bridge, bindings and spike sit exactly where
src/three/stringPath.ts expects them.

Materials are named Wood, NeckWood, Skin, Cord, Lace, Metal, DarkMetal; the site
swaps them for its own textured materials by name (finishes keep working).
UVs are in metres with grain along X, like the procedural model.
"""
import math
import sys

import bpy
import bmesh
from mathutils import Vector, noise
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "guembri.glb"
PREVIEW = argv[1] if len(argv) > 1 else None

G = dict(
    bodyStart=-0.64, bodyEnd=-0.06, bodyWidth=0.23, bodyDepth=0.17,
    neckRadius=0.0165, neckY=0.008, neckTip=0.62, bridgeX=-0.47,
    bridgeTop=0.052, tailX=-0.635, skinY=0.0115,
)
NUT_X = [0.5, 0.46, 0.08]
R = G["neckRadius"]
TAU = math.tau

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ------------------------------------------------------------------ helpers
def material(name, color, rough, metal=0.0):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    m.diffuse_color = (*color, 1)
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF") if nt else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = metal
    return m


MAT = {
    "Wood": material("Wood", (0.30, 0.17, 0.085), 0.62),
    "NeckWood": material("NeckWood", (0.36, 0.22, 0.12), 0.5),
    "Skin": material("Skin", (0.78, 0.66, 0.48), 0.7),
    "Cord": material("Cord", (0.32, 0.2, 0.11), 0.78),
    "Lace": material("Lace", (0.23, 0.14, 0.08), 0.7),
    "Metal": material("Metal", (0.64, 0.59, 0.52), 0.42, 0.92),
    "DarkMetal": material("DarkMetal", (0.37, 0.34, 0.29), 0.5, 0.85),
}


class Part:
    """accumulates verts / faces / per-loop uvs, then becomes one object"""

    def __init__(self):
        self.v, self.f, self.uv = [], [], []

    def add(self, verts, faces, uvs):
        o = len(self.v)
        self.v += verts
        for face, fuv in zip(faces, uvs):
            self.f.append(tuple(i + o for i in face))
            self.uv.append(fuv)

    def build(self, name, mat, smooth=True):
        me = bpy.data.meshes.new(name)
        me.from_pydata([tuple(p) for p in self.v], [], self.f)
        layer = me.uv_layers.new(name="UVMap")
        for poly, fuv in zip(me.polygons, self.uv):
            for li, uv in zip(poly.loop_indices, fuv):
                layer.data[li].uv = uv
        me.materials.append(MAT[mat])
        for p in me.polygons:
            p.use_smooth = smooth
        me.validate()
        ob = bpy.data.objects.new(name, me)
        scene.collection.objects.link(ob)
        return ob


def grid(rings, closed_ring=True, u_of=None, cap0=None, cap1=None):
    """rings: list of lists of Vector (same length). Faces between consecutive
    rings; per-loop uv = (u, arc length) with a seam at index 0."""
    N, M = len(rings), len(rings[0])
    verts = [p for ring in rings for p in ring]
    arcs = []
    for ring in rings:
        a, acc = [0.0], 0.0
        for j in range(1, M + 1):
            acc += (ring[j % M] - ring[j - 1]).length
            a.append(acc)
        arcs.append(a)
    faces, uvs = [], []
    jmax = M if closed_ring else M - 1
    for i in range(N - 1):
        for j in range(jmax):
            jn = j + 1
            idx = [i * M + j, i * M + jn % M, (i + 1) * M + jn % M, (i + 1) * M + j]
            uu = [u_of(i, j), u_of(i, jn), u_of(i + 1, jn), u_of(i + 1, j)]
            vv = [arcs[i][j], arcs[i][jn], arcs[i + 1][jn], arcs[i + 1][j]]
            faces.append(idx)
            uvs.append(list(zip(uu, vv)))
    # optional fan caps to a centre point
    for cap, i, flip in ((cap0, 0, True), (cap1, N - 1, False)):
        if cap is None:
            continue
        c = len(verts)
        verts.append(cap)
        for j in range(M):
            tri = [i * M + j, i * M + (j + 1) % M, c]
            if flip:
                tri.reverse()
            faces.append(tri)
            uvs.append([(rings[i][k % M].x, rings[i][k % M].y) for k in (0, 0, 0)])
    return verts, faces, uvs


def lathe(profile, M=32, cy=0.0, cz=0.0, wobble=0.0, seed=0.0):
    """revolve [(x, r)] around an X-parallel axis at (cy, cz); returns part data"""
    rings = []
    for x, r in profile:
        ring = []
        for j in range(M):
            a = TAU * j / M
            rr = r
            if wobble and r > 0:
                rr += wobble * noise.noise(Vector((x * 40, math.cos(a) * 2, math.sin(a) * 2 + seed)))
            ring.append(Vector((x, cy + rr * math.cos(a), cz + rr * math.sin(a))))
        rings.append(ring)
    u = lambda i, j: profile[i][0]
    cap0 = Vector((profile[0][0], cy, cz)) if profile[0][1] > 1e-5 else None
    cap1 = Vector((profile[-1][0], cy, cz)) if profile[-1][1] > 1e-5 else None
    return grid(rings, True, u, cap0, cap1)


def sweep(path, radius, sides=8, closed=False, v_scale=0.05):
    """tube of `radius` along a polyline (parallel-transport frames)"""
    n = len(path)
    tang = []
    for i in range(n):
        if closed:
            t = path[(i + 1) % n] - path[i - 1]
        else:
            t = path[min(i + 1, n - 1)] - path[max(i - 1, 0)]
        tang.append(t.normalized())
    ref = Vector((0, 0, 1)) if abs(tang[0].z) < 0.9 else Vector((1, 0, 0))
    nrm = tang[0].cross(ref).normalized()
    rings, length, lens = [], 0.0, []
    for i in range(n):
        if i:
            length += (path[i] - path[i - 1]).length
            nrm = (nrm - tang[i] * nrm.dot(tang[i])).normalized()
        bin_ = tang[i].cross(nrm)
        rings.append([path[i] + (nrm * math.cos(TAU * k / sides) + bin_ * math.sin(TAU * k / sides)) * radius for k in range(sides)])
        lens.append(length)
    if closed:
        rings.append(rings[0])
        lens.append(length + (path[0] - path[-1]).length)
    M = sides
    verts = [p for r in rings for p in r]
    faces, uvs = [], []
    for i in range(len(rings) - 1):
        for k in range(M):
            idx = [i * M + k, i * M + (k + 1) % M, (i + 1) * M + (k + 1) % M, (i + 1) * M + k]
            faces.append(idx[::-1])
            uvs.append([(k / M, lens[i] / v_scale), ((k + 1) / M, lens[i] / v_scale), ((k + 1) / M, lens[i + 1] / v_scale), (k / M, lens[i + 1] / v_scale)][::-1])
    return verts, faces, uvs


def helix(x0, x1, radius, turns, cz, steps_per_turn=24, jitter=0.0):
    pts = []
    total = int(turns * steps_per_turn)
    for s in range(total + 1):
        t = s / total
        a = TAU * turns * t
        r = radius + jitter * noise.noise(Vector((t * 9, 0.3, 0.7)))
        pts.append(Vector((x0 + (x1 - x0) * t, r * math.cos(a), cz + r * math.sin(a))))
    return pts


def apply_modifiers(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


# ------------------------------------------------------------------ body
x0, x1 = G["bodyStart"], G["bodyEnd"]
L = x1 - x0
HW = G["bodyWidth"] / 2
D = G["bodyDepth"]


def round_end(t, p):
    k = abs(2 * t - 1)
    return max(1 - k ** p, 0.0) ** (1 / p)


def hull_ring(t, inflate, top, dome, M, carve=0.0):
    x = x0 + L * t
    hw = (HW - 0.018 * t) * round_end(t, 5.0) + inflate
    d = D * round_end(t, 2.4) * (1 - 0.06 * t) + inflate
    nb, nt = 2.4, 8.0
    ring = []
    for j in range(M):
        a = TAU * j / M
        c, s = math.cos(a), math.sin(a)
        sg = 1 if c >= 0 else -1
        if s >= 0:
            y = hw * sg * abs(c) ** (2 / nt)
            z = top + dome * s * round_end(t, 3)
        else:
            y = hw * sg * abs(c) ** (2 / nb)
            z = top - d * abs(s) ** (2 / nb)
        p = Vector((x, y, z))
        if carve and s < -0.05:
            # adze facets running along the belly + a little hand-carved wander
            out = Vector((0, y, z - (top - d * 0.45))).normalized()
            facet = 0.0007 * abs(math.sin(a * 11 + x * 2.0))
            wander = 0.0011 * noise.noise(Vector((x * 14, y * 14, z * 14)))
            p += out * (wander - facet)
        ring.append(p)
    return x, ring


def hull_part(inflate, top, dome, N, M, carve):
    rings = []
    for i in range(N):
        t = 0.5 - 0.5 * math.cos(math.pi * i / (N - 1))
        t = min(max(t, 0.006), 0.994)
        rings.append(hull_ring(t, inflate, top, dome, M, carve)[1])
    ends = [Vector((r[0].x, 0, sum(p.z for p in r) / len(r))) for r in (rings[0], rings[-1])]
    return grid(rings, True, lambda i, j: rings[i][0].x, ends[0], ends[1])


p = Part()
p.add(*hull_part(0.0, -0.004, 0.0, 60, 56, carve=1.0))
hull = p.build("Body", "Wood")

# skin: same form, slightly inflated, domed, wrapped down the walls to a hem
p = Part()
p.add(*hull_part(0.0035, G["skinY"] - 0.0016, 0.0016, 60, 56, carve=0.0))
skin = p.build("Skin", "Skin")
bm = bmesh.new()
bm.from_mesh(skin.data)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, -0.05), plane_no=(0, 0, 1), clear_inner=True)
bm.to_mesh(skin.data)
bm.free()
sol = skin.modifiers.new("thickness", "SOLIDIFY")
sol.thickness = 0.0014
sol.offset = -1
apply_modifiers(skin)

# lacing: a leather thong zig-zagging from the skin's hem down onto the wood
bvh = BVHTree.FromObject(hull, bpy.context.evaluated_depsgraph_get())
cx = (x0 + x1) / 2


def plan_pt(a):
    ox = cx + (L / 2 - 0.004) * math.copysign(abs(math.cos(a)) ** 0.4, math.cos(a))
    oy = (HW + 0.02) * math.copysign(abs(math.sin(a)) ** 0.4, math.sin(a))
    return Vector((ox, oy))


def on_hull(xy, z, lift):
    """nearest hull point to (xy, z), lifted along the surface normal"""
    hit, n, _, _ = bvh.find_nearest(Vector((xy.x, xy.y, z)))
    return hit + n * lift


# plan outline resampled evenly by arc length
dense = [plan_pt(TAU * i / 2000) for i in range(2000)]
acc = [0.0]
for i in range(1, 2001):
    acc.append(acc[-1] + (dense[i % 2000] - dense[i - 1]).length)


def plan_at(s):
    s %= acc[-1]
    lo, hi = 0, 2000
    while hi - lo > 1:
        mid = (lo + hi) // 2
        lo, hi = (mid, hi) if acc[mid] <= s else (lo, mid)
    t = (s - acc[lo]) / max(acc[lo + 1] - acc[lo], 1e-9)
    return dense[lo].lerp(dense[(lo + 1) % 2000], t)


K = 120
Z_UP, Z_DN, L_UP, L_DN = -0.043, -0.076, 0.0052, 0.0016
lace = []
for k in range(K):
    for sub in range(6):
        f = sub / 6
        up0 = k % 2 == 0
        # linear blend of height/lift between the zig and the zag, re-projected on the hull
        za, zb = (Z_UP, Z_DN) if up0 else (Z_DN, Z_UP)
        la, lb = (L_UP, L_DN) if up0 else (L_DN, L_UP)
        lace.append(on_hull(plan_at(acc[-1] * (k + f) / K), za + (zb - za) * f, la + (lb - la) * f))
p = Part()
p.add(*sweep(lace, 0.0013, sides=6, closed=True, v_scale=0.02))
p.build("Lacing", "Lace")

# a band of iron tacks holding the hem
p = Part()
for k in range(0, K, 4):
    q = on_hull(plan_at(acc[-1] * (k + 1) / K), -0.047, 0.0045)
    prof = [(0.0, 0.0028), (0.0012, 0.0024), (0.0022, 0.0012), (0.0026, 0.0)]
    v, f, uv = lathe(prof, M=10)
    # orient the little dome outward
    out = Vector((q.x - cx, q.y, 0)).normalized()
    rot = Vector((1, 0, 0)).rotation_difference(out).to_matrix()
    v = [rot @ pt + q for pt in v]
    p.add(v, f, uv)
p.build("Tacks", "DarkMetal")

# ------------------------------------------------------------------ neck
NY = G["neckY"]
tip = G["neckTip"]
neck_x0 = x1 - 0.04


def neck_r(x):
    t = (x - neck_x0) / (tip - neck_x0)
    return R * (1 - 0.1 * t)


prof = [(neck_x0 + (tip - neck_x0) * i / 60, neck_r(neck_x0 + (tip - neck_x0) * i / 60)) for i in range(61)]
p = Part()
p.add(*lathe(prof, M=24, cz=NY, wobble=0.00035, seed=1.0))
# carved finial at the tip: bead, groove, swelling, rounded crown
r0 = neck_r(tip)
fin = [(tip, r0), (tip + 0.003, r0 * 1.06), (tip + 0.006, r0 * 1.06), (tip + 0.008, r0 * 0.82),
       (tip + 0.011, r0 * 0.84), (tip + 0.016, r0 * 1.12), (tip + 0.023, r0 * 1.1), (tip + 0.029, r0 * 0.86),
       (tip + 0.033, r0 * 0.6), (tip + 0.036, r0 * 0.3), (tip + 0.0372, 0.0)]
p.add(*lathe(fin, M=32, cz=NY))
# the stick runs through the body and leaves the tail as a rounded spike
sp0 = x0 + 0.04
spike = [(sp0, R * 0.95), (x0 - 0.03, R * 0.9), (x0 - 0.04, R * 0.82), (x0 - 0.046, R * 0.6), (x0 - 0.049, R * 0.3), (x0 - 0.05, 0.0)]
p.add(*lathe(spike, M=28, cz=NY))
p.build("Neck", "NeckWood")

# bridge: arched feet, tapered sides, rounded top
bw = 0.03
h = G["bridgeTop"] - G["skinY"]
outline = [(-bw, 0), (-bw * 0.42, 0)]
for i in range(1, 12):
    a = math.pi * i / 12
    outline.append((-bw * 0.42 * math.cos(a), 0.008 * math.sin(a)))
outline += [(bw * 0.42, 0), (bw, 0), (bw * 0.7, h)]
for i in range(1, 8):
    s = i / 8
    outline.append((bw * 0.7 * (1 - 2 * s), h + 0.003 * math.sin(math.pi * s)))
outline.append((-bw * 0.7, h))
bm = bmesh.new()
th = 0.011
vs0 = [bm.verts.new((G["bridgeX"] - th / 2, -yy, G["skinY"] + zz)) for yy, zz in outline]
face = bm.faces.new(vs0)
ext = bmesh.ops.extrude_face_region(bm, geom=[face])
bmesh.ops.translate(bm, verts=[e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)], vec=(th, 0, 0))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
me = bpy.data.meshes.new("Bridge")
bm.to_mesh(me)
bm.free()
me.materials.append(MAT["NeckWood"])
bridge = bpy.data.objects.new("Bridge", me)
scene.collection.objects.link(bridge)
bev = bridge.modifiers.new("bevel", "BEVEL")
bev.width = 0.0013
bev.segments = 3
bev.limit_method = "ANGLE"
apply_modifiers(bridge)
bpy.context.view_layer.objects.active = bridge
bridge.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.cube_project(cube_size=1.0)
bpy.ops.object.mode_set(mode="OBJECT")
bridge.select_set(False)

# ------------------------------------------------------------------ leather bindings
p = Part()
# collar where the neck enters the body
p.add(*sweep(helix(x1 - 0.008, x1 + 0.022, R + 0.0042, 7, NY, jitter=0.0004), 0.0023, sides=8))
# tail knot on the spike
p.add(*sweep(helix(G["tailX"] - 0.009, G["tailX"] + 0.009, R * 0.95 + 0.0032, 5, NY, jitter=0.0003), 0.0021, sides=8))
# tuning rings: several turns of thong per string
for nx in NUT_X:
    p.add(*sweep(helix(nx - 0.003, nx + 0.0255, neck_r(nx) + 0.003, 5, NY, jitter=0.0005), 0.0031, sides=8))
p.build("Bindings", "Cord")

# ------------------------------------------------------------------ sersera
pw, pl = 0.05, 0.115
px = tip - 0.035
cu = bpy.data.curves.new("SerseraPlate", "CURVE")
cu.dimensions = "2D"
cu.fill_mode = "BOTH"
cu.extrude = 0.00045
cu.resolution_u = 12


def poly(points):
    sp = cu.splines.new("POLY")
    sp.points.add(len(points) - 1)
    for pt, (x, y) in zip(sp.points, points):
        pt.co = (x, y, 0, 1)
    sp.use_cyclic_u = True


def rounded_plate():
    pts = [(0, -pw * 0.45), (pl * 0.75, -pw)]
    for i in range(1, 8):
        a = -math.pi / 2 + (math.pi / 2) * i / 8
        pts.append((pl * 0.75 + pl * 0.25 * math.cos(a), -pw * 0.6 + pw * 0.4 * math.sin(a) - 0.0))
    pts += [(pl, -pw * 0.6), (pl, pw * 0.6)]
    for i in range(1, 8):
        a = (math.pi / 2) * i / 8
        pts.append((pl * 0.75 + pl * 0.25 * math.cos(a), pw * 0.6 + pw * 0.4 * math.sin(a)))
    pts += [(pl * 0.75, pw), (0, pw * 0.45)]
    return pts


def circle(cx_, cy_, r, n=14):
    return [(cx_ + r * math.cos(TAU * i / n), cy_ + r * math.sin(TAU * i / n)) for i in range(n)][::-1]


plate_pts = rounded_plate()
poly(plate_pts)
# punched pattern: a rosette of holes in the field
for (hx, hy, hr) in [(0.07, 0, 0.007), (0.07, 0.019, 0.0035), (0.07, -0.019, 0.0035), (0.051, 0, 0.0035),
                     (0.089, 0, 0.0035), (0.04, 0.016, 0.0025), (0.04, -0.016, 0.0025), (0.1, 0.022, 0.0025), (0.1, -0.022, 0.0025)]:
    poly(circle(hx, hy, hr))
# small holes near the edge that carry the jingle rings
edge_holes = []
outline_closed = plate_pts + [plate_pts[0]]
seglen = [(Vector(b) - Vector(a)).length for a, b in zip(outline_closed, outline_closed[1:])]
total = sum(seglen)
for k in range(22):
    s = total * (k + 0.5) / 22
    for (a, b), l in zip(zip(outline_closed, outline_closed[1:]), seglen):
        if s <= l:
            pa, pb = Vector(a), Vector(b)
            pt = pa.lerp(pb, s / l)
            nrm = Vector((pb.y - pa.y, -(pb.x - pa.x))).normalized()  # outward for CCW outline
            break
        s -= l
    if pt.x < 0.022:
        continue
    hole = pt - nrm * 0.0042
    poly(circle(hole.x, hole.y, 0.0013, 8))
    edge_holes.append((hole, nrm))
plate = bpy.data.objects.new("Sersera", cu)
scene.collection.objects.link(plate)
plate.location = (px, 0, NY + 0.0005)
cu.materials.append(MAT["Metal"])
bpy.context.view_layer.objects.active = plate
plate.select_set(True)
bpy.ops.object.convert(target="MESH")
plate = bpy.context.view_layer.objects.active
plate.select_set(False)
for poly_ in plate.data.polygons:
    poly_.use_smooth = False

p = Part()
for i, (hole, nrm) in enumerate(edge_holes):
    centre = Vector((px + hole.x, hole.y, NY + 0.0005)) + Vector((nrm.x, nrm.y, 0)) * 0.0035 + Vector((0, 0, -0.0062))
    radial = Vector((nrm.x, nrm.y, 0)).normalized()
    tilt = 0.35 * math.sin(i * 1.7)
    up = Vector((0, 0, 1))
    ring = []
    for s in range(20):
        a = TAU * s / 20
        dirv = radial * math.cos(a) + up * math.sin(a)
        dirv = dirv + radial.cross(up) * tilt * math.sin(a)
        ring.append(centre + dirv.normalized() * 0.0072)
    p.add(*sweep(ring, 0.0011, sides=6, closed=True, v_scale=0.02))
p.build("SerseraRings", "Metal")

# ------------------------------------------------------------------ export
for ob in scene.objects:
    ob.select_set(True)
kw = dict(filepath=OUT, export_format="GLB", export_apply=True, export_yup=True)
for extra in (dict(export_cameras=False, export_lights=False, export_texcoords=True, export_normals=True), {}):
    try:
        bpy.ops.export_scene.gltf(**kw, **extra)
        break
    except TypeError:
        continue
print("EXPORTED", OUT, sum(len(o.data.polygons) for o in scene.objects if o.type == "MESH"), "faces")

# ------------------------------------------------------------------ optional preview render
if PREVIEW:
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
    scene.collection.objects.link(cam)
    cam.location = (-0.15, -1.55, 0.75)
    cam.rotation_euler = (math.radians(66), 0, math.radians(-4))
    cam.data.lens = 38
    scene.camera = cam
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
    sun.rotation_euler = (math.radians(40), math.radians(20), math.radians(30))
    scene.collection.objects.link(sun)
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_cavity = True
    scene.render.resolution_x, scene.render.resolution_y = 1400, 800
    for tag, loc, rot in (("side", (-0.15, -1.55, 0.75), (66, 0, -4)), ("top", (-0.75, -0.55, 0.45), (55, 0, -55))):
        cam.location = loc
        cam.rotation_euler = tuple(math.radians(a) for a in rot)
        scene.render.filepath = PREVIEW.replace(".png", f"-{tag}.png")
        bpy.ops.render.render(write_still=True)
    print("PREVIEW", PREVIEW)
