"""Reference refinement and studio preview, executed through live Blender MCP."""
import bpy,bmesh,math,os,json
from mathutils import Vector
ROOT='C:/CAR/egal'
helpers={ 'STAGE':'helpers' };exec(compile(open(ROOT+'/scripts/build-suv.py').read(),'build-suv.py','exec'),helpers)
active,apply,box,join,mesh,rod,material=[helpers[n] for n in ['active','apply','box','join','mesh','rod','material']]
def delete(name):
    ob=bpy.data.objects.get(name)
    if ob:bpy.data.objects.remove(ob,do_unlink=True)
def tri_count():
    count=0
    for ob in bpy.context.scene.objects:
        if ob.type=='MESH' and not ob.name.startswith('Studio'):
            ob.data.calc_loop_triangles();count+=len(ob.data.loop_triangles)
    return count
def clean(ob):
    bm=bmesh.new();bm.from_mesh(ob.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(ob.data);bm.free()
def bevel(ob,width=.02,segments=3):
    active(ob);m=ob.modifiers.new('Applied soft edges','BEVEL');m.width=width;m.segments=segments;apply(ob)
def aim(ob,point):ob.rotation_euler=(Vector(point)-ob.location).to_track_quat('-Z','Y').to_euler()
def surface_z(x,y):
    ob=bpy.data.objects['Body'];hit,p,n,_=ob.ray_cast(Vector((x,y,3)),Vector((0,0,-1)))
    if not hit:raise ValueError(('No body under glass',x,y))
    return p.z
def rear_y(x,z):
    hit,p,n,_=bpy.data.objects['Body'].ray_cast(Vector((x,4,z)),Vector((0,-1,0)))
    if not hit:raise ValueError(('Rear surface miss',x,z))
    return p.y
def topglass(name,y0,y1,w0,w1):
    vs=[];fs=[];nu=12;nv=8
    for j in range(nv+1):
        t=j/nv;y=y0+(y1-y0)*t;w=w0+(w1-w0)*t
        for i in range(nu+1):
            x=(i/nu*2-1)*w;vs.append((x,y,surface_z(x,y)+.008))
    for j in range(nv):
        for i in range(nu):
            a=j*(nu+1)+i;fs.append((a,a+1,a+nu+2,a+nu+1))
    ob=mesh(name,vs,fs,'Glass');clean(ob);return ob
if STAGE=='body':
    delete('Body');delete('Cabin_Glass')
    # Quad loft: y, half width, shoulder height, roof height, roof half width.
    rings=[(-2.2,.70,.53,.76,.53),(-2.17,.77,.57,.83,.59),(-2.05,.88,.69,.92,.66),(-1.65,.925,.80,.99,.70),(-1.13,.925,.86,1.04,.71),(-.97,.925,.90,1.15,.71),(-.56,.92,.96,1.54,.68),(-.30,.92,.98,1.58,.67),(.10,.925,.98,1.59,.67),(.48,.925,.98,1.53,.68),(.85,.92,.98,1.39,.70),(1.25,.91,.96,1.22,.73),(1.66,.90,.91,1.07,.77),(2.00,.86,.83,1.00,.76),(2.16,.77,.70,.93,.69),(2.20,.72,.62,.84,.65)]
    vertices=[]
    for y,w,b,h,r in rings:
        b=min(b,h-.14)
        half=[(0,.30),(.65*w,.30),(.94*w,.34),(w,.57),(.995*w,b-.03),(.96*w,b+.045),(r,h-.065),(.78*r,h+.01),(0,h+.025)]
        loop=half+[(-x,z) for x,z in half[-2:0:-1]]
        vertices.extend([(x,y,z) for x,z in loop])
    n=len(loop);faces=[tuple(range(n-1,-1,-1)),tuple(range((len(rings)-1)*n,len(rings)*n))]
    for j in range(len(rings)-1):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    body=mesh('Body',vertices,faces,'BodyPaint');clean(body)
    active(body);s=body.modifiers.new('Curved quad shell','SUBSURF');s.levels=2;apply(body)
    for y in [-1.35,1.32]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.425,depth=2.5,location=(0,y,.37),rotation=(0,math.pi/2,0));c=bpy.context.object;apply(c)
        active(body);m=body.modifiers.new('Open wheel arch','BOOLEAN');m.operation='DIFFERENCE';m.object=c;apply(body);bpy.data.objects.remove(c,do_unlink=True)
    bevel(body,.012,2);clean(body)
    for p in body.data.polygons:p.use_smooth=True
    active(body);m=body.modifiers.new('Balanced normals','WEIGHTED_NORMAL');m.keep_sharp=True;apply(body)
    body.data.calc_loop_triangles();assert len(body.data.loop_triangles)<20000
    print('Body triangles',len(body.data.loop_triangles),'dimensions',tuple(body.dimensions))
