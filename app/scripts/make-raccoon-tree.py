#!/usr/bin/env python3
"""Builds the front-page "raccoon tree": the Giant Stump's trunk (door, lit window,
hollow) grown back into a full tree with an Oak-leaf crown, one PNG per season,
plus the raccoon head sprites used by the peek animation.

Custom art, made ONLY from real game pixels taken off the wiki:
  * Giant_Stump.png  - 1.6 in-game screenshot at exactly 3x (grid phase x=2, y=0),
                       sampled back to 1 game px per pixel.
  * Oak_Stage_5.png  - grown Oak, four seasonal panels at exactly 2x.
  * Raccoon_Icon.png - raccoon head icon at exactly 3x.
No pixel is resampled with smoothing; every output pixel is a source pixel
(copied, mirrored or cut away). Outputs are 1 game px per pixel (the app draws
them at PIXEL_SCALE=2, the same as every other meadow sprite).

Run: python3 app/scripts/make-raccoon-tree.py   (writes sprites/derived/RaccoonTree_*.png)
"""
import json, os, sys, urllib.request
from PIL import Image
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE = os.path.join(ROOT, 'cache', 'raccoon')
OUT = os.path.join(ROOT, 'sprites', 'derived')
SRC = {
  'Giant_Stump.png': 'https://stardewvalleywiki.com/mediawiki/images/en/9/9a/Giant_Stump.png',
  'Oak_Stage_5.png': 'https://stardewvalleywiki.com/mediawiki/images/en/d/d3/Oak_Stage_5.png',
  'Raccoon_Icon.png': 'https://stardewvalleywiki.com/mediawiki/images/en/5/5e/Raccoon_Icon.png',
}

def load(name):
  p = os.path.join(CACHE, name)
  if not os.path.exists(p):
    os.makedirs(CACHE, exist_ok=True)
    req = urllib.request.Request(SRC[name], headers={'User-Agent': 'valley-book-build'})
    open(p, 'wb').write(urllib.request.urlopen(req, timeout=60).read())
  return Image.open(p).convert('RGBA')

