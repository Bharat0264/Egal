import bpy, math, bmesh, os, json
from mathutils import Vector

scene = bpy.context.scene
body = bpy.data.objects['Body']

def material(name, color, metal=0, rough=.4, emission=0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = (*color, 1)
    p = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    p.inputs['Emission Color'].default_value = (*color, 1)
    p.inputs['Emission Strength'].default_value = emission
    return m

paint = material('BodyPaint', (.48,.53,.58), .6, .3)
body.data.materials.clear()
body.data.materials.append(paint)
glass = material('Glass', (.012,.02,.035), .3, .08)
tire = material('Tire', (.014,.016,.019), 0, .9)
rim = material('Rim', (.25,.29,.33), .9, .25)
trim = material('Trim', (.025,.03,.036), 0, .6)
head = material('Headlight', (1,.83,.56), 0, .2, 3)
tail = material('Taillight', (.85,.008,.014), 0, .25, 3)

def mesh_object(name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name+'Mesh')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    ob = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(ob)
    mesh.materials.append(mat)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    return ob

def box(name, location, size, mat, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat)
    if bevel:
        mod = ob.modifiers.new('Soft edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

def join(objects, name, origin=(0,0,0)):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    ob = objects[0]
    ob.name = name
    cursor = scene.cursor.location.copy()
    scene.cursor.location = origin
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    scene.cursor.location = cursor
    return ob

def top(x,y):
    hit,p,n,_ = body.ray_cast(Vector((x,y,3)), Vector((0,0,-1)))
    if not hit:
        raise RuntimeError('Glass projection missed Body')
    return p+n*.018

def patch(name, function, nu, nv, mat):
    vertices = [function(i/nu,j/nv) for j in range(nv+1) for i in range(nu+1)]
    faces = []
    for j in range(nv):
        for i in range(nu):
            a = j*(nu+1)+i
            faces.append((a,a+1,a+nu+2,a+nu+1))
    return mesh_object(name,vertices,faces,mat)

glass_parts = [
    patch('Windscreen',lambda u,v:top((u*2-1)*(.64+.07*(1-v)),-1.02+.50*v),24,18,glass),
    patch('RearGlass',lambda u,v:top((u*2-1)*(.61+.08*v),.73+.86*v),30,24,glass)
]
for side in [-1,1]:
    def side_window(u,v,side=side):
        y = -.81+2.15*u
        roof = top(0,y).z
        z = .974+(roof-.974-.075)*v*min(1,.38+u*5,.38+(1-u)*5)
        hit,p,n,_ = body.ray_cast(Vector((side*3,y,z)), Vector((-side,0,0)))
        if not hit:
            raise RuntimeError('Side glass projection missed Body')
        return p+n*.018
    glass_parts.append(patch('SideWindow',side_window,40,14,glass))
join(glass_parts,'Cabin_Glass')

for suffix,x,y in [('FL',-.84,-1.35),('FR',.84,-1.35),('RL',-.84,1.34),('RR',.84,1.34)]:
    side = 1 if x>0 else -1
    hub = Vector((x,y,.36))
    vertices,faces = [],[]
    profile = [(-.12,.265),(-.125,.30),(-.105,.346),(-.075,.36),(.075,.36),(.105,.346),(.125,.30),(.12,.265)]
    for axial,radius in profile:
        for k in range(40):
            t = 2*math.pi*k/40
            vertices.append(tuple(hub+Vector((axial,radius*math.sin(t),radius*math.cos(t)))))
    for j in range(len(profile)):
        for k in range(40):
            faces.append((j*40+k,j*40+(k+1)%40,((j+1)%len(profile))*40+(k+1)%40,((j+1)%len(profile))*40+k))
    parts = [mesh_object('Tyre',vertices,faces,tire)]
    vertices,faces = [],[]
    for axial,radius in [(side*.11,.267),(side*.125,.267),(side*.125,.242),(side*.085,.232)]:
        for k in range(40):
            t = 2*math.pi*k/40
            vertices.append(tuple(hub+Vector((axial,radius*math.sin(t),radius*math.cos(t)))))
    for j in range(3):
        for k in range(40):
            faces.append((j*40+k,j*40+(k+1)%40,(j+1)*40+(k+1)%40,(j+1)*40+k))
    parts.append(mesh_object('RimBarrel',vertices,faces,rim))
    for k in range(5):
        t = k*2*math.pi/5
        spoke = box('Spoke',hub+Vector((side*.09,.135*math.sin(t),.135*math.cos(t))),(.048,.047,.222),rim,.012)
        spoke.rotation_euler.x = -t
        parts.append(spoke)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.067,depth=.055,location=hub+Vector((side*.103,0,0)),rotation=(0,math.pi/2,0))
    cap = bpy.context.object
    cap.data.materials.append(rim)
    parts.append(cap)
    wheel = join(parts,'Wheel_'+suffix,hub)
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    if suffix.startswith('F'):
        pivot = bpy.data.objects.new('SteerPivot_'+suffix,None)
        scene.collection.objects.link(pivot)
        pivot.location = hub
        pivot.empty_display_size = .13
        wheel.parent = pivot
        wheel.location = (0,0,0)

box('Grille',(0,-2.175,.50),(1.14,.075,.22),trim,.045)
box('Bumper_Front',(0,-2.13,.285),(1.62,.13,.18),trim,.045)
rear = [box('Bumper_Rear',(0,2.13,.34),(1.55,.17,.25),trim,.07),box('Diffuser',(0,2.16,.23),(1.08,.12,.10),trim,.025)]
for x in [-.58,.58]:
    for dx,dz,width,height in [(0,.038,.21,.018),(0,-.038,.21,.018),(-.096,0,.018,.075),(.096,0,.018,.075)]:
        rear.append(box('ExhaustWall',(x+dx,2.218,.285+dz),(width,.045,height),rim,.006))
join(rear,'Bumper_Rear')

def rear_surface(x,y,z,axis):
    if axis=='rear':
        hit,p,n,_ = body.ray_cast(Vector((x,3,z)),Vector((0,-1,0)))
    else:
        hit,p,n,_ = body.ray_cast(Vector((math.copysign(3,x),y,z)),Vector((-math.copysign(1,x),0,0)))
    if not hit:
        raise RuntimeError('Rear strip projection missed Body')
    return p+n*.014

path = [(-.86,1.72,'side'),(-.88,1.90,'side'),(-.79,0,'rear'),(-.65,0,'rear'),(-.4,0,'rear'),(0,0,'rear'),(.4,0,'rear'),(.65,0,'rear'),(.79,0,'rear'),(.88,1.90,'side'),(.86,1.72,'side')]
def strip(name,points,z,height,mat,offset=0):
    dense = []
    for index in range(len(points)-1):
        x,y,axis = points[index]
        nx,ny,na = points[index+1]
        if axis == na:
            for k in range(8):
                t = k/8
                dense.append((x+(nx-x)*t,y+(ny-y)*t,axis))
        else:
            dense.append((x,y,axis))
    dense.append(points[-1])
    points = dense
    vertices = []
    for x,y,axis in points:
        for zz in [z-height/2,z+height/2]:
            p = rear_surface(x,y,zz,axis)
            p.y += offset
            vertices.append(p)
    return mesh_object(name,vertices,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(points)-1)],mat)

