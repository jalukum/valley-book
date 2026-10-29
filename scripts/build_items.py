"""items.json: every Object (O) and Big Craftable (BC) with id, name, category, tags, wiki sprite file."""
import re, json
from common import *
import wikiapi as W

def springobject_files():
    """Index -> wiki file name, from Modding:Objects/Object sprites (springobjects sheet, 24 per row)."""
    t = W.wikitext("Modding:Objects/Object sprites")
    rows = re.split(r"\n\|-[^\n]*\n", t)
    idx = {}
    pending = None
    for r in rows:
        cells = [c.strip() for c in r.split("\n") if c.startswith("|") and not c.startswith("|}")]
        files = [re.search(r"\[\[File:([^|\]]+)", c) for c in cells]
        nums = [c.lstrip("|").strip() for c in cells]
        if cells and all(n.isdigit() for n in nums):
            if pending:
                for n, f in zip(nums, pending):
                    if f: idx[int(n)] = f
            pending = None
        elif cells and any(files):
            pending = [m.group(1).strip() if m else None for m in files]
    return idx

def wiki_name_variants(name):
    yield name
    yield name.replace(":", "")
    yield name.replace("'", "")

def build():
    objs = game("Data/Objects.json")
    bcs = game("Data/BigCraftables.json")
    items = {}
    for k, v in objs.items():
        cat = v["Category"]
        items["(O)" + k] = {
            "qid": "(O)" + k, "id": k, "kind": "object",
            "internalName": v["Name"], "name": resolve(v["DisplayName"]),
            "description": resolve(v["Description"]),
            "type": v["Type"], "category": cat, "categoryName": CATEGORIES.get(cat, str(cat)),
            "price": v["Price"], "edibility": v["Edibility"],
            "contextTags": v.get("ContextTags") or [],
            "texture": v["Texture"] or "Maps\\springobjects", "spriteIndex": v["SpriteIndex"],
            "excludeFromShipping": v.get("ExcludeFromShippingCollection", False),
            "excludeFromFishing": v.get("ExcludeFromFishingCollection", False),
        }
    for k, v in bcs.items():
        items["(BC)" + k] = {
            "qid": "(BC)" + k, "id": k, "kind": "bigcraftable",
            "internalName": v["Name"], "name": resolve(v["DisplayName"]),
            "description": resolve(v["Description"]), "type": "Crafting", "category": -9,
            "categoryName": "Big Craftable", "price": v["Price"], "edibility": -300,
            "contextTags": v.get("ContextTags") or [],
            "texture": v["Texture"] or "TileSheets\\Craftables", "spriteIndex": v["SpriteIndex"],
        }
    for k, v in game("Data/Trinkets.json").items():
        items["(TR)" + k] = {
            "qid": "(TR)" + k, "id": k, "kind": "trinket", "internalName": k,
            "name": resolve(v["DisplayName"]), "description": resolve(v["Description"]),
            "type": "Trinket", "category": -101, "categoryName": "Trinket", "price": 1000, "edibility": -300,
            "contextTags": ["category_trinket"],  # implicit runtime tag the game adds
            "texture": v["Texture"], "spriteIndex": v["SheetIndex"], "dropsNaturally": v.get("DropsNaturally"),
        }
    # flavored-item templates ("Dried {0}") -> use the generic internal name
    for it in items.values():
        if it["name"] in ("Dried", "Smoked") or "{0}" in it["name"]:
            it["name"] = {"DriedFruit": "Dried Fruit", "DriedMushrooms": "Dried Mushrooms", "SmokedFish": "Smoked Fish"}.get(it["id"], it["internalName"])
            it["flavoredTemplate"] = True
    # ---- sprite files on the wiki
    EXTRA = {"(BC)110": "Rarecrow 1.png", "(BC)113": "Rarecrow 2.png", "(BC)126": "Rarecrow 3.png",
             "(BC)136": "Rarecrow 4.png", "(BC)137": "Rarecrow 5.png", "(BC)138": "Rarecrow 6.png",
             "(BC)139": "Rarecrow 7.png", "(BC)140": "Rarecrow 8.png",
             "(BC)184": "Seasonal Plant 1 Spring.png", "(BC)188": "Seasonal Plant 2 Spring.png",
             "(BC)192": "Seasonal Plant 3 Spring.png", "(BC)196": "Seasonal Plant 4 Spring.png",
             "(BC)200": "Seasonal Plant 5 Spring.png", "(BC)204": "Seasonal Plant 6 Spring.png",
             "(BC)99": "Hopper.png", "(BC)48": "Seasonal Decor Spring.png", "(TR)FrogEgg": "Frog Egg Colors.png"}
    so = springobject_files()
    cand = {}
    for q, it in items.items():
        c = [EXTRA[q]] if q in EXTRA else []
        if it["kind"] == "object" and it["texture"] == "Maps\\springobjects" and it["spriteIndex"] in so:
            c.append(so[it["spriteIndex"]])
        c += [f"{n}.png" for n in wiki_name_variants(it["name"])]
        c += [f"{n}.png" for n in wiki_name_variants(it["internalName"])]
        cand[q] = list(dict.fromkeys(c))
    allfiles = sorted({"File:" + f for c in cand.values() for f in c})
    info = W.imageinfo_many(allfiles)
    miss = 0
    for q, it in items.items():
        it["sprite"] = None
        for f in cand[q]:
            ii = info.get("File:" + f)
            if ii:
                it["sprite"] = {"file": f, "url": ii["url"], "w": ii["width"], "h": ii["height"],
                                "bytes": ii["size"], "source": "wiki"}
                break
        if not it["sprite"]: miss += 1
    write("items", items, {"source": [SOURCES["game"], "wiki File: pages for sprites"],
                           "license": [GAME_LICENSE, WIKI_LICENSE],
                           "note": "qid = qualified item id as used by the game (O)=object (BC)=big craftable"})
    print("items without wiki sprite:", miss)
    return items

if __name__ == "__main__":
    ensure_sources(); build()
