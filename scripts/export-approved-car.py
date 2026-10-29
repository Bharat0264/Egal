"""Export the approved production car without editing its saved studio design."""
import bpy, os
from mathutils import Vector

source_scene=bpy.context.scene
source_selection=list(bpy.context.selected_objects)
source_active=bpy.context.view_layer.objects.active
meshes=[o for o in source_scene.objects if o.type=='MESH' and not o.hide_render]
pivots=[bpy.data.objects[name] for name in ['SteerPivot_FL','SteerPivot_FR']]
objects=meshes+pivots
names={o:o.name for o in objects}
parents={o:o.parent for o in objects}
world={o:o.matrix_world.copy() for o in objects}
points=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
minimum=Vector([min(p[i] for p in points) for i in range(3)])
maximum=Vector([max(p[i] for p in points) for i in range(3)])
offset=Vector((-(minimum.x+maximum.x)/2,-(minimum.y+maximum.y)/2,-minimum.z))
export_scene=bpy.data.scenes.new('Egal production web export')
copies={}
try:
    # Only the duplicate objects are transformed. The approved Blender scene stays intact.
    for original in objects:
        duplicate=original.copy()
        if original.type=='MESH':duplicate.data=original.data.copy()
        duplicate.parent=None
        export_scene.collection.objects.link(duplicate)
        duplicate.matrix_world=world[original]
        original.name='__WEB_SOURCE__'+names[original]
        duplicate.name=names[original]
        duplicate.hide_render=False
        duplicate.hide_set(False)
        copies[original]=duplicate
    for original,duplicate in copies.items():
        if parents[original] in copies:
            duplicate.parent=copies[parents[original]]
            duplicate.matrix_world=world[original]
    for original,duplicate in copies.items():
        if duplicate.parent is None:duplicate.location+=offset
    bpy.context.window.scene=export_scene
    bpy.context.view_layer.update()
    for duplicate in copies.values():
        duplicate.select_set(True)
        if duplicate.type=='MESH':
            bpy.context.view_layer.objects.active=duplicate
            bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    # There are no image textures on the procedural production materials. Guard any future ones.
    used_materials={m for o in copies.values() if o.type=='MESH' for m in o.data.materials if m}
    textures=[]
    for mat in used_materials:
        if not mat.use_nodes:continue
        for node in mat.node_tree.nodes:
            if node.type=='TEX_IMAGE' and node.image:
                image=node.image
                assert max(image.size)<=1024,(image.name,list(image.size))
                textures.append(image.name)
    os.makedirs('C:/CAR/egal/public/models',exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath='C:/CAR/egal/public/models/car.glb',
        export_format='GLB',use_selection=True,use_active_scene=True,
        export_yup=True,export_apply=True,export_materials='EXPORT',
        export_cameras=False,export_lights=False,
        export_draco_mesh_compression_enable=False,
        export_extras=False,export_animations=False,
    )
    print('Exported production objects:',[names[o] for o in objects])
    print('Material names:',sorted(m.name for m in used_materials))
    print('Image textures:',textures)
    print('Renamed production objects: none')
    print('Ground-centering offset:',list(offset))
finally:
    bpy.context.window.scene=source_scene
    for duplicate in copies.values():
        data=duplicate.data if duplicate.type=='MESH' else None
        bpy.data.objects.remove(duplicate,do_unlink=True)
        if data and data.users==0:bpy.data.meshes.remove(data)
    for original,name in names.items():original.name=name
    bpy.data.scenes.remove(export_scene)
    bpy.ops.object.select_all(action='DESELECT')
    for original in source_selection:original.select_set(True)
    bpy.context.view_layer.objects.active=source_active
