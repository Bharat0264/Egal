import { CanvasTexture, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace } from 'three'

function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 } }
const sharedCanvases=new Map()
function canvas(size, draw, color = false) {
  const key=size+':'+color+':'+draw.toString()
  if(sharedCanvases.has(key))return sharedCanvases.get(key)
  const c = document.createElement('canvas'); c.width = c.height = size
  draw(c.getContext('2d'), size)
  const texture = new CanvasTexture(c)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.anisotropy = 4
  if (color) texture.colorSpace = SRGBColorSpace
  sharedCanvases.set(key,texture)
  return texture
}
let sharedAsphalt
let sharedTerrain
export function terrainTextures(){
 if(sharedTerrain)return sharedTerrain
 const noise=rng(891),size=256,heights=Float32Array.from({length:size*size},()=>noise())
 const map=canvas(size,(ctx,s)=>{const data=ctx.createImageData(s,s);for(let i=0;i<heights.length;i++){const x=i%s,y=Math.floor(i/s),v=218+heights[i]*25+Math.sin(x*.13)*Math.cos(y*.11)*5;data.data.set([v,v,v,255],i*4)}ctx.putImageData(data,0,0)},true)
 const normalMap=canvas(size,(ctx,s)=>{const data=ctx.createImageData(s,s);for(let y=0;y<s;y++)for(let x=0;x<s;x++){const i=y*s+x;data.data.set([128+(heights[y*s+(x+1)%s]-heights[i])*14,128+(heights[((y+1)%s)*s+x]-heights[i])*14,255,255],i*4)}ctx.putImageData(data,0,0)})
 map.anisotropy=normalMap.anisotropy=8
 return sharedTerrain={map,normalMap}
}
export function asphaltTextures() {
  if(sharedAsphalt)return sharedAsphalt
  const noise = rng(57), size = 512, heights = Float32Array.from({ length: size * size }, () => noise())
  const diffuse = canvas(size, (ctx, s) => {
    const data = ctx.createImageData(s, s)
    for (let i = 0; i < heights.length; i++) {
      const x = i % s, y = Math.floor(i / s)
      const v = 53 + heights[i] * 19 + Math.sin(x * 0.05) * Math.cos(y * 0.07) * 3
      data.data.set([v, v + 2, v + 4, 255], i * 4)
    }
    ctx.putImageData(data, 0, 0)
    ctx.fillStyle='#11182018';ctx.fillRect(s*.21,0,s*.055,s);ctx.fillRect(s*.7,0,s*.045,s)
    ctx.strokeStyle='#131d2560';ctx.lineWidth=.8
    for(let i=0;i<7;i++){const x=noise()*s,y=noise()*s;for(const shift of[-s,0,s]){ctx.beginPath();ctx.moveTo(x+shift,y);ctx.lineTo(x+shift+15,y+19);ctx.lineTo(x+shift+8,y+41);ctx.lineTo(x+shift+24,y+63);ctx.stroke()}}
  }, true)
  const roughness = canvas(size, (ctx, s) => {
    const data = ctx.createImageData(s, s)
    for (let i = 0; i < heights.length; i++) { const x=i%s,y=Math.floor(i/s),patch=Math.sin(x*Math.PI*2/s)+Math.cos(y*Math.PI*4/s);const v = 225+heights[i]*22-Math.max(0,patch-.8)*8; data.data.set([v, v, v, 255], i * 4) }
    ctx.putImageData(data, 0, 0)
  })
  const normal = canvas(size, (ctx, s) => {
    const data = ctx.createImageData(s, s)
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const i = y * s + x, dx = heights[y * s + (x + 1) % s] - heights[i], dy = heights[((y + 1) % s) * s + x] - heights[i]
      data.data.set([128 + dx * 22, 128 + dy * 22, 254, 255], i * 4)
    }
    ctx.putImageData(data, 0, 0)
  })
  return sharedAsphalt = { map: diffuse, roughnessMap: roughness, normalMap: normal }
}
export function windowTexture() {
  return canvas(128, (ctx, s) => {
    const r = rng(45); ctx.fillStyle = '#15293b'; ctx.fillRect(0, 0, s, s)
    for (let y = 5; y < s; y += 14) for (let x = 5; x < s; x += 13) {
      ctx.fillStyle = r() > 0.35 ? '#ffdb9a' : '#293e51'; ctx.fillRect(x, y, 5, 8)
    }
  }, true)
}
export function gravelTexture() {
  const texture = canvas(1024, (ctx, s) => {
    const r = rng(717); ctx.fillStyle = '#b0aa94'; ctx.fillRect(0, 0, s, s)
    for (let i = 0; i < 90000; i++) {
      const v = Math.floor(115 + r() * 80); ctx.fillStyle = `rgb(${v},${v - 5},${v - 16})`
      ctx.fillRect(r() * s, r() * s, 1 + r() * 3, 1 + r() * 3)
    }
    for (let i = 0; i < 1300; i++) {
      const x = r() * s, y = r() * s, rx = 5 + r() * 17, ry = 3 + r() * 9, angle = r() * Math.PI
      const v = Math.floor(105 + r() * 85)
      ctx.fillStyle = '#625f5160'; ctx.beginPath(); ctx.ellipse(x + 1, y + 2, rx, ry, angle, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = `rgb(${v},${v - 4},${v - 15})`; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2); ctx.fill()
    }
  }, true)
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.anisotropy = 8
  // Ribbon UVs measure four metres; gravel tiles every half metre.
  texture.repeat.set(8, 8)
  return texture
}
export function cloudTexture() {
  return canvas(128, (ctx) => {
    for (const [x, y, r] of [[35, 70, 24], [57, 55, 29], [82, 64, 26], [101, 75, 17]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
  }, true)
}
export function sunGlowTexture() {
  return canvas(128, (ctx,s) => {
    const g=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2)
    g.addColorStop(0,'rgba(255,234,180,.8)');g.addColorStop(.22,'rgba(255,194,113,.35)');g.addColorStop(.6,'rgba(255,163,81,.08)');g.addColorStop(1,'rgba(255,163,81,0)')
    ctx.fillStyle=g;ctx.fillRect(0,0,s,s)
  },true)
}

export function sunRayTexture(){return canvas(128,(ctx,s)=>{ctx.translate(s/2,s/2);for(let i=0;i<7;i++){ctx.rotate(Math.PI/7);const g=ctx.createLinearGradient(0,0,0,s/2);g.addColorStop(0,'#fff5d94d');g.addColorStop(1,'#fff5d900');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(-8,s/2);ctx.lineTo(8,s/2);ctx.lineTo(2,0);ctx.fill()}},true)}

let biomeAtlas
export function terrainBiomeAtlas(){
 if(biomeAtlas)return biomeAtlas
 const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d'),r=rng(9821)
 const colors=[[73,108,49],[133,139,76],[110,90,61],[198,181,139]]
 for(let biome=0;biome<4;biome++){
  const ox=(biome%2)*512,oy=Math.floor(biome/2)*512,data=ctx.createImageData(512,512),color=colors[biome]
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){const grain=(r()-.5)*23;const i=(y*512+x)*4;data.data.set([color[0]+grain,color[1]+grain,color[2]+grain,255],i)}
  ctx.putImageData(data,ox,oy)
  if(biome<2){ctx.strokeStyle=biome?'#b3ac7840':'#a1b37755';ctx.lineWidth=1;for(let i=0;i<5500;i++){const x=ox+4+r()*504,y=oy+4+r()*504;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(r()-.5)*3,y-2-r()*4);ctx.stroke()}}
 }
 biomeAtlas=new CanvasTexture(c);biomeAtlas.flipY=false;biomeAtlas.colorSpace=SRGBColorSpace;biomeAtlas.anisotropy=8;return biomeAtlas
}

