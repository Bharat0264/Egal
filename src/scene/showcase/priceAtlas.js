import {CanvasTexture,SRGBColorSpace,LinearMipmapLinearFilter} from 'three'
import {cars,formatPrice} from '../../data/cars'
let textures
export function priceAtlas(){
 if(textures)return textures
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=160*cars.length
 const ctx=canvas.getContext('2d')
 cars.forEach((car,i)=>{const y=i*160;ctx.fillStyle='#fff8ed';ctx.beginPath();ctx.roundRect(5,y+5,246,150,20);ctx.fill();ctx.textAlign='center';ctx.fillStyle='#131b4b';ctx.font='28px Arial';ctx.fillText(car.category,128,y+65);ctx.font='bold 32px Arial';ctx.fillText(`${formatPrice(car.price)}/day`,128,y+112)})
 const source=new CanvasTexture(canvas);source.colorSpace=SRGBColorSpace;source.generateMipmaps=true;source.minFilter=LinearMipmapLinearFilter
 textures=cars.map((_,i)=>{const texture=source.clone();texture.repeat.set(1,1/cars.length);texture.offset.set(0,1-(i+1)/cars.length);texture.needsUpdate=true;return texture});return textures
}
