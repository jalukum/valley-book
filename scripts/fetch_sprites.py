"""Sprite manifest + downloader. Every image is a real game sprite as hosted on stardewvalleywiki.com (File: pages).
usage: python3 fetch_sprites.py [--sample | --all]
writes data/sprites.json (manifest: group, key, wiki file, url, size, sha1, local path) and sprites/<group>/<file>."""
import sys, os, json, subprocess, time, hashlib, urllib.parse
from common import *
import wikiapi as W

ROOT = os.path.dirname(DATA)
SPR = os.path.join(ROOT, "sprites")
J = lambda n: json.load(open(os.path.join(DATA, n + ".json")))["data"]

def manifest():
    m = []  # (group, key, file)
    items = J("items")
    for q, it in items.items():
        f = (it.get("sprite") or {}).get("file")
        m.append(("items", q, f))
    npcs = J("npcs")
    for n, d in npcs.items():
        m.append(("portraits", n, d.get("portraitFile")))
        m.append(("npc_icons", n, d.get("iconFile")))
    b = J("bundles")
    for r in b["rooms"]:
        for img in r["images"]: m.append(("rooms", r["name"], img))
        for x in r["bundles"]:
            m.append(("bundles", x["name"], x["icon"]))
            if x["colorIcon"]: m.append(("bundles", "color:" + x["colorIcon"], x["colorIcon"]))
    for a in b["remix"]:
        for s in a["slots"]:
            for o in s["options"]:
                m.append(("bundles", o["name"], o["icon"]))
    for a in J("achievements"):
        f = {"D.I.Y.": "Achievement_DIY.jpg", "Craft Master": "Achievement_Master_Craft.jpg",
             "Ol' Mariner": "Achievement_Ol_Mariner.jpg", "Prairie King": "Achievement_Prarie_King.jpg"}.get(a["name"], a["icon"]["file"])
        m.append(("achievements", a["name"], f))
    for ms in J("monster_slayer"):
        for t in ms["targets"]:
            m.append(("monsters", t, {"Shadow Guy": "Shadowguy.png", "Dust Spirit": "Dust Sprite.png", "Fly": "Cave Fly.png"}.get(t, t + ".png")))
    ui = {"skill:Farming": "Farming Skill Icon.png", "skill:Mining": "Mining Skill Icon.png", "skill:Foraging": "Foraging Skill Icon.png",
          "skill:Fishing": "Fishing Skill Icon.png", "skill:Combat": "Combat Skill Icon.png", "skill:Luck": "Luck.png",
          "season:Spring": "Spring.png", "season:Summer": "Summer.png", "season:Fall": "Fall.png", "season:Winter": "Winter.png",
          "Golden Walnut": "Golden Walnut.png", "Qi Gem": "Qi Gem.png", "Gold": "Gold.png", "Star Token": "Token.png",
          "Heart": "HeartIconLarge.png", "Gift": "Gift Icon.png", "Gold Clock": "Gold Clock.png",
          "Earth Obelisk": "Earth Obelisk.png", "Water Obelisk": "Water Obelisk.png", "Desert Obelisk": "Desert Obelisk.png",
          "Island Obelisk": "Island Obelisk.png", "Junimo": "Junimo Icon.png", "Community Center": "Community Center.png",
          "Museum": "Museum.png", "weather:Sunny": "Sunny.png", "weather:Rain": "Rain.png", "Qi's Walnut Room": "Qi's Walnut Room.png", "Junimo Bundle": "Junimo Bundle.png","Calendar": "Calendar.png", "Cooking": "Cooking Icon.png", "Mr. Qi": "Mr. Qi.png",
          "weather:Sun": "StatusSun.png", "weather:Rain2": "StatusRain.png", "weather:Storm": "StatusStorm.png", "weather:Snow": "StatusSnow.png",
          "weather:GreenRain": "StatusGreenRain.png", "weather:WindSpring": "StatusWindSpring.png", "weather:WindFall": "StatusWindFall.png",
          "weather:Festival": "StatusFestival.png", "Quest": "Quest.png", "Raccoon": "Raccoon Icon.png", "Energy": "Energy.png",
          "Backpack": "Backpack.png", "Pickaxe": "Pickaxe.png", "Copper Pickaxe": "Copper Pickaxe.png", "Steel Axe": "Steel Axe.png",
          "Skull Key": "Skull Key.png", "Rusty Key": "Rusty Key.png", "Greenhouse": "Greenhouse.png", "Traveling Cart": "Traveling Cart.png",
          "Bus": "Bus.png", "Golden Mystery Box": "Golden Mystery Box.png",
          "Axe": "Axe.png", "Hoe": "Hoe.png", "Watering Can": "Watering Can.png", "Bamboo Pole": "Bamboo Pole.png", "Dark Talisman": "Dark Talisman.png", "Magnifying Glass": "Magnifying Glass.png", "Farm": "Standard Farm Map Icon.png",
          "sky:Cloud1": "Cloud Decal 1.png", "sky:Cloud2": "Cloud Decal 2.png", "sky:Moon": "Night Sky Decal 2.png", "sky:Star": "Night Sky Decal 1.png", "sky:Stars": "Night Sky Decal 3.png"}
    for k, f in ui.items(): m.append(("ui", k, f))
    return m

