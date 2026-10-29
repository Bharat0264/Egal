"""Build physical front/rear assemblies on the current car, with transparent presentation."""
import bpy, bmesh, math, os, json
import numpy as np
from mathutils import Vector

scene=bpy.context.scene
body=bpy.data.objects['Body']
paint=bpy.data.materials['BodyPaint']
trim=bpy.data.materials['Trim']
rim=bpy.data.materials['Rim']
head=bpy.data.materials['Headlight']
tail=bpy.data.materials['Taillight']
counter=0

# Rebuild the old shell's self-intersecting micro-surfaces before manufacturing apertures.
if not body.get('production_shell_repaired'):
    bpy.ops.object.select_all(action='DESELECT')
    body.select_set(True);bpy.context.view_layer.objects.active=body
    remesh=body.modifiers.new('Watertight shell reconstruction','REMESH')
    modes=[item.identifier for item in remesh.bl_rna.properties['mode'].enum_items]
    remesh.mode=next(mode for mode in modes if mode=='VOXEL')
    remesh.voxel_size=.012
    remesh.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    body.data.calc_loop_triangles()
    simplify=body.modifiers.new('Curvature preserving shell budget','DECIMATE')
    simplify.ratio=min(1,24000/max(1,len(body.data.loop_triangles)))
    bpy.ops.object.modifier_apply(modifier=simplify.name)
    body['production_shell_repaired']=True

# Preserve lighting and cameras, while disabling every known environment mesh.
for name in ['Studio_Floor','RoadLine_0','RoadLine_1','Distant_Ridge','Sun_Disc','RoofRail_L','RoofRail_R']:
    ob=bpy.data.objects.get(name)
    if ob:ob.hide_render=True;ob.hide_set(True)
for ob in scene.objects:
    if ob.name.startswith('DoorSeam_'):ob.hide_render=True;ob.hide_set(True)
# Exterior overlay strips are replaced by the actual fender openings.
trim_object=bpy.data.objects.get('Trim')
if trim_object:
    bm=bmesh.new();bm.from_mesh(trim_object.data);remaining=set(bm.verts);remove=[]
    while remaining:
        seed=remaining.pop();island={seed};queue=[seed]
        while queue:
            vertex=queue.pop()
            for edge in vertex.link_edges:
                other=edge.other_vert(vertex)
                if other in remaining:remaining.remove(other);island.add(other);queue.append(other)
        cy=sum(v.co.y for v in island)/len(island)
        if len(island)>=100 and max(v.co.z for v in island)>.75 and (abs(cy+1.35)<.2 or abs(cy-1.34)<.2):remove.extend(island)
    if remove:bmesh.ops.delete(bm,geom=remove,context='VERTS')
    bm.to_mesh(trim_object.data);bm.free()
# Tiny collapsed Boolean edges in the previous shell must be repaired before new cuts.
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.00015)
bmesh.ops.dissolve_degenerate(bm,dist=.00015,edges=list(bm.edges))
bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
print('Body before apertures: nonmanifold edges',sum(not e.is_manifold for e in bm.edges),'volume',bm.calc_volume())
bm.to_mesh(body.data);bm.free()

def shader(mat):
    return next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')

def material(name,color,rough,metal=0,transmission=0):
    mat=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes=True
    p=shader(mat)
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=metal
    p.inputs['Transmission Weight'].default_value=transmission
    p.inputs['IOR'].default_value=1.46
    mat.diffuse_color=(*color,1)
    return mat

clear=material('LampLens_Clear',(.94,.97,1),.035,transmission=1)
redlens=material('LampLens_Red',(.48,.012,.018),.045,transmission=.8)
housing=material('LampHousing',(.008,.011,.016),.24)
exhaustmat=material('ExhaustMetal',(.22,.25,.29),.22,.95)

def active(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True)
    bpy.context.view_layer.objects.active=ob

