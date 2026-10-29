"""In-house SUV. Run stages through Blender MCP; no external assets."""
import bpy, bmesh, math, os, json
from mathutils import Vector
ROOT = 'C:/CAR/egal'
def active(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
def apply(o):
    active(o); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
def material(name,color,metal=0,rough=.6,emission=None):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if emission: p.inputs['Emission Color'].default_value=(*emission,1); p.inputs['Emission Strength'].default_value=2
    m.diffuse_color=(*color,1); return m
def mesh(name,verts,faces,mat):
    m=bpy.data.meshes.new(name); m.from_pydata(verts,[],faces); m.update()
    o=bpy.data.objects.new(name,m); bpy.context.collection.objects.link(o); o.data.materials.append(bpy.data.materials[mat]); return o
def bevel(o,w=.025,segments=3):
    m=o.modifiers.new('Soft manufactured edges','BEVEL'); m.width=w; m.segments=segments; apply(o)
def box(name,loc,scale,mat,w=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name; o.dimensions=scale; apply(o); o.data.materials.append(bpy.data.materials[mat]); bevel(o,w); return o
def join(parts,name,origin=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts:o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); o=parts[0]; o.name=name
    if origin is not None:
        bpy.context.scene.cursor.location=origin; bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return o
def rod(name,a,b,r,mat):
    d=Vector(b)-Vector(a); bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r,depth=d.length,location=(Vector(a)+Vector(b))/2)
    o=bpy.context.object; o.name=name; o.rotation_euler=d.to_track_quat('Z','Y').to_euler(); apply(o); o.data.materials.append(bpy.data.materials[mat]); return o
def patch(name,points,mat='Glass'):
    if name in ['windshield','rear glass']: points=[(x,y,z+.035) for x,y,z in points]
    o=mesh(name,points,[tuple(range(len(points)))],mat)
    s=o.modifiers.new('Surface thickness','SOLIDIFY'); s.thickness=.008; s.offset=0; apply(o); return o
if STAGE=='body':
    # Preserve the user's starter scene separately instead of deleting it.
    old=bpy.context.scene; scene=bpy.data.scenes.new('Egal SUV'); bpy.context.window.scene=scene
    scene.unit_settings.system='METRIC'; scene.unit_settings.scale_length=1
    material('BodyPaint',(.92,.94,.96),.6,.3); material('Glass',(.018,.037,.055),0,.05)
    material('Tire',(.012,.015,.019),0,.9); material('Rim',(.56,.61,.66),.9,.25)
    material('Headlight',(1,.86,.58),0,.25,(1,.8,.44)); material('Taillight',(.55,.006,.012),0,.3,(1,.006,.012)); material('Trim',(.035,.043,.05),0,.6)
    # Side silhouette from nose (-Y) to coupe tail. Width tapers above shoulders.
    profile=[(-2.16,.34),(-2.2,.68),(-2.12,.92),(-1.15,1.04),(-.57,1.57),(.22,1.6),(.75,1.45),(1.45,1.04),(2.08,.91),(2.18,.65),(2.12,.32)]
    for cy in [1.32,-1.35]:
        for i in range(25):
            a=-.115+(math.pi+.23)*i/24
            profile.append((cy+.435*math.cos(a),.37+.435*math.sin(a)))
    def halfwidth(z): return .9-max(0,z-1.0)*.36
    v=[(s*.9,y,z) for s in [-1,1] for y,z in profile]; n=len(profile)
    f=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    body=mesh('Body',v,f,'BodyPaint')
    bm=bmesh.new(); bm.from_mesh(body.data); bmesh.ops.triangulate(bm,faces=list(bm.faces)); bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(body.data); bm.free()
    for vert in body.data.vertices: vert.co.x *= halfwidth(vert.co.z)/.9
    bevel(body,.035,3)
    sub=body.modifiers.new('Surface tessellation','SUBSURF'); sub.subdivision_type='SIMPLE'; sub.levels=1; apply(body)
    bm=bmesh.new(); bm.from_mesh(body.data)
    bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,0),plane_no=(1,0,0),clear_inner=True,clear_outer=False)
    bm.to_mesh(body.data); bm.free()
    m=body.modifiers.new('Exact bilateral symmetry','MIRROR'); m.use_clip=True; apply(body)
    for p in body.data.polygons:p.use_smooth=True
    m=body.modifiers.new('Panel normals','WEIGHTED_NORMAL'); m.keep_sharp=True; m.weight=50; apply(body)
    print('Body built with profile wheel arches, applied bevel and subdivision.')
elif STAGE=='glass':
    parts=[]
    parts.append(patch('windshield',[(-.69,-1.105,1.075),(.69,-1.105,1.075),(.645,-.585,1.555),(-.645,-.585,1.555)]))
    parts.append(patch('rear glass',[(-.65,.77,1.455),(.65,.77,1.455),(.75,1.405,1.085),(-.75,1.405,1.085)]))
    for s in [-1,1]:
        parts.append(patch('front side',[(s*.892,-1.06,1.075),(s*.713,-.54,1.535),(s*.699,.02,1.55),(s*.882,.02,1.075)]))
        parts.append(patch('rear side',[(s*.882,.095,1.075),(s*.704,.095,1.55),(s*.754,.71,1.425),(s*.885,1.28,1.075)]))
    join(parts,'Cabin_Glass',(0,0,0)); print('Six fitted glass panels built.')
