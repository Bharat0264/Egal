"""In-house exportable tire relief; no geometry, rig or silhouette changes."""
import bpy, math, os, json
from array import array

folder='C:/CAR/egal/assets/refinement-checks'
os.makedirs(folder,exist_ok=True)
size=512
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def height(u,v):
    crown=max(0,math.cos((u-.5)*math.tau))**8
    phase=(v*56+.2*math.sin((u-.5)*math.tau*3))%1
    cross=1-smooth(.025,.075,min(phase,1-phase))
    lane=abs(math.sin((u-.5)*math.tau*12))
    longitudinal=1-smooth(.10,.22,lane)
    grain=math.sin(u*math.tau*192)*math.sin(v*math.tau*256)*.000018
    return -.0014*crown*max(cross,longitudinal*.8)+grain
heights=[height(x/size,y/size) for y in range(size) for x in range(size)]
pixels=array('f')
for y in range(size):
    for x in range(size):
        dx=(heights[y*size+(x+1)%size]-heights[y*size+(x-1)%size])*size/(2*.9)
        dy=(heights[((y+1)%size)*size+x]-heights[((y-1)%size)*size+x])*size/(2*2.5)
        length=math.sqrt(dx*dx+dy*dy+1)
        pixels.extend((.5-dx/length*.5,.5-dy/length*.5,.5+1/length*.5,1))
image=bpy.data.images.get('Egal_Tire_Normal')
if image:bpy.data.images.remove(image)
image=bpy.data.images.new('Egal_Tire_Normal',width=size,height=size,alpha=False)
image.colorspace_settings.name='Non-Color';image.pixels.foreach_set(pixels)
image.filepath_raw=folder+'/tire-normal.png';image.file_format='PNG';image.save();image.pack()
material=bpy.data.materials['Tire'];nodes=material.node_tree.nodes;links=material.node_tree.links
principled=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
for node in list(nodes):
    if node.type not in {'BSDF_PRINCIPLED','OUTPUT_MATERIAL'}:nodes.remove(node)
texture=nodes.new('ShaderNodeTexImage');texture.image=image;texture.label='In-house tire relief, 512 px'
normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=1
links.new(texture.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],principled.inputs['Normal'])
report=[]
for name in ['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR']:
    obj=bpy.data.objects[name];mesh=obj.data;uv=mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
    polys=[p for p in mesh.polygons if mesh.materials[p.material_index].name=='Tire']
    ids={v for p in polys for v in p.vertices};radii=[math.hypot(mesh.vertices[i].co.y,mesh.vertices[i].co.z) for i in ids]
    mid=(min(radii)+max(radii))*.5;radial=(max(radii)-min(radii))*.5;axial=max(abs(mesh.vertices[i].co.x) for i in ids)
    for poly in polys:
        coords=[]
        for index in poly.loop_indices:
            co=mesh.vertices[mesh.loops[index].vertex_index].co
            coords.append([math.atan2(co.x/axial,(math.hypot(co.y,co.z)-mid)/radial)/math.tau+.5,math.atan2(co.z,co.y)/math.tau+.5])
        for axis in [0,1]:
            if max(c[axis] for c in coords)-min(c[axis] for c in coords)>.5:
                for c in coords:
                    if c[axis]<.5:c[axis]+=1
        for index,coord in zip(poly.loop_indices,coords):uv.data[index].uv=coord
    mesh.calc_loop_triangles();report.append({'name':name,'triangles':len(mesh.loop_triangles),'tireFaces':len(polys)})
bpy.ops.wm.save_as_mainfile(filepath='C:/CAR/egal/assets/car-studio.blend')
with open(folder+'/tire-refinement.json','w') as f:json.dump({'texture':[size,size],'geometryChanged':False,'wheels':report},f,indent=2)
print(json.dumps({'texture':image.filepath_raw,'wheels':report,'designAndRig':'unchanged'}))
