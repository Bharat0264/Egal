"""Create a comparison contact sheet without retouching either source image."""
import bpy
import numpy as np

base='C:/CAR/egal/assets/performance/'
reference='C:/Users/cheth/AppData/Local/Temp/codex-clipboard-399f2471-dcab-4f17-90c8-a45930d66904.png'

def read(path):
    image=bpy.data.images.load(path,check_existing=False)
    width,height=image.size
    data=np.empty(width*height*4,dtype=np.float32)
    image.pixels.foreach_get(data)
    bpy.data.images.remove(image)
    return data.reshape(height,width,4)

ref=read(reference)
h,w,_=ref.shape
crop=ref[h-int(h*790/941):h-int(h*520/941),int(w*100/1672):int(w*660/1672)]
hero=read(base+'hero-final.png')
canvas=np.ones((650,1800,4),dtype=np.float32)
canvas[:,:,:3]=.035

def place(image,x,y,width,height):
    h,w,_=image.shape
    scale=min(width/w,height/h)
    ww,hh=int(w*scale),int(h*scale)
    xs=np.linspace(0,w-1,ww)
    ys=np.linspace(0,h-1,hh)
    x0,y0=xs.astype(int),ys.astype(int)
    x1,y1=np.minimum(x0+1,w-1),np.minimum(y0+1,h-1)
    fx,fy=(xs-x0)[None,:,None],(ys-y0)[:,None,None]
    result=(image[y0[:,None],x0[None,:]]*(1-fx)+image[y0[:,None],x1[None,:]]*fx)*(1-fy)+(image[y1[:,None],x0[None,:]]*(1-fx)+image[y1[:,None],x1[None,:]]*fx)*fy
    xx,yy=x+(width-ww)//2,y+(height-hh)//2
    canvas[yy:yy+hh,xx:xx+ww]=result

place(crop,10,10,880,630)
place(hero,910,10,880,630)
out=bpy.data.images.new('Performance reference comparison',width=1800,height=650,alpha=True,float_buffer=False)
out.pixels.foreach_set(canvas.ravel())
out.filepath_raw=base+'reference-comparison.png'
out.file_format='PNG'
out.save()
print('Saved comparison: reference left, Blender render right')