elif STAGE=='parts':
    for n in ['Cabin_Glass','Headlight_L','Headlight_R','Taillight_L','Taillight_R','Grille','Bumper_Front','Bumper_Rear','Trim','Mirror_L','Mirror_R','Roof_Spoiler','Spoiler_BrakeLight','Boot_Band']:delete(n)
    windows=[topglass('windscreen',-1.01,-.51,.62,.58),topglass('rear window',.54,1.68,.59,.67)]
    # Side windows are fitted directly to the smoothed shell with horizontal rays.
    for sign in [-1,1]:
        for start,end in [(-.92,-.03),(.045,1.47)]:
            vs=[];fs=[];nu=14;nv=5
            for j in range(nv+1):
                t=j/nv
                for i in range(nu+1):
                    u=i/nu;y=start+(end-start)*u
                    top=surface_z(.0,y)-.105;low=.995
                    # The front/rear edges sweep down into the belt line.
                    if start<0: top-=.14*(1-u)**4
                    else: top-=.04*u**3
                    z=low+(max(top,low+.025)-low)*t
                    body=bpy.data.objects['Body'];hit,p,normal,_=body.ray_cast(Vector((sign*2,y,z)),Vector((-sign,0,0)))
                    if not hit:raise ValueError(('Sideglass miss',y,z))
                    vs.append((p.x+sign*.007,y,z))
            for j in range(nv):
                for i in range(nu):
                    a=j*(nu+1)+i;fs.append((a,a+1,a+nu+2,a+nu+1))
            windows.append(mesh('side window',vs,fs,'Glass'))
    glass=join(windows,'Cabin_Glass',(0,0,0));clean(glass)
    for p in glass.data.polygons:p.use_smooth=True
    # Headlights and tail strips turn around the corners rather than floating boxes.
    for suffix,sign in [('L',1),('R',-1)]:
        vs=[];fs=[]
        for i in range(17):
            x=sign*(.30+.41*i/16)
            for z in [.745,.795]:
                hit,p,normal,_=bpy.data.objects['Body'].ray_cast(Vector((x,-4,z)),Vector((0,1,0)))
                vs.append((x,p.y-.012,z))
        for i in range(16):fs.append((i*2,i*2+2,i*2+3,i*2+1))
        hl=mesh('Headlight_'+suffix,vs,fs,'Headlight');clean(hl)
        pts=[(sign*x,rear_y(sign*x,.87)+.055,.87) for x in [.18,.4,.6,.75,.81]]
        for y in [1.95,1.8,1.68]:
            hit,p,normal,_=bpy.data.objects['Body'].ray_cast(Vector((sign*2,y,.88)),Vector((-sign,0,0)))
            pts.append((p.x+sign*.012,y,.88))
        pieces=[]
        for a,b in zip(pts,pts[1:]):pieces.append(rod('led',a,b,.018,'Taillight'))
        tail=join(pieces,'Taillight_'+suffix);bevel(tail,.005,2)
        box('Mirror_'+suffix,(sign*.963,-.72,1.10),(.18,.24,.12),'Trim',.04)
    vs=[];fs=[]
    for i in range(49):
        x=(i/48*2-1)*.79
        for j in range(7):
            z=.79+.135*j/6;vs.append((x,rear_y(x,z)+.028,z))
    for i in range(48):
        for j in range(6):
            a=i*7+j;fs.append((a,a+7,a+8,a+1))
    band=mesh('Boot_Band',vs,fs,'Trim');clean(band)
    # Flat undecorated badge landing integrated into the band.
    box('Grille',(0,-2.156,.595),(1.05,.065,.18),'Trim',.035)
    box('Bumper_Front',(0,-2.095,.36),(1.62,.15,.14),'Trim',.045)
    rearparts=[box('rear bumper',(0,2.16,.44),(1.65,.25,.29),'Trim',.10),box('lower diffuser',(0,2.23,.285),(1.22,.24,.10),'Trim',.025)]
    for sign in [-1,1]:
        # Four bars form a genuinely open rectangular exhaust tip.
        cx=sign*.64;cy=2.30;cz=.32
        for z in [cz-.055,cz+.055]:rearparts.append(box('tip edge',(cx,cy,z),(.26,.12,.018),'Rim',.007))
        for x in [cx-.12,cx+.12]:rearparts.append(box('tip edge',(x,cy,cz),(.018,.12,.10),'Rim',.007))
        rearparts.append(box('tip interior',(cx,cy-.065,cz),(.22,.012,.085),'Trim',.004))
    rear=join(rearparts,'Bumper_Rear')
    for p in rear.data.polygons:p.use_smooth=True
    active(rear);m=rear.modifiers.new('Bumper face normals','WEIGHTED_NORMAL');m.keep_sharp=True;apply(rear)
    # Lip follows the rear roof; its brake light is a separate emissive surface.
    vs=[];fs=[]
    for i in range(17):
        x=(i/16*2-1)*.64
        for y,zoff in [(.51,.015),(.72,.055),(.72,.025),(.51,-.01)]:vs.append((x,y,surface_z(x,.58)+zoff))
    for i in range(16):
        for j in range(4):fs.append((i*4+j,(i+1)*4+j,(i+1)*4+(j+1)%4,i*4+(j+1)%4))
    fs.extend([(3,2,1,0),(64,65,66,67)])
    spoiler=mesh('Roof_Spoiler',vs,fs,'Trim');clean(spoiler);bevel(spoiler,.008,2)
    z=surface_z(0,.58)
    box('Spoiler_BrakeLight',(0,.73,z+.035),(.57,.014,.014),'Taillight',.005)
    trim=[]
    for sign in [-1,1]:trim.append(box('lower skirt',(sign*.89,0,.34),(.05,1.65,.08),'Trim',.012))
    join(trim,'Trim',(0,0,0))
    print('Vehicle triangles with all requested parts',tri_count());assert tri_count()<40000