strip('Boot_Band',path,.79,.105,trim)
strip('Taillight_L',path[:5],.81,.027,tail,.006)
strip('Taillight_R',path[6:],.81,.027,tail,.006)
for side,label in [(-1,'L'),(1,'R')]:
    lamp = box('Headlight_'+label,(side*.59,-2.10,.795),(.40,.085,.055),head,.02)
    lamp.rotation_euler.z = side*.10
    box('Mirror_'+label,(side*.927,-.67,1.065),(.19,.24,.12),trim,.045)
box('Roof_Spoiler',(0,.79,1.505),(1.26,.18,.055),trim,.02)
box('Spoiler_BrakeLight',(0,.885,1.505),(.60,.012,.014),tail,.004)

bpy.context.view_layer.update()
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
bpy.context.view_layer.objects.active = body
total = 0
for ob in scene.objects:
    if ob.type=='MESH':
        ob.data.calc_loop_triangles()
        total += len(ob.data.loop_triangles)
        for polygon in ob.data.polygons:
            polygon.use_smooth = True
assert total < 40000, total
print('Total triangles:',total)
print('Objects:',[ob.name for ob in scene.objects])
for name in ['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR']:
    ob = bpy.data.objects[name]
    z = min((ob.matrix_world@v.co).z for v in ob.data.vertices)
    print(name,'ground:',round(z,6),'hub:',tuple(round(v,3) for v in ob.matrix_world.translation),'parent:',ob.parent.name if ob.parent else None)
os.makedirs('C:/CAR/egal/assets/car-parts',exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath='C:/CAR/egal/assets/car-parts.blend')
