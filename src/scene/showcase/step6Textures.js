import { CanvasTexture, SRGBColorSpace } from 'three'
const cache=new Map()
function canvasTexture(key,draw,width=512,height=256) {
 if(cache.has(key))return cache.get(key)
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
 draw(canvas.getContext('2d'),width,height)
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4
 cache.set(key,texture);return texture
}
function svgTexture(key,body,viewBox='0 0 160 64') {
 return canvasTexture(key,(ctx,w,h)=>{
  const image=new Image()
  image.onload=()=>{ctx.clearRect(0,0,w,h);ctx.drawImage(image,0,0,w,h);cache.get(key).needsUpdate=true}
  image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`)}`
 },512,viewBox==='0 0 64 64'?512:256)
}
const silhouettes={
 hatchback:'M10 42L17 27L35 23L45 10Q47 8 53 8H91L111 26L143 32L150 42V51H10Z',
 sedan:'M7 40L13 29L37 25L56 11H96L117 27L148 32L153 42V51H7Z',
 suv:'M8 41L14 24L37 21L48 7H105L122 25L149 29L154 42V52H8Z',
 'premium-suv':'M7 41L13 21L38 19L49 5H110L126 24L150 28L155 42V53H7Z',
 'luxury-suv':'M6 41L10 19L32 16L43 4H116L132 23L151 27L156 42V54H6Z',
}
export function pricingCarTexture(type) {
 return svgTexture(`price-${type}`,`<path d="${silhouettes[type] || silhouettes.suv}" fill="white"/><g fill="white" stroke="#17232e" stroke-width="3"><circle cx="37" cy="50" r="10"/><circle cx="123" cy="50" r="10"/></g><path d="M46 23L58 13H92L106 25H46Z" fill="#17232e"/>`)
}
export function signalTexture(green) {
 return svgTexture(`signal-${green}`,green?'<path d="M32 9v37M16 32l16 16 16-16" stroke="white" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>':'<path d="m16 16 32 32M48 16 16 48" stroke="white" stroke-width="7" stroke-linecap="round"/>','0 0 64 64')
}
export function boothScreenTexture() {
 return canvasTexture('booth-screen',(ctx,w,h)=>{
  ctx.fillStyle='#052c35';ctx.fillRect(0,0,w,h)
  ctx.fillStyle='#8df8ef';ctx.font='bold 32px sans-serif';ctx.fillText('EGAL / CHECK-IN',28,48)
  ctx.fillStyle='#24a8b2';for(let i=0;i<3;i++)ctx.fillRect(28,80+i*37,210-i*25,9)
  ctx.fillStyle='#8df8ef';ctx.fillRect(350,95,95,80)
  ctx.fillStyle='#168f98';ctx.fillRect(363,110,68,12);ctx.fillRect(363,135,47,12)
 })
}
export function timberTexture() {
 return canvasTexture('showroom-timber',(ctx,w,h)=>{
  ctx.fillStyle='#80573e';ctx.fillRect(0,0,w,h)
  for(let i=0;i<16;i++){
   ctx.fillStyle=i%3===0?'#ac7950':i%3===1?'#936343':'#6b4935';ctx.fillRect(i*w/16+2,0,w/16-4,h)
   ctx.fillStyle='#c6976835';ctx.fillRect(i*w/16+7,0,2,h)
  }
 },512,512)
}