let waterNormals
export function waterNormalTextures(){
 if(waterNormals)return waterNormals
 waterNormals=[0,1].map(layer=>{
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),data=ctx.createImageData(128,128)
  const height=(x,y)=>{x=x/128*Math.PI*2;y=y/128*Math.PI*2;return Math.sin(x*(layer?5:3)+Math.sin(y*2)*.5)*.6+Math.cos(y*(layer?7:4)+Math.cos(x*2)*.4)*.4}
  for(let y=0;y<128;y++)for(let x=0;x<128;x++)data.data.set([128+(height(x+1,y)-height(x-1,y))*70,128+(height(x,y+1)-height(x,y-1))*70,250,255],(y*128+x)*4)
  ctx.putImageData(data,0,0);const map=new CanvasTexture(c);map.wrapS=map.wrapT=RepeatWrapping;map.anisotropy=4;return map
 });return waterNormals
}
export function rockTexture(){return canvas(256,(ctx,s)=>{const r=rng(611),data=ctx.createImageData(s,s);for(let y=0;y<s;y++)for(let x=0;x<s;x++){const n=195+r()*32+Math.sin(x*.13)*Math.cos(y*.19)*3;data.data.set([n,n,n,255],(y*s+x)*4)}ctx.putImageData(data,0,0)},true)}

export function lanePaintTexture(){const t=canvas(128,(ctx,s)=>{const r=rng(336);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,s,s);for(let i=0;i<1400;i++){const v=Math.floor(190+r()*65);ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.fillRect(r()*s,r()*s,1+r()*2,1+r()*3)}for(let i=0;i<140;i++)ctx.clearRect(r()*s,r()*s,1,2)},true);t.repeat.set(24,8);return t}
export function roadsideMarkerTexture(){return canvas(128,(ctx,s)=>{ctx.fillStyle='#e4e5cd';ctx.fillRect(0,0,s,s);ctx.fillStyle='#243236';ctx.fillRect(0,22,s,45);ctx.fillStyle='#e6a04f';ctx.fillRect(43,28,42,20)},true)}
export function kilometreTexture(){return canvas(128,(ctx,s)=>{ctx.fillStyle='#e5dfbd';ctx.fillRect(0,0,s,s);ctx.fillStyle='#c3a557';ctx.fillRect(0,0,s,28);ctx.fillStyle='#263e39';ctx.textAlign='center';ctx.font='bold 38px sans-serif';ctx.fillText('KM',64,88)},true)}
