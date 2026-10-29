import { CanvasTexture, SRGBColorSpace } from 'three'

const paths = {
  wheel: '<circle cx="64" cy="64" r="44" fill="none" stroke="currentColor" stroke-width="9"/><circle cx="64" cy="65" r="12" fill="currentColor"/><path d="M53 63L23 56M75 63L105 56M64 77V106" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>',
  cap: '<path d="M22 60L28 38Q65 20 100 40L107 62Q67 73 22 60Z" fill="currentColor"/><path d="M25 67Q65 79 107 67L104 78Q65 89 25 77Z" fill="currentColor"/><path d="M61 84L107 78Q127 82 111 94Q91 104 61 84Z" fill="currentColor"/>',
  mountain: '<path d="M8 103L48 27L89 103ZM68 103L91 54L119 103Z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M33 57L43 62L48 51L55 63L63 57M81 76L89 80L94 73L101 80" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>',
}
const cache = new Map()
export function serviceIconTexture(type) {
  if(cache.has(type))return cache.get(type)
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace
  const image=new Image()
  image.onload=()=>{canvas.getContext('2d').drawImage(image,0,0,256,256);texture.needsUpdate=true}
  image.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" style="color:#fff3df">${paths[type]}</svg>`)}`
  cache.set(type,texture);return texture
}