elif STAGE=='materials':
    before=tri_count()
    def srgb(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
    specs=[('BodyPaint',(.56,.59,.64),.85,.22),('Glass',tuple(srgb(c/255) for c in (11,18,32)),0,.05),('Tire',(.009,.012,.016),0,.9),('Rim',(.20,.24,.29),.9,.25),('Headlight',(1,.88,.65),0,.2),('Taillight',(.5,.002,.006),0,.25),('Trim',(.022,.028,.035),0,.6)]
    for name,color,metal,rough in specs:
        mat=material(name,color,metal,rough);nodes=mat.node_tree.nodes;links=mat.node_tree.links;p=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
        p.inputs['Coat Weight'].default_value=1 if name=='BodyPaint' else 0
        if name=='BodyPaint':p.inputs['Coat Roughness'].default_value=.12
        if name in ['Headlight','Taillight']:
            p.inputs['Emission Color'].default_value=(*( (1,.75,.42) if name=='Headlight' else (1,.004,.012)),1);p.inputs['Emission Strength'].default_value=3 if name=='Headlight' else 2
        if name=='Tire':
            for n in list(nodes):
                if n.type not in ['BSDF_PRINCIPLED','OUTPUT_MATERIAL']:nodes.remove(n)
            tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=170;tex.inputs['Detail'].default_value=2
            bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.12;bump.inputs['Distance'].default_value=.0006
            links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],p.inputs['Normal'])
    assert before==tri_count()
    users=[o.name for o in bpy.context.scene.objects if o.type=='MESH' and any(m.name=='BodyPaint' for m in o.data.materials)]
    assert users==['Body'],users
    print('Material stage unchanged triangles',before,'BodyPaint users',users)
