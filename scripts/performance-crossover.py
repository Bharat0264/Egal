"""Rebuild the major surfaces of the existing in-house car in live Blender."""
import bpy, bmesh, math, os
from mathutils import Vector

scene=bpy.context.scene
paint=bpy.data.materials['BodyPaint']
glassmat=bpy.data.materials['Glass']
trim=bpy.data.materials['Trim']
rim=bpy.data.materials['Rim']
red=bpy.data.materials['Taillight']
white=bpy.data.materials['Headlight']

def mesh(name,vs,fs,materials):
    me=bpy.data.meshes.new(name+'Surface')
    me.from_pydata(vs,[],fs);me.update()
    for m in materials:me.materials.append(m)
    bm=bmesh.new();bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    bm.to_mesh(me);bm.free()
    for p in me.polygons:p.use_smooth=True
    persistent={'Body','Cabin_Glass','Boot_Band','Taillight_L','Taillight_R',
                'Bumper_Rear','Roof_Spoiler','Spoiler_BrakeLight','RoofRail_L',
                'RoofRail_R','Grille','Bumper_Front','Headlight_L','Headlight_R',
                'Mirror_L','Mirror_R','Badge','Plate_Recess'}
    old=bpy.data.objects.get(name) if name in persistent else None
    if old:
        # Mesh inputs use world coordinates; retain each existing object origin.
        inv=old.matrix_world.inverted()
        for v in me.vertices:v.co=inv@v.co
        old.data=me
        return old
    ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob)
    return ob

def active(ob):
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True);bpy.context.view_layer.objects.active=ob

def box(name,loc,size,mat,bevel=.018):
    x,y,z=loc;a,b,c=[s/2 for s in size]
    vs=[(x+sx*a,y+sy*b,z+sz*c) for sx,sy,sz in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
    fs=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
    ob=mesh(name,vs,fs,[mat]);active(ob)
    if bevel:
        mod=ob.modifiers.new('Controlled edge radius','BEVEL');mod.width=bevel;mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return ob

def join(objects,name):
    active(objects[0])
    for ob in objects:ob.select_set(True)
    bpy.ops.object.join();objects[0].name=name
    return objects[0]

# y, half-width, roof/bonnet height, shoulder height.
stations=[(-2.2,.72,.68,.60),(-2.15,.87,.79,.71),(-1.95,.96,.86,.79),
          (-1.65,.99,.88,.84),(-1.30,1.00,.92,.88),(-1.08,.99,.96,.90),
          (-.89,.98,1.09,.92),(-.64,.97,1.32,.94),(-.38,.96,1.445,.95),
          (-.10,.96,1.48,.96),(.25,.98,1.47,.98),(.58,1.005,1.425,1.00),
          (.86,1.025,1.35,1.015),(1.13,1.045,1.23,1.025),
          (1.40,1.04,1.095,1.015),(1.66,1.02,1.025,.995),
          (1.91,.99,.995,.965),(2.12,.94,.96,.91),(2.2,.82,.85,.79)]

def spline(y,column):
    i=next((k for k in range(len(stations)-1) if stations[k+1][0]>=y),len(stations)-2)
    i=max(0,i);y0=stations[i][0];y1=stations[i+1][0]
    t=max(0,min(1,(y-y0)/(y1-y0)))
    v0=stations[i][column];v1=stations[i+1][column]
    k0=max(0,i-1);k1=min(len(stations)-1,i+2)
    m0=(stations[i+1][column]-stations[k0][column])/(stations[i+1][0]-stations[k0][0])
    m1=(stations[k1][column]-stations[i][column])/(stations[k1][0]-stations[i][0])
    return (2*t**3-3*t*t+1)*v0+(t**3-2*t*t+t)*m0*(y1-y0)+(-2*t**3+3*t*t)*v1+(t**3-t*t)*m1*(y1-y0)

vs=[];fs=[]
ys=sorted(set([-2.2,-2.185,-2.16,2.16,2.185,2.2]+[-2.12+4.24*i/48 for i in range(49)]))
for y in ys:
    w=spline(y,1);h=spline(y,2);s=min(spline(y,3),h-.045)
    # Tightly supported shoulder and rocker, broad crown, compact greenhouse.
    half=[(0,.17),(.72*w,.17),(.94*w,.21),(.985*w,.32),(.994*w,.50),
          (.980*w,.59),(.968*w,.615),(.986*w,.65),(w,s-.07),
          (1.002*w,s-.025),(.992*w,s),(.945*w,s+.025),
          (.84*w,s+(h-s)*.61),(.73*w,h-.027),(.51*w,h-.004),(0,h)]
    ring=half+[(-x,z) for x,z in reversed(half[1:-1])]
    vs.extend((x,y,z) for x,z in ring)
n=len(ring)
for j in range(len(ys)-1):
    for i in range(n):fs.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
fs+=[tuple(reversed(range(n))),tuple((len(ys)-1)*n+i for i in range(n))]
body=mesh('Body',vs,fs,[paint,trim]);active(body)
sub=body.modifiers.new('Smooth primary automotive surfaces','SUBSURF');sub.levels=1
bpy.ops.object.modifier_apply(modifier=sub.name)
# Arches fit larger tyres tightly; cut the actual shell and assign dark inner liners.
for y in [-1.35,1.34]:
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.434,depth=3,location=(0,y,.402),rotation=(0,math.pi/2,0))
    cutter=bpy.context.object;cutter.data.materials.append(trim)
    active(body)
    mod=body.modifiers.new('Integrated wheel opening','BOOLEAN');mod.object=cutter;mod.operation='DIFFERENCE';mod.solver='EXACT'
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
active(body)
bev=body.modifiers.new('Wheel opening edge radius','BEVEL');bev.width=.008;bev.segments=2;bev.angle_limit=.65
bpy.ops.object.modifier_apply(modifier=bev.name)
body.data.update()
for p in body.data.polygons:
    p.use_smooth=True
    for y in [-1.35,1.34]:
        if abs(math.hypot(p.center.y-y,p.center.z-.402)-.434)<.018 and abs(p.normal.x)<.75:
            p.material_index=1

