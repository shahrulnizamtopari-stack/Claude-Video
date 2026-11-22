#!/usr/bin/env python3
"""Leader photos -> bobblehead heads. assets/leaders/src/<k>.jpg -> <k>-head.png + bobble.json (anchor, skin tone).
Needs rembg (u2net_human_seg) cutouts src/<k>-cut.png and opencv (haar face box)."""
import cv2, os, json, numpy as np
from PIL import Image, ImageFilter, ImageDraw
D=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"assets","leaders"); os.chdir(D)
casc=cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades,'haarcascade_frontalface_default.xml'))
HEAD_H=340; meta={}
# chin (x face h), jaw start, jaw half-width at chin (x face w), x shift
TW={'uk':(1.13,0.62,0.40,0.0),'cn':(1.12,0.6,0.40,0.0),'us':(1.10,0.6,0.35,0.0),'ru':(1.00,0.56,0.30,0.0)}
# tilted head: hand-drawn keep polygon (source px) and chin x
POLY={'fr':([(170,0),(420,0),(415,150),(388,190),(358,226),(326,256),(298,272),(272,270),(248,255),(232,228),(214,190),(190,140),(170,100)],290)}
for k in ['uk','fr','cn','us','ru']:
    src=cv2.imread(f'src/{k}.jpg'); gr=cv2.cvtColor(src,cv2.COLOR_BGR2GRAY)
    fx,fy,fw,fh=max(casc.detectMultiScale(gr,1.05,4,minSize=(40,40)).tolist(), key=lambda r:r[2]*r[3])
    cut=Image.open(f'src/{k}-cut.png').convert('RGBA')
    al=cut.getchannel('A').filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8)); cut.putalpha(al)
    if k in POLY:
        poly,cx=POLY[k]; m=Image.new('L',cut.size,0); ImageDraw.Draw(m).polygon(poly,fill=255); m=m.filter(ImageFilter.GaussianBlur(1.2))
        a=np.array(cut).astype(float); a[:,:,3]*=np.array(m)/255; head=Image.fromarray(a.astype('uint8'),'RGBA')
    else:
        chinK,jawK,jw,dx=TW[k]; cx=fx+fw/2+dx*fw; chin=int(fy+fh*chinK); a=np.array(cut).astype(float); H,Wd=a.shape[:2]
        yy=np.arange(H)[:,None]; xx=np.arange(Wd)[None,:]; jaw=fy+fh*jawK; t=np.clip((yy-jaw)/(chin-jaw),0,1)
        w=np.where(yy>jaw, fw*(0.5-(0.5-jw)*t)*np.sqrt(np.clip(1-t**2.2,0,1))+2, 9999); w=np.where(yy>chin,0,w)
        a[:,:,3]*=np.clip((w-np.abs(xx-cx))/3,0,1); head=Image.fromarray(a.astype('uint8'),'RGBA')
    bb=head.getbbox(); head=head.crop(bb); s=HEAD_H/head.height; head=head.resize((round(head.width*s),HEAD_H),Image.LANCZOS)
    rgb=cv2.cvtColor(src,cv2.COLOR_BGR2RGB); a0=int(fy+fh*0.5); a1=int(fy+fh*0.7)
    patch=np.concatenate([rgb[a0:a1,int(fx+fw*0.2):int(fx+fw*0.33)].reshape(-1,3),rgb[a0:a1,int(fx+fw*0.67):int(fx+fw*0.8)].reshape(-1,3)])
    lum=patch.mean(1); pc=patch[lum>=np.percentile(lum,60)]; skin='#%02x%02x%02x'%tuple(np.median(pc,0).astype(int))
    head.save(f'{k}-head.png'); meta[k]=dict(w=head.width,h=HEAD_H,ax=round((cx-bb[0])*s,1),fw=round(fw*s,1),skin=skin); print(k,meta[k])
json.dump(meta,open('bobble.json','w'))