def mesh(name,vertices,faces,materials):
    me=bpy.data.meshes.new(name+'Mesh')
    me.from_pydata(vertices,[],faces)
    me.update()
    for mat in materials:me.materials.append(mat)
    bm=bmesh.new();bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bm.to_mesh(me);bm.free()
    ob=bpy.data.objects.get(name)
    if ob:
        inv=ob.matrix_world.inverted()
        for v in me.vertices:v.co=inv@v.co
        ob.data=me
    else:
        ob=bpy.data.objects.new(name,me)
        scene.collection.objects.link(ob)
    ob.hide_render=False
    ob.hide_set(False)
    for p in me.polygons:p.use_smooth=True
    return ob

def temp(vertices,faces,materials):
    global counter
    counter+=1
    return mesh('_ISO_TMP_'+str(counter),vertices,faces,materials)

def bevel(ob,width=.004,segments=2):
    active(ob)
    mod=ob.modifiers.new('Manufactured edge radius','BEVEL')
    mod.width=width;mod.segments=segments
    mod.angle_limit=.6
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

def join(objects,name):
    active(objects[0])
    for ob in objects:ob.select_set(True)
    bpy.ops.object.join()
    ob=objects[0]
    old=bpy.data.objects.get(name)
    if old and old!=ob:
        old.data=ob.data.copy()
        bpy.data.objects.remove(ob,do_unlink=True)
        return old
    ob.name=name
    return ob

def box(name,location,size,mat,width=.008):
    x,y,z=location;a,b,c=[v/2 for v in size]
    vertices=[(x+sx*a,y+sy*b,z+sz*c) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    ob=mesh(name,vertices,faces,[mat]) if name else temp(vertices,faces,[mat])
    return bevel(ob,width)

def rounded_outline(points,steps=4,radius=.16):
    result=[]
    for k,p in enumerate(points):
        prev=points[(k-1)%len(points)];nxt=points[(k+1)%len(points)]
        a=[p[i]*(1-radius)+prev[i]*radius for i in range(2)]
        b=[p[i]*(1-radius)+nxt[i]*radius for i in range(2)]
        for j in range(steps):
            t=j/(steps-1)
            result.append(tuple((1-t)**2*a[i]+2*(1-t)*t*p[i]+t*t*b[i] for i in range(2)))
    return result

def prism(points,y0,y1):
    n=len(points)
    vs=[(x,y,z) for y in [y0,y1] for x,z in points]
    fs=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
    fs += [(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
    return temp(vs,fs,[trim])

def cut(target,cutter):
    active(target)
    saved=target.data.copy()
    old_size=target.dimensions.copy()
    mod=target.modifiers.new('Recessed assembly aperture','BOOLEAN')
    mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    bpy.context.view_layer.update()
    if len(target.data.vertices)<20 or any(target.dimensions[i]<old_size[i]*.70 for i in range(3)):
        target.data=saved
        raise RuntimeError('Rejected invalid aperture result on '+target.name)
    bpy.data.meshes.remove(saved)

def surface_solid(name,outline,surface,front,back,mat):
    n=len(outline)
    vs=[(x,surface(x,z)+depth,z) for depth in [front,back] for x,z in outline]
    fs=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
    fs += [(i,(i+1)%n,n+(i+1)%n,n+i) for i in range(n)]
    return bevel(mesh(name,vs,fs,[mat]),.002,2)

def surface_ring(name,outline,surface,front,back,mat,width=.90):
    cx=sum(x for x,z in outline)/len(outline)
    cz=sum(z for x,z in outline)/len(outline)
    n=len(outline);vs=[];fs=[]
    for depth,scale in [(front,1),(back,1),(back,width),(front,width)]:
        for x,z in outline:
            xx=cx+(x-cx)*scale;zz=cz+(z-cz)*scale
            vs.append((xx,surface(xx,zz)+depth,zz))
    for j in range(4):
        for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,((j+1)%4)*n+(i+1)%n,((j+1)%4)*n+i))
    return bevel(mesh(name,vs,fs,[mat]),.0018,2)

def mirror(source,name):
    me=source.data.copy()
    for v in me.vertices:v.co.x=-v.co.x
    bm=bmesh.new();bm.from_mesh(me)
    bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
    bm.to_mesh(me);bm.free()
    old=bpy.data.objects.get(name)
    if old:old.data=me;old.matrix_world=source.matrix_world.copy();old.hide_render=False;old.hide_set(False);return old
    ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob)
    return ob