def ray_top(x,y):
    hit,p,n,_=body.ray_cast(Vector((x,y,3)),Vector((0,0,-1)))
    if not hit:raise RuntimeError(('Top projection',x,y))
    return p+n*.012

def patch(name,fn,nu,nv,material):
    vertices=[fn(i/nu,j/nv) for j in range(nv+1) for i in range(nu+1)]
    faces=[]
    for j in range(nv):
        for i in range(nu):a=j*(nu+1)+i;faces.append((a,a+1,a+nu+2,a+nu+1))
    return mesh(name,vertices,faces,[material])

windows=[patch('Glass_Front',lambda u,v:ray_top((2*u-1)*(.69-.035*v),-1.005+.64*v),28,16,glassmat),
         patch('Glass_Hatch',lambda u,v:ray_top((2*u-1)*(.70+.055*v),.59+.98*v),32,24,glassmat)]
for side in [-1,1]:
    def side_glass(u,v,side=side):
        y=-.70+2.02*u;h=spline(y,2);s=spline(y,3)
        lower=s+.045;upper=h-.075
        taper=min(1,.32+u*6,.30+(1-u)*6)
        z=lower+max(0,upper-lower)*v*taper
        hit,p,n,_=body.ray_cast(Vector((side*3,y,z)),Vector((-side,0,0)))
        if not hit:raise RuntimeError(('Side projection',y,z))
        return p+n*.014
    windows.append(patch('Glass_Side',side_glass,40,12,glassmat))
old=bpy.data.objects['Cabin_Glass']
temp=join(windows,'GlassAssembly');old.data=temp.data.copy();bpy.data.objects.remove(temp,do_unlink=True)

def back(x,z,offset=.02):
    hit,p,n,_=body.ray_cast(Vector((x,3,z)),Vector((0,-1,0)))
    if not hit or p.y<1.65:
        p=Vector((x,2.13-.20*(abs(x)/1.02)**3,z))
        n=Vector((0,1,0))
    return p+n*offset

