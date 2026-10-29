"""Refine the current Blender studio car without changing its names or length."""
import bpy, bmesh, math, json, os
import numpy as np
from mathutils import Vector

scene = bpy.context.scene
body = bpy.data.objects['Body']
original_names = {o.name for o in scene.objects}
original_materials = {m.name for m in bpy.data.materials}
original_origins = {o.name: tuple(o.location) for o in scene.objects}

def vehicle_bounds():
    coords = [o.matrix_world @ v.co for o in scene.objects
              if o.type == 'MESH' and not o.name.startswith('Studio_')
              for v in o.data.vertices]
    return min(v.y for v in coords), max(v.y for v in coords)

length_before = vehicle_bounds()
body_min_before = min(v.co.z for v in body.data.vertices)

# Raise only sprung parts by editing mesh coordinates, retaining object origins.
for ob in scene.objects:
    if ob.type != 'MESH' or ob.name.startswith(('Studio_', 'Wheel_')):
        continue
    inv = ob.matrix_world.inverted()
    for v in ob.data.vertices:
        p = ob.matrix_world @ v.co
        p.z += .06
        v.co = inv @ p

# Cut supporting rows directly into Body for the two deliberate side creases.
bm = bmesh.new()
bm.from_mesh(body.data)
for z in [.56, .60, .64, .96, 1.00, 1.04]:
    bmesh.ops.bisect_plane(bm, geom=list(bm.verts)+list(bm.edges)+list(bm.faces),
                          dist=.00001, plane_co=(0,0,z), plane_no=(0,0,1),
                          clear_inner=False, clear_outer=False)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=.00001)
for v in bm.verts:
    x,y,z = v.co
    side = min(1, max(0, (abs(x)-.65)/.20))
    door = min(1, max(0, (.99-abs(y))/.20))
    haunch = .046 * math.exp(-((y-1.27)/.53)**2) * math.exp(-((z-1.02)/.24)**2)
    shoulder = .022*max(0,1-abs(z-1.00)/.04)*min(1,max(0,(2.05-abs(y))/.35))
    lower = .016*max(0,1-abs(z-.60)/.04)*door
    v.co.x += math.copysign(side*(haunch+shoulder+lower),x)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(body.data)
bm.free()
body.data.update()

# Fit one continuous surface to the hatch, removing faceted highlight changes.
def features(x,y):
    t = y-1.25
    return [1,t,t*t,t**3,t**4,x*x,x*x*t,x*x*t*t,x**4]

samples, heights = [], []
for y in np.linspace(.72,1.80,28):
    for x in np.linspace(-.64,.64,17):
        hit,p,n,_ = body.ray_cast(Vector((float(x),float(y),3)),Vector((0,0,-1)))
        if hit:
            samples.append(features(x,y))
            heights.append(p.z)
coeff = np.linalg.lstsq(np.asarray(samples),np.asarray(heights),rcond=None)[0]
def hatch_height(x,y):
    return float(np.dot(features(x,y),coeff))

# The shell under the glass follows the same smooth surface.
for v in body.data.vertices:
    x,y,z = v.co
    if .66<y<1.86 and abs(x)<.73 and z>1.02:
        w = min(1,(y-.66)/.08,(1.86-y)/.08,max(0,(.73-abs(x))/.07))
        v.co.z = z*(1-w)+hatch_height(x,y)*w
body.data.update()
glass = bpy.data.objects['Cabin_Glass']
bm = bmesh.new()
bm.from_mesh(glass.data)
remaining = set(bm.verts)
islands = []
while remaining:
    seed = remaining.pop()
    island = {seed}
    queue = [seed]
    while queue:
        v = queue.pop()
        for edge in v.link_edges:
            other = edge.other_vert(v)
            if other in remaining:
                remaining.remove(other)
                island.add(other)
                queue.append(other)
    islands.append(island)
rear = max(islands,key=lambda island:sum(v.co.y for v in island)/len(island))
bmesh.ops.delete(bm,geom=list(rear),context='VERTS')
rows = []
for j in range(25):
    t = j/24
    y = .70+1.10*t
    width = .605+.055*t
    row = []
    for i in range(33):
        x = (i/32*2-1)*width
        row.append(bm.verts.new((x,y,hatch_height(x,y)+.019)))
    rows.append(row)
for j in range(24):
    for i in range(32):
        bm.faces.new((rows[j][i],rows[j+1][i],rows[j+1][i+1],rows[j][i+1]))
bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
bm.to_mesh(glass.data)
bm.free()
for poly in glass.data.polygons:
    poly.use_smooth = True

