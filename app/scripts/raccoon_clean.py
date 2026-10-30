"""v6.9.4: take the baked-in raccoons OFF the Giant Stump (Jaluku: "so many baby raccoons everywhere and they aren't animated").

The wiki screenshot has 8 kit heads sitting on / in the stump and 2 raccoons at the door. Their pixels are the screenshot's
raccoon greys (+ the dark outline pixels touching them). This removes all of them:
  * the 3 kits sitting IN the trunk/roots leave an oval dark hollow (the stump's own darkest outline brown 3e2724 as the
    ring, a darker shade 2a1a19 inside) -- these hollows are where the animated kits now peek from;
  * the kits on the rim / sides and the door raccoons are cut away; where one covered the silhouette edge it is closed
    again with the stump's own outline colour and bark copied from the same row; stray specks are dropped.
Every other pixel stays exactly as sampled. Needs numpy + scipy.
"""
import numpy as np
from scipy import ndimage as nd

def clean_kits(home):
  H, W = home.shape[:2]
  hx=lambda p:'%02x%02x%02x'%tuple(int(v) for v in p[:3])
  L={'655658','a5959a','938382','d3d2da','73676b','c1bcc5','aea0a6'}
  op=home[...,3]>0
  kit=np.array([[op[y,x] and hx(home[y,x]) in L for x in range(W)] for y in range(H)])
  # components of kit pixels (8-connected, gap 1)
  lab=np.zeros((H,W),int); n=0; comps=[]
  for y in range(H):
    for x in range(W):
      if kit[y,x] and not lab[y,x]:
        n+=1; st=[(y,x)]; lab[y,x]=n; pts=[]
        while st:
          yy,xx=st.pop(); pts.append((yy,xx))
          for dy in (-2,-1,0,1,2):
            for dx in (-2,-1,0,1,2):
              Y,X=yy+dy,xx+dx
              if 0<=Y<H and 0<=X<W and kit[Y,X] and not lab[Y,X]: lab[Y,X]=n; st.append((Y,X))
        ys,xs=zip(*pts); comps.append((n,len(pts),min(xs),min(ys),max(xs),max(ys)))
  DARK={'4f4138','46333b','3b3726','412b32','3e2724','432a24','533841','5d3f49','441f24'}
  out=home.copy(); removed=np.zeros((H,W),bool)
  HOLLOW={6,7,8}; hol=[]
  info={}
  for (k,cnt,x0,y0,x1,y1) in comps:
    ys,xs=np.where(lab==k)
    R=np.zeros((H,W),bool); R[max(0,y0-2):y1+3,max(0,x0-2):x1+3]=True
    kl=lab==k
    near=nd.binary_dilation(kl,np.ones((3,3)),iterations=1)&R
    rm=kl|(near&np.array([[op[y,x] and hx(home[y,x]) in DARK for x in range(W)] for y in range(H)]))
    removed|=rm; info[k]=(rm,R)
    out[rm]=0

  dk=lambda p: p[3]>0 and hx(p) in DARK
  for _ in range(4):
    for (k,cnt,x0,y0,x1,y1) in comps:
      if k in HOLLOW: continue
      for y in range(max(0,y0-3),min(H,y1+4)):
        for x in range(max(0,x0-3),min(W,x1+4)):
          if dk(out[y,x]):
            nb=out[max(0,y-2):y+3,max(0,x-2):x+3]
            if not any(p[3]>0 and not dk(p) for row in nb for p in row): out[y,x]=0; removed[y,x]=True
  op2=out[...,3]>0
  for (k,cnt,x0,y0,x1,y1) in comps:
    rm,R=info[k]
    if k in HOLLOW:
      # an oval dark hollow where the kit sat; the kit's ear notches become bark again
      cx,cy,rx,ry=(x0+x1)/2,(y0+y1+1)/2,(x1-x0)/2+1,(y1-y0+1)/2+.5
      ell=np.zeros((H,W),bool)
      for y in range(H):
        for x in range(W): ell[y,x]=((x-cx)/rx)**2+((y-cy)/ry)**2<=1
      ring=ell&nd.binary_dilation(~ell,np.ones((3,3)))
      out[ell]=(0x3e,0x27,0x24,255); out[ell&~ring]=(0x2a,0x1a,0x19,255)
      for y,x in zip(*np.where(rm&~ell)):
        for d in range(1,W):
          hit=[xx for xx in (x-d,x+d) if 0<=xx<W and op2[y,xx] and not removed[y,xx]]
          if hit: out[y,x]=home[y,hit[0]]; break
      hol.append([int(np.where(ell)[1].min()),int(np.where(ell)[0].min()),int(np.where(ell)[1].max()-np.where(ell)[1].min()+1),int(np.where(ell)[0].max()-np.where(ell)[0].min()+1)])
      continue
    if k in (1,2,3): continue
    # edge kit: close the stump's silhouette across the notch
    pad=6
    sl=(slice(max(0,y0-pad),y1+pad+1),slice(max(0,x0-pad),x1+pad+1))
    sub=op2[sl]
    closed=nd.binary_closing(np.pad(sub,6,mode='edge'),structure=nd.generate_binary_structure(2,1),iterations=5)[6:-6,6:-6]
    new=closed&~sub&rm[sl]
    full=np.zeros((H,W),bool); full[sl]=new
    op_after=op2|full
    edge=full&nd.binary_dilation(~op_after,np.ones((3,3)))
    for y,x in zip(*np.where(full)):
      if edge[y,x]: out[y,x]=(0x41,0x2b,0x32,255)
      else:
        # copy bark texture from the nearest kept pixel in the same row (outside the notch)
        for d in range(1,W):
          for xx in (x-d,x+d):
            if 0<=xx<W and op2[y,xx] and not removed[y,xx] and not edge[y,xx]:
              out[y,x]=home[y,xx]; break
          else: continue
          break
    op2=op_after
  # drop stray specks not attached to the stump
  lb,nl=nd.label(out[...,3]>0,structure=np.ones((3,3)))
  sz=nd.sum(np.ones((H,W)),lb,range(1,nl+1))
  for i,z in enumerate(sz):
    if z<20: out[lb==i+1]=0

  return out, hol, [(k, x0, y0, x1, y1) for (k, cnt, x0, y0, x1, y1) in comps]