def ok(p, r):
    """Cloudflare re-optimises PNG/JPG bytes (metadata stripped), so sha1/size differ from the wiki's original;
    validate by decoding and checking pixel dimensions instead."""
    if not os.path.exists(p): return False
    try:
        from PIL import Image
        with Image.open(p) as im: return im.size == (r["w"], r["h"])
    except Exception:
        return False

def run(mode):
    m = manifest()
    files = sorted({"File:" + f for _, _, f in m if f})
    info = W.imageinfo_many(files)
    rows, seen = [], {}
    for g, k, f in m:
        ii = info.get("File:" + f) if f else None
        r = {"group": g, "key": k, "file": f, "found": bool(ii)}
        if ii:
            r.update({"url": ii["url"], "w": ii["width"], "h": ii["height"], "bytes": ii["size"], "sha1": ii.get("sha1"),
                      "source": ii.get("descriptionurl") or wiki_url("File:" + f),
                      "local": f"sprites/{g}/{f.replace(' ', '_')}"})
        rows.append(r)
    os.makedirs(SPR, exist_ok=True)
    todo = []
    if mode == "--sample":
        todo = [r for r in rows if r["found"] and r["group"] == "items"][:400:20][:20] + [r for r in rows if r["found"] and r["group"] == "portraits"][:5]
    elif mode == "--all":
        todo = [r for r in rows if r["found"]]
    done = 0
    for r in todo:
        p = os.path.join(ROOT, r["local"])
        os.makedirs(os.path.dirname(p), exist_ok=True)
        if not ok(p, r):
            subprocess.run(["curl", "-sfL", "-A", W.UA, "-o", p, r["url"]], check=False)
            time.sleep(0.15)
        if ok(p, r): done += 1
        else: print("bad download", r["url"])
    for r in rows:
        r["downloaded"] = bool(r["found"] and ok(os.path.join(ROOT, r["local"]), r))
    # coverage
    cov = {}
    for r in rows:
        c = cov.setdefault(r["group"], {"total": 0, "found": 0, "bytes": 0, "downloaded": 0, "missing": []})
        c["total"] += 1; c["found"] += r["found"]; c["bytes"] += r.get("bytes", 0); c["downloaded"] += r["downloaded"]
        if not r["found"]: c["missing"].append(r["key"])
    fish = {x["qid"] for x in J("fish")}
    fr = [r for r in rows if r["group"] == "items" and r["key"] in fish]
    cov["fish (subset of items)"] = {"total": len(fr), "found": sum(r["found"] for r in fr), "missing": [r["key"] for r in fr if not r["found"]]}
    uniq = {r["file"]: r.get("bytes", 0) for r in rows if r["found"]}
    write("sprites", {"coverage": cov, "uniqueFiles": len(uniq), "uniqueBytes": sum(uniq.values()), "images": rows},
          {"source": "https://stardewvalleywiki.com (File: pages; per-image source in images[].source)",
           "license": "Sprites/portraits are game art © ConcernedApe, hosted on the wiki; used here for a personal non-commercial fan app. Not CC-licensed by the wiki."})
    print(f"downloaded {done}/{len(todo)}; unique files {len(uniq)}, {sum(uniq.values())/1e6:.2f} MB")
    for g, c in cov.items(): print(f"  {g}: {c['found']}/{c['total']} found" + (f", missing {len(c['missing'])}: {c['missing'][:12]}" if c['missing'] else ""))

if __name__ == "__main__":
    run(sys.argv[1] if len(sys.argv) > 1 else "--sample")
