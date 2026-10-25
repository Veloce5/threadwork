"""Offline illustrated garment thumbnails. PNG and drawing are standard-library only.

These are labeled demo illustrations, not photographs of real products. Use when
Wikimedia Commons returns HTTP 429 or is unavailable. No external services used.
"""
from __future__ import annotations

import math
import struct
import zlib

W, H = 400, 460

def rgb(value):
    if isinstance(value, tuple): return value
    return tuple(int(value[i:i+2], 16) for i in (1, 3, 5))

def adjust(color, factor):
    a=rgb(color)
    return tuple(max(0, min(255, round(v*factor))) for v in a)

def mix(a, b, t):
    aa, bb=rgb(a),rgb(b)
    return tuple(int(aa[i]*(1-t)+bb[i]*t) for i in range(3))

class Canvas:
    def __init__(self):
        self.raw=bytearray(W*H*3)
        for y in range(H):
            t=y/H
            bg=(int(246-6*t),int(246-5*t),int(240-5*t))
            self.raw[y*W*3:(y+1)*W*3]=bytes(bg)*W
    def pixel(self, x,y,col):
        if 0<=x<W and 0<=y<H:
            i=(y*W+x)*3;self.raw[i:i+3]=bytes(rgb(col))
    def polygon(self, coords, color):
        if len(coords)<3:return
        ys=[p[1] for p in coords]
        for y in range(max(0,int(min(ys))),min(H-1,int(max(ys)))+1):
            xs=[]
            for i, (x1,y1) in enumerate(coords):
                x2,y2=coords[(i+1)%len(coords)]
                if (y1<=y+.5<y2) or (y2<=y+.5<y1):xs.append(x1+(y+.5-y1)*(x2-x1)/(y2-y1))
            xs.sort()
            for i in range(0,len(xs)-1,2):
                a=max(0,round(xs[i]));b=min(W,round(xs[i+1]))
                if b>a:self.raw[(y*W+a)*3:(y*W+b)*3]=bytes(rgb(color))*(b-a)
    def ellipse(self,cx,cy,rx,ry,color):
        for y in range(max(0,int(cy-ry)),min(H-1,int(cy+ry))+1):
            if ry<=0:break
            dx=rx*math.sqrt(max(0,1-((y-cy)/ry)**2))
            a=max(0,int(cx-dx));b=min(W,int(cx+dx))
            if b>a:self.raw[(y*W+a)*3:(y*W+b)*3]=bytes(rgb(color))*(b-a)
    def rect(self,x1,y1,x2,y2,color):
        a=max(0,int(x1));b=min(W,int(x2));
        for y in range(max(0,int(y1)),min(H,int(y2))):
            if b>a:self.raw[(y*W+a)*3:(y*W+b)*3]=bytes(rgb(color))*(b-a)
    def line(self,x1,y1,x2,y2,color,width=2):
        dist=max(abs(x2-x1),abs(y2-y1));n=max(1,int(dist*1.2))
        for i in range(n+1):
            t=i/n;x=x1+(x2-x1)*t;y=y1+(y2-y1)*t
            if width>3:self.ellipse(x,y,width/2,width/2,color)
            else:self.rect(x-width/2,y-width/2,x+width/2+1,y+width/2+1,color)
    def png(self):
        data=b''.join(b'\x00'+self.raw[y*W*3:(y+1)*W*3] for y in range(H))
        def chunk(name,data):return struct.pack('!I',len(data))+name+data+struct.pack('!I',zlib.crc32(name+data)&0xffffffff)
        return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',W,H,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(data,8))+chunk(b'IEND',b'')

def shape(c,points,color,outline=0):
    if outline:
        c.polygon(points,adjust(color,.58))
        x=sum(p[0] for p in points)/len(points);y=sum(p[1] for p in points)/len(points)
        c.polygon([(x+(p[0]-x)*.976,y+(p[1]-y)*.98) for p in points],color)
    else:c.polygon(points,color)

