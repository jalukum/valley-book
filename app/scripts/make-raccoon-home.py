#!/usr/bin/env python3
"""v6.9.1 front-page raccoon home: the REAL Giant Stump, unmodified.

Source: wiki Giant_Stump.png (stardewvalleywiki.com/File:Giant_Stump.png), a 1.6 in-game screenshot at exactly 3x
(pixel grid phase x=2 .. sampled at block centres x=3+3k, y=1+3k) -> 1 game px per pixel. No pixel is recoloured,
moved, mirrored or painted: the stump, its chimney, steps, door, lit window, the kits sitting on it and the two
raccoons at the door are copied exactly; everything else (grass, the tree trunk behind it, flowers, chimney smoke,
the fence) is cut away to transparency.

Outputs (sprites/derived/):
  Giant_Stump_Home.png        the stump home, trimmed
  Giant_Stump_Window_Bars.png same canvas, ONLY the stump's own window frame + mullion pixels inside the glass box,
                              drawn over a peeking kit so it appears behind the glass bars
  Giant_Stump_Shadow.png      app-made soft ground shadow (stepped pixel ellipse, translucent); not game art
The wiki has one Giant Stump image (spring/summer). There are no seasonal variants on the wiki, so all four
seasons use this same, unedited sprite.

Run: python3 app/scripts/make-raccoon-home.py
"""
import json, os, sys, urllib.request
from PIL import Image
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE = os.path.join(ROOT, 'cache', 'raccoon')
OUT = os.path.join(ROOT, 'sprites', 'derived')
URL = 'https://stardewvalleywiki.com/mediawiki/images/en/9/9a/Giant_Stump.png'

def load():
  p = os.path.join(CACHE, 'Giant_Stump.png')
  if not os.path.exists(p):
    os.makedirs(CACHE, exist_ok=True)
    req = urllib.request.Request(URL, headers={'User-Agent': 'valley-book-build'})
    open(p, 'wb').write(urllib.request.urlopen(req, timeout=60).read())
  return np.asarray(Image.open(p).convert('RGBA'))

hexs = lambda p: '%02x%02x%02x' % tuple(int(v) for v in p[:3])
CROP = (100, 15, 250, 150)   # x0, y0, x1, y1 in game px of the sampled screenshot
# the oak trunk standing behind the stump in the screenshot (its colours never occur in the stump or raccoons)
BEHIND = {'b35e22', 'd77a1b', '8f442a', '4a1c1d', 'f58c21', 'ffb343', '6c2c1f', 'bc6520', '823c27', '964929'}
FLOWER = {'f280e7', 'fabdce', 'fbf965', '74446e', '837856'}

def cut():
  s = load()[1::3, 3::3]
  c = s[CROP[1]:CROP[3], CROP[0]:CROP[2]].copy()
  H, W = c.shape[:2]
  keep = np.zeros((H, W), bool)
  for y in range(H):
    for x in range(W):
      r, g, b = (int(v) for v in c[y, x, :3])
      if (g > r + 5 and g >= b) or b > r + 10: continue          # grass, leaves, blue flowers
      if hexs(c[y, x]) in BEHIND or hexs(c[y, x]) in FLOWER: continue
      keep[y, x] = True
  # keep the stump's connected piece plus the free-standing pieces that belong to it (steps, the raccoon at the door)
  lab = np.zeros((H, W), int); n = 0; info = {}
  for y in range(H):
    for x in range(W):
      if keep[y, x] and not lab[y, x]:
        n += 1; st = [(y, x)]; lab[y, x] = n; pts = []
        while st:
          yy, xx = st.pop(); pts.append((yy, xx))
          for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            Y, X = yy + dy, xx + dx
            if 0 <= Y < H and 0 <= X < W and keep[Y, X] and not lab[Y, X]: lab[Y, X] = n; st.append((Y, X))
        ys, xs = zip(*pts); info[n] = (len(pts), min(xs), min(ys), max(xs), max(ys))
  main = max(info, key=lambda k: info[k][0])
  _, mx0, my0, mx1, my1 = info[main]
  ok = [k for k, (cnt, x0, y0, x1, y1) in info.items()
        if k == main or (cnt >= 25 and x0 >= mx0 and x1 <= mx1 and y0 >= my0 + 60 and y1 <= my1)]
  m = np.isin(lab, ok)
  c[~m] = 0
  ys, xs = np.where(m)
  return c[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()

if __name__ == '__main__':
  sys.path.insert(0, os.path.dirname(__file__))
  from raccoon_clean import clean_kits
  home, hollows, kits = clean_kits(cut())   # v6.9.4: no baked-in raccoons (see raccoon_clean.py)
  H, W = home.shape[:2]
  os.makedirs(OUT, exist_ok=True)
  Image.fromarray(home).save(os.path.join(OUT, 'Giant_Stump_Home.png'))
  # the lit window's glass box: the yellow panes and the bars between them
  ys, xs = np.where(np.all(home[:, :, :3] == (0xff, 0xd5, 0x2f), axis=2))
  gx0, gy0, gx1, gy1 = xs.min(), ys.min() - 3, xs.max() + 1, ys.max() + 2   # + the dark top row + the orange sill glow
  bars = np.zeros_like(home)
  for y in range(gy0, gy1):
    for x in range(gx0, gx1):
      if hexs(home[y, x]) not in ('ffd52f', 'e49f2f'): bars[y, x] = home[y, x]
  Image.fromarray(bars).save(os.path.join(OUT, 'Giant_Stump_Window_Bars.png'))
  # soft shadow: 3 stepped, translucent ellipses (pixel edges, no blur)
  SW, SH = W + 8, 14
  sh = np.zeros((SH, SW, 4), np.uint8)
  for k, a in ((1.0, 40), (0.82, 34), (0.62, 30)):
    rx, ry = SW / 2 * k, SH / 2 * k
    for y in range(SH):
      for x in range(SW):
        if ((x + .5 - SW / 2) / rx) ** 2 + ((y + .5 - SH / 2) / ry) ** 2 <= 1:
          sh[y, x] = (40, 52, 20, min(255, int(sh[y, x, 3]) + a))
  Image.fromarray(sh).save(os.path.join(OUT, 'Giant_Stump_Shadow.png'))
  json.dump({'hollows': hollows, 'kits': kits, 'home': [W, H], 'window': [int(gx0), int(gy0), int(gx1 - gx0), int(gy1 - gy0)], 'shadow': [SW, SH]}, sys.stdout); print()