def tube(name,points,radius,mat,segments=8):
    vs=[];fs=[]
    for i,p in enumerate(points):
        p=Vector(p)
        tangent=Vector(points[min(len(points)-1,i+1)])-Vector(points[max(0,i-1)])
        tangent.normalize();a=tangent.cross(Vector((0,1,0)))
        if a.length<.001:a=tangent.cross(Vector((1,0,0)))
        a.normalize();b=tangent.cross(a).normalized()
        for j in range(segments):
            t=j*2*math.pi/segments;vs.append(tuple(p+radius*(a*math.cos(t)+b*math.sin(t))))
    for i in range(len(points)-1):
        for j in range(segments):fs.append((i*segments+j,i*segments+(j+1)%segments,(i+1)*segments+(j+1)%segments,(i+1)*segments+j))
    fs.extend([tuple(reversed(range(segments))),tuple((len(points)-1)*segments+j for j in range(segments))])
    return mesh(name,vs,fs,[mat])

# Fit smooth, symmetric front curvature before opening the lamp and intake recesses.
samples=[];values=[]
def ff(x,z):return [1,x*x,x**4,z,z*z,x*x*z]
for x in np.linspace(-.96,.96,41):
    for z in np.linspace(.68,.85,12):
        hit,p,n,_=body.ray_cast(Vector((float(x),-3,float(z))),Vector((0,1,0)))
        if hit and p.y<-1.75:samples.append(ff(x,z));values.append(p.y)
coeff=np.linalg.lstsq(np.asarray(samples),np.asarray(values),rcond=None)[0]
def front_surface(x,z):return float(np.dot(ff(x,z),coeff))
def rear_surface(x,z):return 2.18-.16*(x/1.02)**4-.055*((z-.70)/.40)**2

# Hood: a subtle pair of shaped shoulders, rather than extra crease objects.
for v in body.data.vertices:
    x,y,z=v.co
    if -2.02<y<-.94 and z>.81 and abs(x)<.78:
        weight=math.sin(math.pi*(y+2.02)/1.08)**2
        v.co.z+=.010*math.exp(-((abs(x)-.43)/.10)**2)*weight
body.data.update()

# Integrated headlamp: recess, rear shell, LED guide, two optical projectors, thick clear lens.
front_shape=rounded_outline([(.43,.819),(.77,.836),(.943,.792),(.945,.722),(.78,.707),(.44,.747)],5,.16)
for side in [-1,1]:cut(body,prism([(side*x,z) for x,z in front_shape],-2.42,-1.83))
left=[(-x,z) for x,z in front_shape]
surface_solid('Headlamp_Back_L',left,front_surface,.016,.065,housing)
surface_ring('Headlamp_Frame_L',left,front_surface,-.007,.055,housing,.92)
surface_solid('Headlight_L',left,front_surface,-.012,-.004,clear)
guide=[(-x,front_surface(-x,z)+.001,z) for x,z in rounded_outline([(.465,.805),(.75,.818),(.915,.78),(.91,.743),(.79,.728)],5,.12)]
tube('Headlamp_LED_L',guide,.0037,head)
for k,x in enumerate([-.61,-.79]):
    z=.767 if k==0 else .769
    # Projectors face forward inside the housing, with visible metal bezel and clear optic.
    y=front_surface(x,z)+.018
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.024,depth=.022,location=(x,y,z),rotation=(math.pi/2,0,0))
    ob=bpy.context.object;ob.name='Headlamp_Projector_L'+str(k);ob.data.materials.append(rim)
    bevel(ob,.002,2)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=(x,y-.012,z))
    ob=bpy.context.object;ob.name='Headlamp_Optic_L'+str(k);ob.scale=(.019,.008,.019);active(ob)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);ob.data.materials.append(clear)
    for p in ob.data.polygons:p.use_smooth=True
