import bpy, bmesh, math, numpy as np
from mathutils import Vector
# Reuse only modelling helpers, without rerunning the primary rebuild.
source=open('C:/CAR/egal/scripts/performance-crossover.py').read()
exec(source.split('# y, half-width')[0])

def patch(name,fn,nu,nv,material):
    vertices=[fn(i/nu,j/nv) for j in range(nv+1) for i in range(nu+1)]
    faces=[]
    for j in range(nv):
        for i in range(nu):
            a=j*(nu+1)+i
            faces.append((a,a+1,a+nu+2,a+nu+1))
    return mesh(name,vertices,faces,[material])

def poly(x,y):
    return [1,x,y,x*x,x*y,y*y,x**3,x*x*y,x*y*y,y**3,x**4,x*x*y*y,y**4]
def fit(points,values):
    return np.linalg.lstsq(np.asarray(points),np.asarray(values),rcond=None)[0]

# Smooth each glass island as an analytic surface, rather than a ray-hit quilt.
ob=bpy.data.objects['Cabin_Glass']
bm=bmesh.new();bm.from_mesh(ob.data);left=set(bm.verts)
while left:
    seed=left.pop();island={seed};queue=[seed]
    while queue:
        v=queue.pop()
        for e in v.link_edges:
            other=e.other_vert(v)
            if other in left:left.remove(other);island.add(other);queue.append(other)
    mx=sum(v.co.x for v in island)/len(island)
    my=sum(v.co.y for v in island)/len(island)
    if abs(mx)>.5:
        side=1 if mx>0 else -1
        coeff=fit([poly(v.co.y,v.co.z) for v in island],[abs(v.co.x) for v in island])
        for v in island:v.co.x=side*(float(np.dot(poly(v.co.y,v.co.z),coeff))+.012)
    else:
        coeff=fit([poly(v.co.x,v.co.y) for v in island],[v.co.z for v in island])
        for v in island:v.co.z=float(np.dot(poly(v.co.x,v.co.y),coeff))+.009
bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(ob.data);bm.free()

# Fit the rear fascia once; all lighting ribbons then share the same clean curvature.
body=bpy.data.objects['Body'];samples=[];values=[]
for x in np.linspace(-.95,.95,35):
    for z in np.linspace(.83,1.0,10):
        hit,p,n,_=body.ray_cast(Vector((float(x),3,float(z))),Vector((0,-1,0)))
        if hit and p.y>1.7:samples.append(poly(x,z));values.append(p.y)
coeff=fit(samples,values)
def rear(x,z,offset=.03):return (x,float(np.dot(poly(x,z),coeff))+offset,z)
# Remove local lumpy cap highlights under the lamp band.
for v in body.data.vertices:
    x,y,z=v.co
    if y>1.96 and .80<z<1.015:
        target=float(np.dot(poly(x,z),coeff))
        w=min(1,(y-1.96)/.12,(z-.80)/.035,(1.015-z)/.025)
        v.co.y=y*(1-w)+target*w
body.data.update()
patch('Boot_Band',lambda u,v:rear((2*u-1)*.966,.845+.155*v,.025),64,5,trim)
for side,label in [(-1,'L'),(1,'R')]:
    vertices=[];faces=[]
    # Rounded trapezoidal LED outline with a crisp dark centre.
    outline=[(.29,.952),(.76,.949),(.91,.932),(.953,.912),(.922,.883),(.77,.871),(.29,.872)]
    path=[]
    for k,p in enumerate(outline):
        prev=outline[(k-1)%len(outline)];nxt=outline[(k+1)%len(outline)]
        a=(p[0]*.80+prev[0]*.20,p[1]*.80+prev[1]*.20)
        b=(p[0]*.80+nxt[0]*.20,p[1]*.80+nxt[1]*.20)
        for j in range(5):
            t=j/4;path.append(((1-t)**2*a[0]+2*(1-t)*t*p[0]+t*t*b[0],(1-t)**2*a[1]+2*(1-t)*t*p[1]+t*t*b[1]))
    center=(.64,.910)
    for x,z in path:
        for scale in [1,.83]:
            xx=center[0]+(x-center[0])*scale;zz=center[1]+(z-center[1])*scale
            vertices.append(rear(side*xx,zz,.038))
    for i in range(len(path)):
        j=(i+1)%len(path);faces.append((2*i,2*i+1,2*j+1,2*j))
    # Smooth forward extension around the outer corner.
    start=len(vertices)
    for i in range(20):
        t=i/19;y=1.72+.35*t
        for dz in [-.006,.006]:
            hit,p,n,_=body.ray_cast(Vector((side*3,y,.92+dz)),Vector((-side,0,0)))
            vertices.append(tuple(p+n*.02))
    for i in range(19):a=start+2*i;faces.append((a,a+1,a+3,a+2))
    mesh('Taillight_'+label,vertices,faces,[red])

# Replace the distorted outlet rims with clean, bevelled trapezoid sections.
bumper=bpy.data.objects['Bumper_Rear'];bm=bmesh.new();bm.from_mesh(bumper.data)
# Retain the main bumper sheet and remove the old disconnected rims/fins.
components=[];remaining=set(bm.verts)
while remaining:
    seed=remaining.pop();island={seed};q=[seed]
    while q:
        v=q.pop()
        for e in v.link_edges:
            other=e.other_vert(v)
            if other in remaining:remaining.remove(other);island.add(other);q.append(other)
    components.append(island)