def unscale(im, k, ox, oy):
  """Nearest sample at block centres -> 1 game px per pixel."""
  a = np.asarray(im)
  return a[oy + k // 2::k, ox + k // 2::k][: (a.shape[0] - oy) // k, : (a.shape[1] - ox) // k].copy()

def hexs(c): return '%02x%02x%02x' % tuple(int(v) for v in c[:3])

# ---------- trunk: the Giant Stump ----------
stump = unscale(load('Giant_Stump.png'), 3, 2, 0)
TRUNK_BOX = (124, 41, 222, 112)          # x0,y0,x1,y1 in game px; cut above the grass line
tr = stump[TRUNK_BOX[1]:TRUNK_BOX[3], TRUNK_BOX[0]:TRUNK_BOX[2]].copy()
RACCOON = {'412b32', '655658', 'a5959a', 'd3d2da'}   # the kits' fur + outline colours

def is_ground(c):
  r, g, b = int(c[0]), int(c[1]), int(c[2])
  return (g > r + 5 and g >= b) or b > r + 10    # grass, leaves, the blue/pink flowers

H, W = tr.shape[:2]
for y in range(H):
  for x in range(W):
    if is_ground(tr[y, x]): tr[y, x, 3] = 0

# The stump was cut: its top rows are the cut face (swirl rings), kits, a chimney
# pipe and a flower. The tree never fell, so those rows become a rounded bark
# crown-base made of the stump's own bark rows 30-35, outlined in its own edge brown.
import math
FACE_END, BX0, BX1, DOME = 30, 18, 77, 10
EDGE = (0x51, 0x2f, 0x1f, 255)
for y in range(FACE_END):
  for x in range(W):
    tr[y, x, 3] = 0
cx, rx = (BX0 + BX1 - 1) / 2, (BX1 - BX0) / 2
DOME_TOP = {}
for x in range(BX0, BX1):
  top = DOME_TOP[x] = FACE_END - int(round(DOME * math.sqrt(max(0.0, 1 - ((x - cx) / rx) ** 2))))
  for y in range(top, FACE_END):
    tr[y, x] = tr[30 + (y - top) % 6, x]
  tr[top, x] = EDGE
  if x in (BX0, BX1 - 1):
    for y in range(top, FACE_END): tr[y, x] = EDGE

# the kit sitting in the hollow becomes the peeking sprite; the hollow is left empty
HOLLOW_KIT = (66, 35, 76, 44)
kit = tr[HOLLOW_KIT[1]:HOLLOW_KIT[3], HOLLOW_KIT[0]:HOLLOW_KIT[2]].copy()
for y in range(kit.shape[0]):
  for x in range(kit.shape[1]):
    if hexs(kit[y, x]) not in RACCOON: kit[y, x, 3] = 0
x0, y0, x1, y1 = HOLLOW_KIT
for y in range(y0, y1):
  for x in range(x0, x1):
    if hexs(tr[y, x]) in RACCOON:
      tr[y, x] = tr[34, x]                       # bark from the row just above the kit
# open the hollow (an oval hole in the stump's own darkest browns)
HOLE_RIM, HOLE_IN = (0x51, 0x2f, 0x1f, 255), (0x3e, 0x27, 0x24, 255)
hole = {38: (68, 74), 39: (67, 75), 40: (67, 75), 41: (67, 75), 42: (67, 75), 43: (68, 74)}
for y, (a, b) in hole.items():
  for x in range(a, b):
    edge = y in (38, 43) or x in (a, b - 1)
    tr[y, x] = HOLE_RIM if edge else HOLE_IN
# a second kit (sitting on the right root in the screenshot) for variety; it stays put there
KIT2 = (82, 52, 92, 61)
kit2 = tr[KIT2[1]:KIT2[3], KIT2[0]:KIT2[2]].copy()
for y in range(kit2.shape[0]):
  for x in range(kit2.shape[1]):
    if hexs(kit2[y, x]) not in RACCOON: kit2[y, x, 3] = 0

# ---------- crown: Oak leaves ----------
oak_src = load('Oak_Stage_5.png')
PANELS = [0, 102, 204, 308]    # spring, summer, fall, winter (2x wiki px)
def oak_panel(i):
  p = oak_src.crop((PANELS[i], 0, PANELS[i] + 96, 188))
  return unscale(p, 2, 0, 0)    # 48 x 94 game px

CROWN_CUT = 60   # rows of the Oak used as a leaf cluster (above its own trunk)
WINTER_CUT = 72  # bare winter boughs keep a little more limb so they grow out of the bark
def crown_piece(i, flip=False):
  a = oak_panel(i)[:WINTER_CUT if i == 3 else CROWN_CUT].copy()
  return a[:, ::-1].copy() if flip else a

def paste(dst, src, x, y):
  h, w = src.shape[:2]
  m = src[:, :, 3] > 0
  sub = dst[y:y + h, x:x + w]
  sub[m] = src[m]

# layout in game px on the output canvas
CW, CH = 112, 103
TRUNK_AT = ((CW - W) // 2, CH - H)
LAYOUT = [  # (dx, dy, flip) back to front: a wide crown of five Oak clusters
  (16, 0, True), (CW - 64, 0, False),
  (0, 8, False), (CW - 48, 8, True),
  (48, 12, True), (32, 4, False),
]

WINTER_LAYOUT = [(4, 2, True), (CW - 52, 2, False), (32, 0, False)]
# Winter: the meadow's winter trees (snowy Pine, Green Rain trees) keep warm brown
# trunks, so the stump keeps its bark and the winter Oak's bare boughs are mapped
# from the Oak's cold winter ramp onto the stump's own bark ramp (snow untouched).
# The rounded bark top gets the winter Oak's two snow colours.
OAK_TO_BARK = {
  '3a1452': '512f1f', '522758': '63351c', '753c5c': '724724',
  'a65d63': '995e2a', 'db826f': 'bc802f', 'f0ac92': 'bc802f',
}
SNOW_HI, SNOW_LO = (0xff, 0xff, 0xff, 255), (0xaa, 0xe7, 0xff, 255)
def rgb(h): return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

def winter_trunk():
  t = tr.copy()
  for x, top in DOME_TOP.items():
    if top - 1 >= 0: t[top - 1, x] = SNOW_HI
    t[top, x] = SNOW_LO
    t[top + 1, x] = EDGE
  return t

def winter_bough(flip):
  a = crown_piece(3, flip)
  for y in range(a.shape[0]):
    for x in range(a.shape[1]):
      h = hexs(a[y, x])
      if a[y, x, 3] and h in OAK_TO_BARK: a[y, x] = rgb(OAK_TO_BARK[h])
      elif a[y, x, 3] and h == '000000': a[y, x, 3] = 0   # the Oak's ground shadow
  return a

def layers(season):
  """(trunk, crown) on the same CW x CH canvas; the app stacks crown over trunk so
  only the crown sways. Winter boughs are trimmed where they enter the bark top."""
  trunk = np.zeros((CH, CW, 4), dtype=np.uint8)
  crown = np.zeros((CH, CW, 4), dtype=np.uint8)
  paste(trunk, winter_trunk() if season == 3 else tr, *TRUNK_AT)
  tx, ty = TRUNK_AT
  if season == 3:
    for dx, dy, flip in WINTER_LAYOUT:
      piece = winter_bough(flip)
      for y in range(piece.shape[0]):
        for x in range(piece.shape[1]):
          X, Y = dx + x, dy + y
          lim = ty + DOME_TOP[X - tx] + 3 if (X - tx) in DOME_TOP else ty + FACE_END - 12
          if Y > lim: piece[y, x, 3] = 0
      paste(crown, piece, dx, dy)
  else:
    for dx, dy, flip in LAYOUT:
      paste(crown, crown_piece(season, flip), dx, dy)
  return trunk, crown

# Peek openings, in game px on the canvas (x, y, w, h). The app clips each head to its box.
DOOR = (52, 90, 8, 12)      # doorway inside the frame (arch row 90 .. sill 101)
WINDOW = (32, 74, 12, 13)   # inside the window frame, above the sill
HOLLOW = (73, 62, 10, 13)   # above the hollow's lower rim (row 75)

def door_open():
  """The doorway with the door swung in: the panel pixels become the stump's darkest brown."""
  out = np.zeros((CH, CW, 4), dtype=np.uint8)
  x0, y0, w, h = DOOR
  for y in range(y0, y0 + h):
    for x in range(x0, x0 + w):
      if y == y0 and x in (x0, x0 + w - 1): continue   # keep the arch's corners
      out[y, x] = HOLE_IN
  return out

if __name__ == '__main__':
  names = ['Spring', 'Summer', 'Fall', 'Winter']
  os.makedirs(OUT, exist_ok=True)
  for i, n in enumerate(names):
    t, c = layers(i)
    if i in (0, 3): Image.fromarray(t).save(os.path.join(OUT, 'RaccoonTree_Trunk%s.png' % ('_Winter' if i == 3 else '')))
    Image.fromarray(c).save(os.path.join(OUT, f'RaccoonTree_Crown_{n}.png'))
  Image.fromarray(door_open()).save(os.path.join(OUT, 'RaccoonTree_Door_Open.png'))
  json.dump({'canvas': [CW, CH], 'door': DOOR, 'window': WINDOW, 'hollow': HOLLOW}, sys.stdout); print()
  Image.fromarray(kit).save(os.path.join(OUT, 'Raccoon_Kit_Head.png'))
  Image.fromarray(kit2).save(os.path.join(OUT, 'Raccoon_Kit_Head_2.png'))
  icon = unscale(load('Raccoon_Icon.png'), 3, 0, 0)
  ys, xs = np.where(icon[:, :, 3] > 0)
  Image.fromarray(icon[ys.min():ys.max() + 1, xs.min():xs.max() + 1]).save(os.path.join(OUT, 'Raccoon_Head.png'))
  print('trunk', W, 'x', H, 'at', TRUNK_AT, 'canvas', CW, 'x', CH)