def top(c,color,code):
    is_hood='hoodie' in code
    is_sweater=('sweater' in code or 'turtleneck' in code)
    coords=[(142,117),(171,102),(190,118),(210,118),(229,102),(258,117),(323,156),(296,219),(270,207),(274,398),(126,398),(130,207),(103,219),(77,156)]
    shape(c,coords,color,1)
    dark=adjust(color,.7);light=mix(color,'#FFFFFF',.37)
    if is_hood:
        c.ellipse(200,116,43,45,dark);c.ellipse(200,124,29,33,light)
        c.line(185,156,184,194,'#EDEDEB',2);c.line(214,156,216,190,'#EDEDEB',2)
        shape(c,[(164,288),(236,288),(244,328),(156,328)],adjust(color,.85),1)
    elif is_sweater:
        c.rect(164,109,235,138,dark)
        c.rect(127,382,273,396,dark)
        if 'cable' in code or 'sweater' in code:
            for x in range(155,250,23):
                for y in range(170,355,28):
                    c.line(x-5,y,x+5,y+9,light,2);c.line(x+5,y+9,x-5,y+20,light,2)
    else:
        c.ellipse(200,113,30,24,dark);c.ellipse(200,110,23,21,(246,246,240))
        if 'polo' in code or 'oxford' in code or 'chambray' in code or 'flannel' in code or 'linen-shirt' in code:
            shape(c,[(169,109),(198,143),(194,179),(158,128)],light)
            shape(c,[(231,109),(202,143),(206,179),(242,128)],light)
            c.line(201,149,201,389,dark,2)
            for y in range(174,360,43):c.ellipse(201,y,3,3,(237,233,216))
    if 'striped' in code or 'navy' in code:
        for y in range(174,364,28):c.rect(132,y,268,y+8,light)
    if 'flannel' in code:
        for x in range(149,261,29):c.rect(x,151,x+6,390,adjust(color,.85))
        for y in range(170,374,33):c.rect(135,y,266,y+4,light)
    if 'running' in code or 'training' in code:
        c.polygon([(246,194),(264,205),(258,379),(247,379)],light)
    c.line(139,381,261,381,dark,2)

def bottoms(c,color,code):
    skirt='skirt' in code;shorts='shorts' in code
    dark=adjust(color,.7);light=mix(color,'#FFFFFF',.3)
    if skirt:
        pts=[(151,114),(249,114),(264,204),(306,386),(94,386),(136,204)]
        shape(c,pts,color,1)
        for x in (144,172,200,228,256):c.line(x,183,200+(x-200)*1.7,375,dark,2)
    else:
        bot=272 if shorts else 419
        pts=[(140,112),(260,112),(281,223),(259,bot),(208,bot),(200,255),(193,bot),(137,bot),(117,223)]
        shape(c,pts,color,1)
        c.rect(143,118,258,136,dark)
        c.line(200,138,200,218,light,2)
        for x in (151,236):
            c.line(x,150,x+14,186,dark,2)
        if 'cargo' in code:
            for x in (123,230):
                shape(c,[(x,228),(x+42,228),(x+42,279),(x,279)],adjust(color,.83),1)
                c.line(x,240,x+42,240,light,2)
        if 'running' in code:
            c.line(140,154,120,260,light,3);c.line(260,154,276,260,light,3)
        if 'jeans' in code:c.rect(132,214,270,220,light)
    c.line(145,120,255,120,light,2)

def outerwear(c,color,code):
    pts=[(142,112),(169,95),(198,119),(231,95),(259,112),(329,166),(304,269),(270,250),(273,413),(127,413),(130,250),(97,269),(71,166)]
    shape(c,pts,color,1)
    dark=adjust(color,.68); light=mix(color,'#FFFFFF',.3)
    c.line(199,144,199,409,dark,3)
    c.polygon([(167,99),(198,149),(184,220),(156,128)],light)
    c.polygon([(230,99),(201,149),(216,220),(244,128)],light)
    for x in (139,242):
        c.line(x,285,x+12,332,dark,3)
    if 'puffer' in code:
        for y in range(203,385,42):c.line(125,y,274,y,dark,5)
    if 'denim' in code:
        for x in (144,225):shape(c,[(x,226),(x+28,226),(x+27,251),(x,251)],light,1)
    if 'trench' in code:
        c.rect(125,281,274,298,dark)
        c.rect(164,284,179,295,(215,196,159))
    if 'shell' in code:
        c.ellipse(200,110,42,41,dark)
        c.ellipse(200,119,29,27,(246,246,240))
    if 'bomber' in code:
        c.rect(130,389,271,411,dark)

def dress(c,color,code):
    pts=[(154,116),(171,105),(187,125),(211,125),(229,105),(247,116),(301,157),(278,207),(253,199),(248,255),(302,417),(98,417),(152,255),(147,199),(122,207),(99,157)]
    shape(c,pts,color,1)
    dark=adjust(color,.72);light=mix(color,'#FFFFFF',.35)
    c.ellipse(200,112,25,22,dark);c.ellipse(200,108,19,16,(246,246,240))
    c.line(152,253,249,253,dark,3)
    c.line(126,405,275,405,light,2)
    if 'floral' in code:
        for x,y in ((166,276),(205,318),(235,367),(157,385),(218,201),(181,156),(242,291),(175,346)):
            for dx,dy in ((-6,0),(6,0),(0,-6),(0,6)):
                c.ellipse(x+dx,y+dy,5,6,light)
            c.ellipse(x,y,3,3,adjust(color,.5))
    elif 'shirt' in code:
        c.line(199,153,200,400,dark,2)
        for y in range(168,391,33):c.ellipse(200,y,3,3,light)
    elif 'evening' in code:
        c.polygon([(238,254),(270,392),(258,388),(223,270)],light)

