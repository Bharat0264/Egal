import {ShaderChunk} from 'three'

// Shared by built-in materials, including instancing; no extra render pass.
if(!ShaderChunk.fog_pars_vertex.includes('vCoastalHeight')){
 ShaderChunk.fog_pars_vertex+='\n#ifdef USE_FOG\nvarying float vCoastalHeight;\n#endif'
 ShaderChunk.fog_pars_fragment+='\n#ifdef USE_FOG\nvarying float vCoastalHeight;\n#endif'
 ShaderChunk.fog_vertex+=`
#ifdef USE_FOG
 vec4 coastalPoint=vec4(position,1.);
 #ifdef USE_INSTANCING
 coastalPoint=instanceMatrix*coastalPoint;
 #endif
 vCoastalHeight=(modelMatrix*coastalPoint).y;
 #endif`
 ShaderChunk.fog_fragment=ShaderChunk.fog_fragment.replace('gl_FragColor.rgb = mix',`fogFactor *= smoothstep(35.,110.,vFogDepth)*mix(.48,1.,exp(-max(vCoastalHeight,0.)*.045));
 gl_FragColor.rgb = mix`)
}