elif STAGE=='studio':
    scene=bpy.context.scene
    for o in list(scene.objects):
        if o.name.startswith('Studio'):bpy.data.objects.remove(o,do_unlink=True)
    world=bpy.data.worlds.new('Golden hour HDRI');scene.world=world;world.use_nodes=True;n=world.node_tree.nodes;l=world.node_tree.links;n.clear()
    out=n.new('ShaderNodeOutputWorld');bg=n.new('ShaderNodeBackground');bg.inputs['Strength'].default_value=.35
    env=n.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(ROOT+'/assets/studio/sunset_jhbcentral_1k.hdr',check_existing=True);env.image.pack()
    mapping=n.new('ShaderNodeMapping');mapping.inputs['Rotation'].default_value[2]=math.radians(120);coord=n.new('ShaderNodeTexCoord')
    l.new(coord.outputs['Generated'],mapping.inputs['Vector']);l.new(mapping.outputs['Vector'],env.inputs['Vector']);l.new(env.outputs['Color'],bg.inputs['Color']);l.new(bg.outputs[0],out.inputs[0])
    for name,loc,color,power,size in [('Studio_Key',(3,1,5),(1,.60,.30),1000,5),('Studio_Rim',(-3,-2,3),(.40,.65,1),800,4),('Studio_Fill',(1,5,2.5),(1,.85,.68),500,5)]:
        light=bpy.data.lights.new(name,'AREA');light.energy=power;light.color=color;light.shape='DISK';light.size=size
        ob=bpy.data.objects.new(name,light);scene.collection.objects.link(ob);ob.location=loc;aim(ob,(0,0,.8))
    material('StudioFloor',(.075,.065,.055),.15,.3)
    floor=box('Studio_Floor',(0,0,-.075),(200,200,.14),'StudioFloor',.001)
    cam=bpy.data.cameras.new('Studio_Camera');ob=bpy.data.objects.new('Studio_Camera',cam);scene.collection.objects.link(ob);ob.location=(5.6,6.9,3.0);cam.lens=55;aim(ob,(0,.15,.8));scene.camera=ob
    try:scene.render.engine='CYCLES'
    except TypeError as e:print(e)
    scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.render.resolution_x=1280;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.film_transparent=False
    print('Golden-hour HDRI and three studio lights ready')
elif STAGE=='render':
    scene=bpy.context.scene;scene.render.filepath=ROOT+'/assets/studio/'+OUTPUT+'.png';bpy.ops.render.render(write_still=True);print(scene.render.filepath)
elif STAGE=='save':
    scene=bpy.context.scene;car=[o for o in scene.objects if not o.name.startswith('Studio')]
    for ob in car:
        if ob.type=='MESH':clean(ob);apply(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in car:ob.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/car.blend')
    bpy.ops.export_scene.gltf(filepath=ROOT+'/public/models/car.glb',export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=False)
    report={'triangles':tri_count(),'bytes':os.path.getsize(ROOT+'/public/models/car.glb'),'objects':[o.name for o in car],'materials':['BodyPaint','Glass','Tire','Rim','Headlight','Taillight','Trim']}
    open(ROOT+'/assets/car-report.json','w').write(json.dumps(report,indent=2));print(report)