for name in ['Headlamp_Back_L','Headlamp_Frame_L','Headlight_L','Headlamp_LED_L','Headlamp_Projector_L0','Headlamp_Projector_L1','Headlamp_Optic_L0','Headlamp_Optic_L1']:
    ob=bpy.data.objects[name]
    # Bake the few primitive transforms before reflecting across the car centre plane.
    active(ob);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    split=name.rfind('_L')
    mirror(ob,name[:split]+'_R'+name[split+2:])

# True front intake apertures, backed by recessed duct walls and restrained slats.
intake=rounded_outline([(-.55,.49),(-.43,.54),(.43,.54),(.55,.49),(.46,.30),(-.46,.30)],4,.14)
cut(body,prism(intake,-2.42,-1.83))
surface_solid('Grille',intake,lambda x,z:-2.04,0,.025,housing)
surface_ring('Front_Intake_Duct',intake,lambda x,z:-2.13,-.015,.10,trim,.92)
for i in range(5):box('Grille_Slat_'+str(i),(0,-2.153,.335+i*.038),(.91,.025,.012),trim,.003)
side_shape=rounded_outline([(.66,.52),(.86,.55),(.94,.46),(.90,.32),(.66,.32)],4,.2)
for side,label in [(-1,'L'),(1,'R')]:
    shape=[(side*x,z) for x,z in side_shape]
    cut(body,prism(shape,-2.4,-1.84))
    surface_solid('Front_Duct_Back_'+label,shape,lambda x,z:-1.99,0,.018,housing)
    surface_ring('Front_Duct_'+label,shape,lambda x,z:-2.10,-.005,.11,trim,.86)
    for i in range(3):box('Front_Duct_Vane_'+label+str(i),(side*.79,-2.12,.36+i*.052),(.19,.035,.009),trim,.003)

# Thin continuous splitter: follows the front curvature and has real thickness.
v=[];f=[]
for row in range(4):
    for i in range(49):
        x=-.94+1.88*i/48;y=-2.18+.21*(abs(x)/.94)**3
        y += .17 if row in [1,2] else 0
        z=.174 if row in [0,1] else .204
        v.append((x,y,z))
for j in range(4):
    for i in range(48):f.append((j*49+i,j*49+i+1,((j+1)%4)*49+i+1,((j+1)%4)*49+i))
f.extend([(0,49,98,147),(48,97,146,195)])
bevel(mesh('Bumper_Front',v,f,[trim]),.004)

# Rear lamp assemblies sit inside apertures, with thick red lenses over internal LED guides.
rear_shape=rounded_outline([(.27,.968),(.76,.966),(.973,.935),(.977,.869),(.80,.851),(.27,.861)],5,.15)
for side in [-1,1]:cut(body,prism([(side*x,z) for x,z in rear_shape],1.84,2.44))
left=[(-x,z) for x,z in rear_shape]
surface_solid('Taillamp_Back_L',left,rear_surface,-.060,-.048,housing)
surface_ring('Taillamp_Frame_L',left,rear_surface,-.048,.005,housing,.92)
surface_solid('Taillight_L',left,rear_surface,.006,.013,redlens)
led_path=rounded_outline([(.30,.951),(.75,.951),(.95,.925),(.947,.885),(.80,.869),(.30,.877)],5,.14)
guide=[(-x,rear_surface(-x,z)+.001,z) for x,z in led_path]
tube('Taillamp_LED_L',guide,.0035,tail)
# Small internal LED partitions, visible through the curved lens.
for i in range(5):
    x=-.44-.083*i
    box('Taillamp_Internal_L'+str(i),(x,rear_surface(x,.912)-.014,.912),(.010,.014,.038),rim,.002)