elif STAGE=='wheels':
    for suffix,x,y in [('FL',.825,-1.35),('FR',-.825,-1.35),('RL',.825,1.32),('RR',-.825,1.32)]:
        parts=[]; s=1 if x>0 else -1; hub=(x,y,.37)
        bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=.37,depth=.22,location=hub,rotation=(0,math.pi/2,0)); tire=bpy.context.object; tire.data.materials.append(bpy.data.materials['Tire']); apply(tire); bevel(tire,.035,3); parts.append(tire)
        # Rim ring around the X axle.
        bpy.ops.mesh.primitive_torus_add(major_radius=.25,minor_radius=.018,major_segments=40,minor_segments=8,location=(x+s*.113,y,.37),rotation=(0,math.pi/2,0)); rim=bpy.context.object; rim.data.materials.append(bpy.data.materials['Rim']); apply(rim); parts.append(rim)
        for i in range(5):
            a=i*math.tau/5; parts.append(rod('spoke',(x+s*.116,y,.37),(x+s*.116,y+math.sin(a)*.24,.37+math.cos(a)*.24),.028,'Rim'))
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.065,depth=.025,location=(x+s*.12,y,.37),rotation=(0,math.pi/2,0)); cap=bpy.context.object; cap.data.materials.append(bpy.data.materials['Rim']); apply(cap); parts.append(cap)
        wheel=join(parts,'Wheel_'+suffix,hub)
        if suffix.startswith('F'):
            pivot=bpy.data.objects.new('SteerPivot_'+suffix,None); bpy.context.collection.objects.link(pivot); pivot.location=hub; wheel.parent=pivot; wheel.location=(0,0,0)
    print('Four five-spoke wheels; hub-centred local X axles and front Z steering pivots.')
elif STAGE=='lights':
    for label,s in [('L',1),('R',-1)]:
        box('Headlight_'+label,(s*.59,-2.147,.805),(.46,.065,.105),'Headlight',.025)
        box('Taillight_'+label,(s*.59,2.116,.795),(.46,.055,.095),'Taillight',.02)
    box('rear light strip',(0,2.137,.8),(.77,.025,.025),'Taillight',.008)
    box('Grille',(0,-2.196,.58),(1.12,.045,.22),'Trim',.035)
    box('Bumper_Front',(0,-2.145,.355),(1.65,.1,.12),'Trim',.03)
    box('Bumper_Rear',(0,2.13,.345),(1.65,.1,.12),'Trim',.03)
    print('Lights, plain grille and bumpers built.')
elif STAGE=='trim':
    parts=[]
    for s,label in [(1,'L'),(-1,'R')]:
        mirror=box('Mirror_'+label,(s*.965,-.82,1.08),(.19,.24,.13),'Trim',.04)
        parts.append(rod('mirror stem',(s*.85,-.82,1.04),(s*.96,-.82,1.08),.025,'Trim'))
        parts.append(box('skirt',(s*.906,0,.34),(.035,1.77,.09),'Trim',.012))
        for y in [.045,1.12]:
            parts.append(rod('door seam',(s*.907,y,.49),(s*.907,y,1.02),.006,'Trim'))
        for y in [-.28,.79]:parts.append(box('handle',(s*.914,y,.96),(.025,.19,.035),'Trim',.01))
        parts.append(rod('roof edge',(s*.695,-.55,1.59),(s*.695,.22,1.615),.012,'Trim'))
    join(parts,'Trim',(0,0,0))
    # Include rear strip in the required tail object.
    join([bpy.data.objects['Taillight_L'],bpy.data.objects['rear light strip']],'Taillight_L')
    print('Mirrors, door seams, handles, skirts and roof edges built.')
elif STAGE=='export':
    report={}; total=0
    for o in bpy.context.scene.objects:
        if o.type!='MESH':continue
        apply(o); bm=bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001)
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces)); bm.to_mesh(o.data); bm.free()
        o.data.calc_loop_triangles(); total+=len(o.data.loop_triangles)
        report[o.name]={'triangles':len(o.data.loop_triangles),'ground':min((o.matrix_world@v.co).z for v in o.data.vertices),'loose_vertices':sum(1 for v in o.data.vertices if not any(v.index in e.vertices for e in o.data.edges))}
    assert total<30000,total
    for n in ['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR']:assert abs(report[n]['ground'])<.001,report[n]
    bpy.context.scene.cursor.location=(0,0,0)
    for o in bpy.context.scene.objects:o.select_set(True)
    os.makedirs(ROOT+'/assets',exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/assets/car.blend')
    bpy.ops.export_scene.gltf(filepath=ROOT+'/public/models/car.glb',export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=False)
    result={'triangles':total,'bytes':os.path.getsize(ROOT+'/public/models/car.glb'),'objects':report,'nodes':[o.name for o in bpy.context.scene.objects],'materials':[m.name for m in bpy.data.materials if m.name in ['BodyPaint','Glass','Tire','Rim','Headlight','Taillight','Trim']]}
    open(ROOT+'/assets/car-report.json','w').write(json.dumps(result,indent=2)); print(json.dumps(result))