main=max(components,key=len)
bmesh.ops.delete(bm,geom=[v for component in components if component is not main for v in component],context='VERTS')
bm.to_mesh(bumper.data);bm.free()
parts=[bumper]
for side in [-1,1]:
    outline=[(-.166,-.055),(.146,-.055),(.174,.055),(-.145,.055)]
    vertices=[];faces=[]
    for depth,scale in [(0,1),(-.07,1),(-.07,.78),(0,.78)]:
        for x,z in outline:vertices.append((side*.735+x*scale,2.225+depth,.30+z*scale))
    for j in range(4):
        for i in range(4):faces.append((4*j+i,4*j+(i+1)%4,4*((j+1)%4)+(i+1)%4,4*((j+1)%4)+i))
    outlet=mesh('OutletFrame',vertices,faces,[rim]);active(outlet)
    mod=outlet.modifiers.new('Polished exhaust edge','BEVEL');mod.width=.006;mod.segments=3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in outlet.data.polygons:p.use_smooth=False
    parts.append(outlet)
    parts.append(box('OutletCavity',(side*.735,2.15,.30),(.29,.014,.084),trim,.018))
for x in [-.46,-.23,0,.23,.46]:parts.append(box('DiffuserRib',(x,2.12,.195),(.022,.26,.07),trim,.005))
join(parts,'Bumper_Rear')

# Fine panel gaps are fitted to the real body, rather than painted onto the image.
def seam(name,side,path,radius=.0017):
    vertices=[];faces=[]
    for y,z in path:
        hit,p,n,_=body.ray_cast(Vector((side*3,y,z)),Vector((-side,0,0)))
        if not hit:continue
        p+=n*.006
        for k in range(6):
            a=2*math.pi*k/6;vertices.append((p.x+radius*math.cos(a),p.y+radius*math.sin(a),p.z))
    for j in range(len(vertices)//6-1):
        for k in range(6):faces.append((j*6+k,j*6+(k+1)%6,(j+1)*6+(k+1)%6,(j+1)*6+k))
    return mesh(name,vertices,faces,[trim])
for side,label in [(-1,'L'),(1,'R')]:
    for k,y in enumerate([-.67,.31,1.04]):
        path=[(y+.04*math.sin(math.pi*t),.39+.55*t) for t in np.linspace(0,1,22)]
        seam('DoorSeam_'+label+str(k),side,path)

# A warm road scene: directional sunset, textured dark asphalt and restrained lane paint.
floor=bpy.data.objects['Studio_Floor'];p=next(n for n in floor.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
p.inputs['Base Color'].default_value=(.008,.010,.014,1);p.inputs['Roughness'].default_value=.49
nodes=floor.data.materials[0].node_tree.nodes;links=floor.data.materials[0].node_tree.links
noise=next(n for n in nodes if n.type=='TEX_NOISE');noise.inputs['Scale'].default_value=85
ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.004,.006,.009,1);ramp.color_ramp.elements[1].color=(.015,.018,.022,1)
links.new(noise.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs['Color'],p.inputs['Base Color'])
lane=bpy.data.materials.get('RoadMarking') or bpy.data.materials.new('RoadMarking');lane.use_nodes=True
p=next(n for n in lane.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(.9,.49,.055,1);p.inputs['Roughness'].default_value=.67
for i,x in enumerate([-1.72,-1.89]):box('RoadLine_'+str(i),(x,-15,-.002),(.06,70,.004),lane,0)

# Visible golden sky, while retaining the actual HDRI for illumination and paint reflections.
w=scene.world;nodes=w.node_tree.nodes;links=w.node_tree.links
out=next(n for n in nodes if n.type=='OUTPUT_WORLD');source=out.inputs['Surface'].links[0].from_socket
coord=nodes.new('ShaderNodeTexCoord');separate=nodes.new('ShaderNodeSeparateXYZ');links.new(coord.outputs['Normal'],separate.inputs[0])
mapping=nodes.new('ShaderNodeMapRange');mapping.inputs['From Min'].default_value=-.12;mapping.inputs['From Max'].default_value=.45;links.new(separate.outputs['Z'],mapping.inputs['Value'])
ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(1,.42,.12,1);ramp.color_ramp.elements[1].color=(.20,.32,.48,1);links.new(mapping.outputs[0],ramp.inputs[0])
sky=nodes.new('ShaderNodeBackground');links.new(ramp.outputs[0],sky.inputs['Color']);sky.inputs['Strength'].default_value=.8
path=nodes.new('ShaderNodeLightPath');mix=nodes.new('ShaderNodeMixShader');links.new(path.outputs['Is Camera Ray'],mix.inputs[0]);links.new(source,mix.inputs[1]);links.new(sky.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],out.inputs['Surface'])
scene.world.color=(.2,.08,.025)
key=bpy.data.objects['Studio_Key'];key.data.color=(1,.64,.31);key.data.energy=1000
bpy.data.objects['Studio_Rim'].data.energy=350
bpy.data.objects['Studio_Fill'].data.energy=160
sun=bpy.data.objects['GoldenSun'];sun.data.energy=2.2;sun.data.color=(1,.54,.22)
sun.rotation_euler=Vector((.85,-.3,-.19)).to_track_quat('-Z','Y').to_euler()
cam=bpy.data.objects['Hero_Camera'];cam.location=(-4.8,7.8,2.25);cam.rotation_euler=(Vector((0,0,.89))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=60
scene.camera=cam;scene.cycles.samples=40
scene.render.filepath='C:/CAR/egal/assets/performance/hero-second.png'
bpy.ops.wm.save_as_mainfile(filepath='C:/CAR/egal/assets/car-studio.blend')
bpy.ops.render.render(write_still=True)