for name in ['Taillamp_Back_L','Taillamp_Frame_L','Taillight_L','Taillamp_LED_L']+['Taillamp_Internal_L'+str(i) for i in range(5)]:
    split=name.rfind('_L')
    mirror(bpy.data.objects[name],name[:split]+'_R'+name[split+2:])
# A low-profile connector follows exactly the same rear curvature.
band=[(-.966,.947),(.966,.947),(.966,.882),(-.966,.882)]
surface_solid('Boot_Band',band,rear_surface,-.004,.004,trim)

# Recessed, physically thick rear diffuser. It is one continuous closed part.
def lower(x):return .155+.034*(abs(x)/.94)**2
def upper(x):return .325+.185*max(0,1-(abs(x)/.94)**3)
v=[];f=[]
for depth in [.014,-.065]:
    for j in range(9):
        t=j/8
        for i in range(49):
            x=-.94+1.88*i/48;z=lower(x)+(upper(x)-lower(x))*t
            v.append((x,rear_surface(x,z)+depth,z))
n=49*9
for layer in range(2):
    for j in range(8):
        for i in range(48):
            a=layer*n+j*49+i;f.append((a,a+1,a+50,a+49))
for i in range(48):
    f.append((i,i+1,n+i+1,n+i))
    a=8*49+i;f.append((a,a+1,n+a+1,n+a))
for j in range(8):
    a=j*49;f.append((a,a+49,n+a+49,n+a))
    a=j*49+48;f.append((a,a+49,n+a+49,n+a))
diff=mesh('Bumper_Rear',v,f,[trim])
# Remove the underlying shell within the diffuser opening, avoiding overlapping skins.
outline=[]
for i in range(33):
    x=-.94+1.88*i/32;outline.append((x,upper(x)-.008))
for i in reversed(range(33)):
    x=-.94+1.88*i/32;outline.append((x,lower(x)+.004))
cut(body,prism(outline,1.82,2.40))

# Outlet rings have thickness, a dark cavity and a deep polished inner throat.
exhaust_shape=rounded_outline([(.555,.243),(.867,.243),(.903,.343),(.580,.343)],5,.24)
for side in [-1,1]:cut(diff,prism([(side*x,z) for x,z in exhaust_shape],1.80,2.40))
left=[(-x,z) for x,z in exhaust_shape]
surface_ring('Exhaust_L',left,rear_surface,.026,-.105,exhaustmat,.80)
surface_solid('Exhaust_Cavity_L',left,rear_surface,-.112,-.10,housing)
mirror(bpy.data.objects['Exhaust_L'],'Exhaust_R')
mirror(bpy.data.objects['Exhaust_Cavity_L'],'Exhaust_Cavity_R')
# Three shallow integrated diffuser strakes, touching and joined to the continuous part.
parts=[diff]
for x in [-.35,0,.35]:
    shape=[(2.00,.205),(2.21,.203),(2.20,.145),(2.04,.155)]
    vertices=[(x+dx,y,z) for dx in [-.010,.010] for y,z in shape]
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    parts.append(bevel(temp(vertices,faces,[trim]),.003))
join(parts,'Bumper_Rear')

# Attach a curved spoiler lip directly to the roof edge, without roof-mounted rods.
v=[];f=[]
profile=[(.525,1.414),(.545,1.442),(.73,1.451),(.79,1.436),(.775,1.421),(.58,1.411)]
for i in range(33):
    x=-.775+1.55*i/32;t=abs(x)/.775
    for y,z in profile:v.append((x,y-.028*t*t,z-.018*t*t))
for i in range(32):
    for j in range(6):f.append((i*6+j,i*6+(j+1)%6,(i+1)*6+(j+1)%6,(i+1)*6+j))
f.extend([tuple(reversed(range(6))),tuple(32*6+j for j in range(6))])
bevel(mesh('Roof_Spoiler',v,f,[trim]),.003)
box('Spoiler_BrakeLight',(0,.783,1.434),(.64,.009,.010),tail,.002)

