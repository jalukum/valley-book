# Builds src/fonts/pixelify-25-{500,700}.woff: Pixelify Sans subset to "2" and "5" with those two glyphs redrawn (see styles.css).
import os
APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
import bisect
X5=[60,150,170,420,440,531]; Y5=[-12,77,100,190,255,279,344,366,432,520,544,633]
X7=[61,149,188,414,453,542]; Y7=[-11,74,125,211,246,297,331,381,416,501,552,638]
def m(v,a,b):
  if v in a: return b[a.index(v)]
  i=max(1,min(len(a)-1,bisect.bisect(a,v))); return round(b[i-1]+(v-a[i-1])*(b[i]-b[i-1])/(a[i]-a[i-1]))
# glyphs designed on the 500-weight grid (rectangles, union by nonzero fill)
FIVE=[(60,520,531,633),(60,255,170,633),(60,255,440,366),(420,77,531,255),(150,-12,440,100),(60,77,170,190)]
TWO=[(150,544,440,633),(60,432,170,544),(420,344,531,544),(320,255,440,366),(220,170,340,275),(130,90,240,190),(60,-12,531,100)]
for w in (500,700):
  src=f'{APP}/node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-{w}-normal.woff'
  f=TTFont(src)
  opt=subset.Options(); opt.flavor='woff'; opt.layout_features=[]; opt.name_IDs=['*']; opt.notdef_outline=True
  s=subset.Subsetter(opt); s.populate(unicodes=[0x32,0x35]); s.subset(f)
  gs=f.getGlyphSet()
  for name,rects in (('two',TWO),('five',FIVE)):
    p=TTGlyphPen(gs)
    for x0,y0,x1,y1 in rects:
      if w==700: x0,x1=m(x0,X5,X7),m(x1,X5,X7); y0,y1=m(y0,Y5,Y7),m(y1,Y5,Y7)
      p.moveTo((x0,y0)); p.lineTo((x0,y1)); p.lineTo((x1,y1)); p.lineTo((x1,y0)); p.closePath()  # clockwise
    g=p.glyph(); g.recalcBounds(f['glyf']); f['glyf'][name]=g
    f['hmtx'][name]=(f['hmtx'][name][0], g.xMin)
  for r in f['name'].names:
    if r.nameID in (1,4,16): r.string='Pixelify Sans 25'
    if r.nameID==6: r.string='PixelifySans25'
  f.flavor='woff'; f.save(f'{APP}/src/fonts/pixelify-25-{w}.woff')
  print(w,'ok')
