import bpy,bmesh,math
from mathutils import Vector

scene=bpy.context.scene
body=bpy.data.objects['Body']

# Fit central exterior trim to the actual panel, with a small manufactured stand-off.
badge=bpy.data.objects['Badge']
hit,p,n,_=body.ray_cast(Vector((0,3,.78)),Vector((0,-1,0)))
target=p.y+.005
mean=sum(v.co.y for v in badge.data.vertices)/len(badge.data.vertices)
for v in badge.data.vertices:v.co.y+=target-mean
plate=bpy.data.objects['Plate_Recess']
for v in plate.data.vertices:v.co.z-=.06
target=2.18-.055*((.42-.70)/.4)**2+.022
mean=sum(v.co.y for v in plate.data.vertices)/len(plate.data.vertices)
for v in plate.data.vertices:v.co.y+=target-mean

# Keep the hatch seam below the lamps and seated directly on the stamped panel.
seam=bpy.data.objects['Hatch_Shutline']
for v in seam.data.vertices:
    if v.co.z>.695:v.co.z=.690+(v.co.z-.695)*.60
    hit,p,n,_=body.ray_cast(Vector((v.co.x,3,v.co.z)),Vector((0,-1,0)))
    if hit:v.co.y=p.y+.0018
bm=bmesh.new();bm.from_mesh(seam.data)
bmesh.ops.holes_fill(bm,edges=[e for e in bm.edges if e.is_boundary],sides=64)
bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(seam.data);bm.free()

# Real window thickness and closed rim barrel edges complete the manufacturing audit.
glass=bpy.data.objects['Cabin_Glass']
if not glass.get('has_glass_thickness'):
    bpy.ops.object.select_all(action='DESELECT');glass.select_set(True);bpy.context.view_layer.objects.active=glass
    mod=glass.modifiers.new('Automotive glass thickness','SOLIDIFY');mod.thickness=.0035;mod.offset=-.5;mod.use_even_offset=True
    bpy.ops.object.modifier_apply(modifier=mod.name);glass['has_glass_thickness']=True
for name in ['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR']:
    wheel=bpy.data.objects[name];bm=bmesh.new();bm.from_mesh(wheel.data)
    edges=[e for e in bm.edges if e.is_boundary]
    if edges:bmesh.ops.bridge_loops(bm,edges=edges,use_pairs=True)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(wheel.data);bm.free()

def mesh(name,vs,fs,mat):
    me=bpy.data.meshes.new(name+'Mesh');me.from_pydata(vs,[],fs);me.materials.append(mat);me.update()
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(me);bm.free()
    for f in me.polygons:f.use_smooth=True
    old=bpy.data.objects.get(name)
    if old:old.data=me;return old
    ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob);return ob

# Side extensions follow the real quarter panel and physically meet each rear lamp corner.
nu,nv=24,4
samples=[]
for j in range(nv+1):
    for i in range(nu+1):
        t=i/nu;y=1.73+.31*t;height=.010+.035*math.sin(math.pi*t/2)
        z=.910+(j/nv-.5)*height
        hit,p,n,_=body.ray_cast(Vector((-3,y,z)),Vector((1,0,0)))
        if not hit:raise RuntimeError('Quarter-panel projection failed')
        samples.append((p.x,y,z))

# Slots are cut into both rear quarters before the lens/casing is installed.
outline=[(1.725,.902),(2.055,.883),(2.055,.938),(1.725,.918)]
for side in [-1,1]:
    vs=[(side*x,y,z) for x in [.94,1.15] for y,z in outline]
    fs=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    cutter=mesh('_QuarterLampCutter',vs,fs,bpy.data.materials['Trim'])
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
    saved=body.data.copy();mod=body.modifiers.new('Integrated wraparound lamp seat','BOOLEAN');mod.object=cutter;mod.operation='DIFFERENCE';mod.solver='EXACT'
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    if len(body.data.vertices)<1000:body.data=saved;raise RuntimeError('Invalid quarter lamp cut')
    bpy.data.meshes.remove(saved)

def panel(name,offset1,offset2,mat):
    n=len(samples);vs=[];fs=[]
    for d in [offset1,offset2]:vs.extend((x-d,y,z) for x,y,z in samples)
    for layer in range(2):
        for j in range(nv):
            for i in range(nu):a=layer*n+j*(nu+1)+i;fs.append((a,a+1,a+nu+2,a+nu+1))
    for i in range(nu):
        fs.append((i,i+1,n+i+1,n+i));a=nv*(nu+1)+i;fs.append((a,a+1,n+a+1,n+a))
    for j in range(nv):
        a=j*(nu+1);fs.append((a,a+nu+1,n+a+nu+1,n+a));a=j*(nu+1)+nu;fs.append((a,a+nu+1,n+a+nu+1,n+a))
    return mesh(name,vs,fs,mat)

panel('Taillamp_Wrap_L',.003,.009,bpy.data.materials['LampLens_Red'])
panel('Taillamp_Wrap_Housing_L',-.030,.001,bpy.data.materials['LampHousing'])
vs=[];fs=[]
for i in range(nu+1):
    x,y,z=samples[2*(nu+1)+i]
    for k in range(8):
        a=2*math.pi*k/8;vs.append((x-.002-.0025*math.cos(a),y,.910+.0025*math.sin(a)))
for i in range(nu):
    for k in range(8):fs.append((i*8+k,i*8+(k+1)%8,(i+1)*8+(k+1)%8,(i+1)*8+k))
fs.extend([tuple(reversed(range(8))),tuple(nu*8+k for k in range(8))])
mesh('Taillamp_Wrap_LED_L',vs,fs,bpy.data.materials['Taillight'])
for name in ['Taillamp_Wrap_L','Taillamp_Wrap_Housing_L','Taillamp_Wrap_LED_L']:
    source=bpy.data.objects[name];me=source.data.copy()
    for v in me.vertices:v.co.x=-v.co.x
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    target=name[:-1]+'R';ob=bpy.data.objects.get(target)
    if ob:ob.data=me
    else:ob=bpy.data.objects.new(target,me);scene.collection.objects.link(ob)

# Separate panel normals from cavity-wall normals; do not blur geometry to mask issues.
bm=bmesh.new();bm.from_mesh(body.data)
for e in bm.edges:e.smooth=not(len(e.link_faces)==2 and e.calc_face_angle()>.55)
bm.to_mesh(body.data);bm.free()
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
mod=body.modifiers.new('Finished panel normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=70
bpy.ops.object.modifier_apply(modifier=mod.name)
scene.camera=bpy.data.objects['HERO_CAMERA']
bpy.ops.wm.save_as_mainfile(filepath='C:/CAR/egal/assets/car-studio.blend')