# Rear lighting: wide smoked housings and thin upper/lower red LED signatures.
band=patch('Boot_Band',lambda u,v:back((2*u-1)*.966,.845+.155*v,.022),64,5,trim)
for side,label in [(-1,'L'),(1,'R')]:
    vertices=[];faces=[]
    # Two long converging LED blades, joined at the outer corner.
    for which in [0,1]:
        for i in range(33):
            t=i/32;x=side*(.29+.65*t)
            z=(.955-.025*t*t) if which==0 else (.865+.034*t*t)
            for dz in [-.007,.007]:vertices.append(back(x,z+dz,.036))
        offset=which*66
        for i in range(32):a=offset+2*i;faces.append((a,a+1,a+3,a+2))
    for i in range(8):
        t=i/7;x=side*(.94+.012*math.sin(math.pi*t));z=.930-(.930-.899)*t
        for dx in [-.006,.006]:vertices.append(back(x+dx,z,.036))
    for i in range(7):a=132+i*2;faces.append((a,a+1,a+3,a+2))
    # Side extension wraps each LED forward around the quarter panel.
    start=len(vertices)
    for i in range(17):
        y=1.67+.40*i/16
        for dz in [-.007,.007]:
            hit,p,n,_=body.ray_cast(Vector((side*3,y,.921+dz)),Vector((-side,0,0)))
            vertices.append(p+n*.025)
    for i in range(16):a=start+i*2;faces.append((a,a+1,a+3,a+2))
    mesh('Taillight_'+label,vertices,faces,[red])

# Sculpted wide lower bumper and recessed diffuser, keeping larger exhaust openings.
vertices=[];faces=[]
for j in range(13):
    t=j/12
    for i in range(65):
        x=-.99+1.98*i/64
        top=.57+.115*(abs(x)/.99)**2
        z=.20+(top-.20)*t
        p=back(x,z,.028)
        # A controlled recess through the central diffuser creates a clear shadow break.
        p.y+=.025*math.sin(math.pi*t)*math.exp(-(x/.70)**8)
        vertices.append(p)
for j in range(12):
    for i in range(64):a=j*65+i;faces.append((a,a+1,a+66,a+65))
bumper=mesh('Bumper_Rear',vertices,faces,[trim])
parts=[bumper]
for x in [-.46,-.23,0,.23,.46]:
    parts.append(box('DiffuserFin',(x,2.11,.205),(.026,.30,.13),trim,.006))
for side in [-1,1]:
    cx=side*.745
    outline=[(-.168,-.061),(.145,-.061),(.182,.052),(-.14,.052)]
    v=[];f=[]
    for depth,scale in [(0,1),(-.052,1),(-.052,.80),(0,.80)]:
        for x,z in outline:
            p=back(cx+x*scale,.30+z*scale,.055);p.y+=depth;v.append(p)
    for j in range(4):
        for i in range(4):f.append((j*4+i,j*4+(i+1)%4,((j+1)%4)*4+(i+1)%4,((j+1)%4)*4+i))
    parts.append(mesh('ExhaustOutlet',v,f,[rim]))
join(parts,'Bumper_Rear')
# Plain premium badge and blank rear number-plate recess; no brand marks or text.
p=back(0,.78,.027)
box('Badge',p,(.105,.018,.035),rim,.015)
p=back(0,.48,.046)
box('Plate_Recess',p,(.59,.025,.145),trim,.018)

# Spoiler becomes wider and sits directly over the compact rear glazing.
box('Roof_Spoiler',(0,.645,1.437),(1.55,.23,.045),trim,.018)
box('Spoiler_BrakeLight',(0,.768,1.434),(.71,.014,.013),red,.004)

