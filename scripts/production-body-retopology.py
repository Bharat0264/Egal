"""Rebuild the same silhouette using quad end panels before recessed assemblies."""
import bpy, bmesh

source=open('C:/CAR/egal/scripts/performance-crossover.py').read()
source=source.split('def ray_top')[0]
source=source.replace("fs+=[tuple(reversed(range(n))),tuple((len(ys)-1)*n+i for i in range(n))]",'')
insertion="""
body=mesh('Body',vs,fs,[paint,trim]);active(body)
bpy.ops.object.mode_set(mode='EDIT')
bm=bmesh.from_edit_mesh(body.data)
for yy in [-2.2,2.2]:
    bpy.ops.mesh.select_all(action='DESELECT')
    for vertex in bm.verts:vertex.select=abs(vertex.co.y-yy)<.00001
    bm.select_flush_mode()
    bmesh.update_edit_mesh(body.data)
    bpy.ops.mesh.fill_grid(span=7,use_interp_simple=True)
    bm=bmesh.from_edit_mesh(body.data)
bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
assert all(e.is_manifold for e in bm.edges)
bmesh.update_edit_mesh(body.data)
bpy.ops.object.mode_set(mode='OBJECT')
"""
source=source.replace("body=mesh('Body',vs,fs,[paint,trim]);active(body)",insertion)
source=source.replace("bev=body.modifiers.new('Wheel opening edge radius','BEVEL');bev.width=.008;bev.segments=2;bev.angle_limit=.65\nbpy.ops.object.modifier_apply(modifier=bev.name)",'')
exec(compile(source,'quad-body-base','exec'))
body['production_shell_repaired']=True
bm=bmesh.new();bm.from_mesh(body.data)
print('Quad shell:',len(bm.verts),'verts,',sum(not e.is_manifold for e in bm.edges),'nonmanifold edges')
bm.free()
exec(compile(open('C:/CAR/egal/scripts/isolate-production-car.py').read(),'isolate-production-car.py','exec'))