# Smooth the real inner arch surfaces and remove loose geometry, without adding external arches.
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=.000002)
loose=[v for v in bm.verts if not v.link_faces]
if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
# Consolidate almost-coplanar construction cuts while retaining all material boundaries.
bmesh.ops.dissolve_limit(bm,angle_limit=.0012,use_dissolve_boundaries=False,
                         verts=list(bm.verts),edges=list(bm.edges),delimit={'MATERIAL'})
bm.to_mesh(body.data);bm.free();body.data.update()
for p in body.data.polygons:p.use_smooth=True

# Neutral automotive materials, with no emission on the exterior lens itself.
p=shader(paint);p.inputs['Base Color'].default_value=(.64,.67,.72,1);p.inputs['Metallic'].default_value=.78;p.inputs['Roughness'].default_value=.22;p.inputs['Coat Weight'].default_value=1;p.inputs['Coat Roughness'].default_value=.10
p=shader(bpy.data.materials['Glass']);p.inputs['Base Color'].default_value=(.012,.021,.033,1);p.inputs['Metallic'].default_value=0;p.inputs['Roughness'].default_value=.065;p.inputs['Transmission Weight'].default_value=.10;p.inputs['Specular IOR Level'].default_value=.5
p=shader(trim);p.inputs['Base Color'].default_value=(.012,.015,.020,1);p.inputs['Roughness'].default_value=.32
p=shader(head);p.inputs['Emission Color'].default_value=(1,.90,.74,1);p.inputs['Emission Strength'].default_value=2.0
p=shader(tail);p.inputs['Emission Color'].default_value=(1,.003,.007,1);p.inputs['Emission Strength'].default_value=1.8

# Film transparency preserves world illumination and reflection without a visible backdrop.
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
world=scene.world;nodes=world.node_tree.nodes;nodes.clear()
bg=nodes.new('ShaderNodeBackground');bg.inputs['Color'].default_value=(.34,.38,.44,1);bg.inputs['Strength'].default_value=.32
out=nodes.new('ShaderNodeOutputWorld');world.node_tree.links.new(bg.outputs[0],out.inputs[0])
for name,location,target,power,color,size in [
    ('Studio_Key',(-3,-4,5),(0,-.6,.8),950,(1,.95,.88),5),
    ('Studio_Rim',(4,1,3.5),(0,0,.9),1000,(.78,.87,1),4),
    ('Studio_Fill',(-4,4,3),(0,.6,.8),800,(1,.96,.90),4),
    ('Side_Reflection_Strip',(-3,0,3),(0,0,.8),600,(1,1,1),5)]:
    ob=bpy.data.objects[name];ob.hide_render=False;ob.hide_set(False)
    ob.location=location;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
    ob.data.energy=power;ob.data.color=color;ob.data.size=size
bpy.data.objects['GoldenSun'].hide_render=True

def camera(name,location,target,lens):
    ob=bpy.data.objects.get(name)
    if ob is None:
        ob=bpy.data.objects.new(name,bpy.data.cameras.new(name));scene.collection.objects.link(ob)
    ob.location=location;ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler();ob.data.lens=lens;ob.data.dof.use_dof=False
    return ob
camera('FRONT_CAMERA',(-4.6,-7.3,2.3),(0,-.25,.72),60)
camera('REAR_CAMERA',(-4.2,7.6,2.15),(0,.15,.75),60)
scene.camera=camera('HERO_CAMERA',(-4.8,7.2,2.25),(0,.15,.75),60)
scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.filepath='C:/CAR/egal/assets/isolated/rear-check.png'
bpy.context.view_layer.update()
print('Visible car objects:',[o.name for o in scene.objects if o.type=='MESH' and not o.hide_render])
bpy.ops.wm.save_as_mainfile(filepath='C:/CAR/egal/assets/car-studio.blend')
