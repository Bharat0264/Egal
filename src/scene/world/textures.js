import { CanvasTexture, LinearMipmapLinearFilter, RepeatWrapping, SRGBColorSpace } from 'three'

function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 } }
function canvas(size, draw, color = false) {
  const c = document.createElement('canvas'); c.width = c.height = size
  draw(c.getContext('2d'), size)
  const texture = new CanvasTexture(c)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.anisotropy = 4
  if (color) texture.colorSpace = SRGBColorSpace
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
  const noise = rng(57), size = 256, heights = Float32Array.from({ length: size * size }, () => noise())
  const diffuse = canvas(size, (ctx, s) => {
    const data = ctx.createImageData(s, s)
    for (let i = 0; i < heights.length; i++) {
      const x = i % s, y = Math.floor(i / s)
      const v = 53 + heights[i] * 19 + Math.sin(x * 0.05) * Math.cos(y * 0.07) * 3
      data.data.set([v, v + 2, v + 4, 255], i * 4)
    }
    ctx.putImageData(data, 0, 0)
  }, true)
  const roughness = canvas(size, (ctx, s) => {
    const data = ctx.createImageData(s, s)
    for (let i = 0; i < heights.length; i++) { const v = 210 + heights[i] * 40; data.data.set([v, v, v, 255], i * 4) }
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