trim_mat = bpy.data.materials['Trim']
rim_mat = bpy.data.materials['Rim']
rim_shader = next(n for n in rim_mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
rim_shader.inputs['Base Color'].default_value = (.42,.46,.51,1)
rim_shader.inputs['Roughness'].default_value = .23
rim_mat.diffuse_color = (.42,.46,.51,1)

# Increase the existing five-spoke rim and ease the tyre bead out to meet it.
for name in ['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR']:
    ob = bpy.data.objects[name]
    rim_indices = {i for i,m in enumerate(ob.data.materials) if m==rim_mat}
    rim_vertices = {idx for p in ob.data.polygons if p.material_index in rim_indices for idx in p.vertices}
    for v in ob.data.vertices:
        radius = math.hypot(v.co.y,v.co.z)
        factor = 1.07 if v.index in rim_vertices else 1+.07*max(0,min(1,(.34-radius)/.075))
        v.co.y *= factor
        v.co.z *= factor

def mesh_object(name, vertices, faces, mat):
    me = bpy.data.meshes.new(name+'Mesh')
    me.from_pydata(vertices,[],faces)
    me.update()
    ob = bpy.data.objects.new(name,me)
    scene.collection.objects.link(ob)
    me.materials.append(mat)
    for p in me.polygons:p.use_smooth=True
    return ob

def box(name,location,size,mat,bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(mat)
    mod = ob.modifiers.new('Trim edge bevel','BEVEL')
    mod.width=bevel
    mod.segments=2
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

trim_parts = []
for side in [-1,1]:
    for wheel_y in [-1.35,1.34]:
        vertices,faces = [],[]
        for k in range(57):
            angle = -.40+(math.pi+.80)*k/56
            for radius in [.436,.481]:
                y=wheel_y+radius*math.cos(angle)
                z=.42+radius*math.sin(angle)
                x=side*(.947+.035*math.exp(-((y-1.27)/.53)**2))
                vertices.append((x,y,z))
        for k in range(56):
            a=2*k
            faces.append((a,a+1,a+3,a+2))
        trim_parts.append(mesh_object('ArchCladding',vertices,faces,trim_mat))
    trim_parts.append(box('SideSkirt',(side*.934,0,.285),(.065,1.83,.095),trim_mat))

# Existing band already joins the red strips: preserve it and the blank boot.
trim_parts.append(box('RearSkidPlate',(0,2.17,.281),(.86,.09,.065),rim_mat,.018))
if 'Trim' in bpy.data.objects:
    trim_parts.insert(0,bpy.data.objects['Trim'])
bpy.ops.object.select_all(action='DESELECT')
for ob in trim_parts:ob.select_set(True)
bpy.context.view_layer.objects.active=trim_parts[0]
bpy.ops.object.join()
trim_object=trim_parts[0]
trim_object.name='Trim'
cursor=scene.cursor.location.copy()
scene.cursor.location=(0,0,0)
bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
scene.cursor.location=cursor

# Thin rails follow the roof surface, with no crossbars or other accessories.
for side,label in [(-1,'L'),(1,'R')]:
    vertices,faces=[],[]
    for j in range(29):
        t=j/28
        y=-.43+1.43*t
        x=side*.52
        hit,p,n,_=body.ray_cast(Vector((x,y,3)),Vector((0,0,-1)))
        z=p.z+.022+.018*math.sin(math.pi*t)
        for k in range(8):
            angle=2*math.pi*k/8
            vertices.append((x+.014*math.cos(angle),y,z+.014*math.sin(angle)))
    for j in range(28):
        for k in range(8):faces.append((j*8+k,j*8+(k+1)%8,(j+1)*8+(k+1)%8,(j+1)*8+k))
    faces.extend([tuple(reversed(range(8))),tuple(28*8+k for k in range(8))])
    mesh_object('RoofRail_'+label,vertices,faces,trim_mat)

# Reposition the soft fill so it doesn't create a white sweep over the hatch.
fill=bpy.data.objects['Studio_Fill']
fill.location=(5,-1,4)
fill.rotation_euler=(Vector((0,0,1))-fill.location).to_track_quat('-Z','Y').to_euler()
fill.data.energy=230
scene.camera.location=(-6,7,3.0)
scene.camera.rotation_euler=(Vector((0,0,.87))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
bpy.context.view_layer.update()
total=0
for ob in scene.objects:
    if ob.type=='MESH' and not ob.name.startswith('Studio_'):
        ob.data.calc_loop_triangles()
        total+=len(ob.data.loop_triangles)
assert total<40000,total
assert original_names.issubset({o.name for o in scene.objects})
assert original_materials=={m.name for m in bpy.data.materials}
for name,origin in original_origins.items():
    if not name.startswith('Studio_'):assert tuple(bpy.data.objects[name].location)==origin,name
assert all(abs(a-b)<1e-5 for a,b in zip(length_before,vehicle_bounds()))
report={'triangles':total,'length_before':length_before[1]-length_before[0],
        'length_after':vehicle_bounds()[1]-vehicle_bounds()[0],
        'body_lift':min(v.co.z for v in body.data.vertices)-body_min_before,
        'body_origin':list(body.location),'added_objects':['Trim','RoofRail_L','RoofRail_R']}
for name in ['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR']:
    ob=bpy.data.objects[name]
    report[name+'_ground']=min((ob.matrix_world@v.co).z for v in ob.data.vertices)
print(json.dumps(report))
os.makedirs('C:/CAR/egal/assets/rear-refinement',exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath='C:/CAR/egal/assets/car-studio.blend')
