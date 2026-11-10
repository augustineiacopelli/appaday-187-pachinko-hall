import json,sys
from PIL import Image,ImageDraw
d=json.load(open('/tmp/geo.json'))
S=1.0
W,H=480,770
cols=3
im=Image.new('RGB',(W*cols,H*2),(10,14,22))
dr=ImageDraw.Draw(im)
for k,c in enumerate(d):
    ox=(k%cols)*W; oy=(k//cols)*H
    dr.rectangle([ox,oy,ox+W-1,oy+H-1],outline=(60,80,110))
    for s in c['segs']: dr.line([ox+s[0],oy+s[1],ox+s[2],oy+s[3]],fill=(255,210,120),width=2)
    for p in c['pins']: dr.ellipse([ox+p[0]-2.6,oy+p[1]-2.6,ox+p[0]+2.6,oy+p[1]+2.6],fill=(255,120,120) if p[2] else (200,200,210))
    for s in c['sensors']:
        col={'start':(80,255,120),'pocket':(80,160,255),'catch':(255,100,255),'gate':(255,255,80)}.get(s[0],(255,255,255))
        dr.rectangle([ox+s[1]-s[3]/2,oy+s[2]-s[4]/2,ox+s[1]+s[3]/2,oy+s[2]+s[4]/2],outline=col)
    dr.text((ox+8,oy+8),c['id'],fill=(255,255,255))
im.save('/tmp/geo.png')