# Tight black arch lips, rocker extensions, discreet low rails and a silver skid lip.
trims=[]
for side in [-1,1]:
    for wy in [-1.35,1.34]:
        v=[];f=[]
        for i in range(57):
            a=-.48+(math.pi+.96)*i/56
            for radius in [.434,.458]:
                y=wy+radius*math.cos(a);z=.402+radius*math.sin(a)
                x=side*(spline(max(-2.19,min(2.19,y)),1)+.009)
                v.append((x,y,z))
        for i in range(56):a=2*i;f.append((a,a+1,a+3,a+2))
        trims.append(mesh('ArchLip',v,f,[trim]))
    trims.append(box('Rocker',(side*.98,0,.205),(.075,1.83,.09),trim,.012))
trims.append(box('SkidLip',(0,2.13,.19),(.85,.11,.034),rim,.01))
old=bpy.data.objects['Trim'];tmp=join(trims,'TrimNew');old.data=tmp.data.copy();bpy.data.objects.remove(tmp,do_unlink=True)
for side,label in [(-1,'L'),(1,'R')]:
    v=[];f=[]
    for j in range(25):
        y=-.37+1.0*j/24;p=ray_top(side*.53,y)
        for i in range(8):
            a=2*math.pi*i/8;v.append((p.x+.008*math.cos(a),y,p.z+.011+.008*math.sin(a)))
    for j in range(24):
        for i in range(8):f.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
    mesh('RoofRail_'+label,v,f,[trim])

# 0.8 m tyres, wider tread and track, without lifting the tyres from the asphalt.
for suffix in ['FL','FR','RL','RR']:
    wheel=bpy.data.objects['Wheel_'+suffix]
    for v in wheel.data.vertices:
        v.co.x*=1.16;v.co.y*=.40/.36;v.co.z*=.40/.36
    side=-1 if suffix.endswith('L') else 1
    hub=(side*.94,-1.35 if suffix.startswith('F') else 1.34,.40)
    if wheel.parent:wheel.parent.location=hub;wheel.location=(0,0,0)
    else:wheel.location=hub

# Front parts follow the lower bonnet and wider body.
box('Grille',(0,-2.165,.49),(1.30,.06,.22),trim,.035)
box('Bumper_Front',(0,-2.10,.245),(1.83,.13,.15),trim,.04)
for side,label in [(-1,'L'),(1,'R')]:
    lamp=box('Headlight_'+label,(side*.68,-2.09,.77),(.43,.075,.034),white,.012)
    box('Mirror_'+label,(side*.99,-.66,1.03),(.19,.23,.10),trim,.035)

def shader(mat):return next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
p=shader(paint);p.inputs['Base Color'].default_value=(.67,.70,.75,1);p.inputs['Metallic'].default_value=.85;p.inputs['Roughness'].default_value=.20;p.inputs['Coat Weight'].default_value=1;p.inputs['Coat Roughness'].default_value=.10
p=shader(glassmat);p.inputs['Base Color'].default_value=(.0016,.003,.006,1);p.inputs['Roughness'].default_value=.075;p.inputs['Specular IOR Level'].default_value=.30
p=shader(trim);p.inputs['Base Color'].default_value=(.012,.015,.019,1);p.inputs['Roughness'].default_value=.36
p=shader(rim);p.inputs['Base Color'].default_value=(.33,.36,.40,1);p.inputs['Roughness'].default_value=.22
p=shader(red);p.inputs['Base Color'].default_value=(.55,.003,.008,1);p.inputs['Emission Color'].default_value=(1,.001,.003,1);p.inputs['Emission Strength'].default_value=3

bpy.context.view_layer.update()
active(body)
os.makedirs('C:/CAR/egal/assets/performance',exist_ok=True)
total=0
for ob in scene.objects:
    if ob.type=='MESH' and not ob.name.startswith('Studio_'):
        ob.data.calc_loop_triangles();total+=len(ob.data.loop_triangles)
print('Vehicle triangles:',total)
print('Body dimensions:',tuple(body.dimensions))
print('Body origin:',tuple(body.location))
bpy.ops.wm.save_as_mainfile(filepath='C:/CAR/egal/assets/car-studio.blend')