def footwear(c,color,code):
    dark=adjust(color,.56);light=mix(color,'#FFFFFF',.48)
    boots='boots' in code
    for i,(sx,sy) in enumerate(((72,188),(93,311))):
        if boots:
            pts=[(sx+35,sy-60),(sx+130,sy-60),(sx+136,sy+3),(sx+187,sy+20),(sx+211,sy+51),(sx+211,sy+62),(sx+5,sy+62),(sx+7,sy+16),(sx+35,sy+11)]
        else:
            pts=[(sx+16,sy),(sx+117,sy-4),(sx+149,sy+29),(sx+187,sy+34),(sx+213,sy+54),(sx+208,sy+65),(sx+8,sy+65),(sx,sy+49)]
        shape(c,pts,color,1)
        c.rect(sx+12,sy+54,sx+204,sy+67,(240,235,222))
        c.rect(sx+18,sy+64,sx+200,sy+69,dark)
        if not 'sandals' in code:
            for j in range(3):c.line(sx+76+j*17,sy+13,sx+93+j*17,sy+31,light,3)
        if 'running' in code or 'trainers' in code:
            c.line(sx+26,sy+44,sx+62,sy+20,light,6)
        if 'sandals' in code:
            c.line(sx+73,sy-1,sx+147,sy+55,dark,9)
            c.line(sx+126,sy-1,sx+76,sy+54,light,11)
    c.ellipse(197,421,142,9,(224,224,214))

def accessories(c,color,code):
    dark=adjust(color,.62);light=mix(color,'#FFFFFF',.43)
    if 'tote' in code:
        shape(c,[(113,200),(287,200),(314,408),(87,408)],color,1)
        for cx in (157,244):
            c.line(cx-42,209,cx-42,154,dark,9)
            c.line(cx-42,154,cx+2,134,dark,9)
            c.line(cx+2,134,cx+35,163,dark,9)
        c.rect(100,392,300,402,dark)
    elif 'belt' in code:
        for y in range(176,300,26):
            c.ellipse(200,y,123,38,dark)
            c.ellipse(200,y,109,27,(246,246,240))
        c.rect(255,248,327,295,light)
        c.rect(263,256,319,287,dark)
        c.rect(273,263,310,280,(246,246,240))
    elif 'beanie' in code:
        c.ellipse(200,258,113,115,color)
        c.rect(88,256,313,348,color)
        c.rect(87,327,313,363,dark)
        for x in range(112,300,22):c.line(x,275,x,342,light,3)
        c.ellipse(201,134,22,19,light)
    elif 'watch' in code:
        c.rect(165,101,236,413,dark)
        c.rect(174,109,226,399,color)
        c.ellipse(200,263,90,90,dark)
        c.ellipse(200,263,80,80,light)
        c.ellipse(200,263,67,67,(244,243,238))
        c.line(200,263,206,218,dark,5);c.line(200,263,238,277,dark,4)
        c.ellipse(200,263,7,7,color)
        for x,y in ((200,206),(256,263),(200,319),(143,263)):
            c.ellipse(x,y,3,3,dark)
    else:
        shape(c,[(151,112),(228,112),(241,338),(278,388),(263,413),(202,369),(140,414),(120,393),(171,336)],color,1)
        c.line(152,203,235,223,light,8)
        c.line(152,258,234,282,dark,4)
        for x,y in ((178,190),(223,299),(185,340)):
            c.ellipse(x,y,10,11,light)


def illustration_png(code, category, color):
    """Return unique-to-item 400x460 RGB PNG bytes, not a real garment photograph."""
    if not color.startswith('#') or len(color)!=7:raise ValueError('Expected hex color')
    c=Canvas()
    c.ellipse(200,428,137,11,(222,222,215))
    c.ellipse(80,86,60,60,(241,241,235))
    c.ellipse(340,363,40,40,(239,240,233))
    if category=='TOPS':top(c,rgb(color),code)
    elif category=='BOTTOMS':bottoms(c,rgb(color),code)
    elif category=='OUTERWEAR':outerwear(c,rgb(color),code)
    elif category=='DRESSES':dress(c,rgb(color),code)
    elif category=='FOOTWEAR':footwear(c,rgb(color),code)
    elif category=='ACCESSORIES':accessories(c,rgb(color),code)
    else:raise ValueError('Unknown garment category')
    c.rect(20,19,100,23,adjust(color,.95))
    c.rect(20,28,69,30,adjust(color,.78))
    c.rect(334,20,380,27,adjust(color,.9))
    return c.png()
