"""bundles.json: standard CC bundles (Data/Bundles), remix pools (Data/RandomBundles), room rewards, Joja costs,
wiki source hints + icons (Bundles / Remixed Bundles pages)."""
import re, json
from common import *
import wikiapi as W

COLORS = ["Green", "Purple", "Orange", "Yellow", "Red", "Blue", "Teal"]
QUAL = {0: "normal", 1: "silver", 2: "gold", 3: "iridium"}
QTOK = {"SQ": 1, "GQ": 2, "IQ": 3}
ROOM_ORDER = ["Crafts Room", "Pantry", "Fish Tank", "Boiler Room", "Bulletin Board", "Vault", "Abandoned Joja Mart"]
JOJA = {"Crafts Room": ("Bridge to the Quarry", 25000), "Pantry": ("Greenhouse", 35000),
        "Fish Tank": ("Remove glittering boulder (panning)", 20000), "Boiler Room": ("Minecarts", 15000),
        "Vault": ("Bus to the Desert", 40000), "Bulletin Board": (None, None), "Abandoned Joja Mart": (None, None)}

def items_index():
    items = json.load(open(os.path.join(DATA, "items.json")))["data"]
    by = {}
    for q, it in items.items():
        for n in (it["name"], it["internalName"]):
            by.setdefault(n.lower(), q if q.startswith("(O)") or n.lower() not in by else by[n.lower()])
    return items, by

def parse_wiki_tables(t):
    out = {}
    # flatten nested one-cell tables used for quality items (The Missing Bundle)
    t = re.sub(r"\n\|\s*\n\{\|.*?(\{\{(?:Quality|Name)\|[^}]+\}\}).*?\n\|\}", lambda m: "\n| " + m.group(1), t, flags=re.S)
    room = None
    for sec in re.split(r"\n(?===)", t):
        h = re.match(r"==+\s*([^=]+?)\s*==+", sec)
        if h and sec.startswith("==") and not sec.startswith("==="): room = h.group(1)
        for tb in re.findall(r"\{\|\s*class=\"wikitable\"(.*?)\n\|\}(?!\})", sec, re.S):
            m = re.search(r'!\s*id="([^"]+)"[^|]*\|\s*\[\[File:(Bundle \w+\.png)[^\]]*\]\]\s*([^\n]+)', tb)
            if not m: continue
            title = clean_wikitext(m.group(3)).strip()
            icon = re.search(r"\[\[File:([^|\]]+?Bundle\.png)\|center", tb)
            rows, reward = [], None
            body = tb.split("Reward:")[0]
            for row in re.split(r"\n\|-", body):
                nm = re.search(r"\{\{(?:Name|Quality)\|([^|}]+)(?:\|(silver|gold|iridium))?(?:\|(\d+))?", row)
                if not nm: continue
                cells = [c.strip() for c in re.split(r"\n\|", row) if c.strip()]
                src = clean_wikitext(cells[-1]) if len(cells) > 1 and "{{" not in cells[-1][:3] else ""
                rows.append({"name": nm.group(1).strip(), "quality": nm.group(2), "count": int(nm.group(3)) if nm.group(3) and not nm.group(2) else None, "source": src})
            rw = re.search(r"Reward:.*?\{\{Name\|([^|}]+)\|?(\d+)?", tb, re.S)
            if rw: reward = {"name": rw.group(1), "count": int(rw.group(2) or 1)}
            out.setdefault(title.split(" (")[0], {"room": room, "title": title, "icon": icon and icon.group(1),
                                                  "colorIcon": m.group(2), "rows": rows, "reward": reward})
    return out

def room_meta(t):
    meta = {}
    for sec in re.split(r"\n(?====?[^=])", t):
        h = re.match(r"===?\s*([^=]+?)\s*===?\n", sec)
        if not h: continue
        imgs = re.findall(r"\[\[File:([^|\]]+)\|(?:thumb\|right|right\|thumb)[^\]]*\]\]", sec)
        rw = re.search(r"Reward\s*\n\|[^|]*\|\s*(.+)", sec)
        para = next((clean_wikitext(p) for p in sec.split("\n\n") if p and not p.startswith(("[[File", "{|", "=")) ), "")
        if rw: meta[h.group(1)] = {"reward": clean_wikitext(rw.group(1)), "images": imgs, "description": para}
    return meta

def build():
    items, by = items_index()
    pages = W.wikitext_many(["Bundles", "Remixed Bundles", "Joja Community Development Form"])
    wstd, wrmx = parse_wiki_tables(pages["Bundles"]), parse_wiki_tables(pages["Remixed Bundles"])
    rmeta = room_meta(pages["Bundles"])
    def wiki_for(name, pool):
        for k in (f"{name} Bundle", name, name.replace("'", "") + " Bundle", f"g{name.replace(',', '').rstrip('g')} Bundle", name.rstrip('g') + " Bundle"):
            if k in pool: return pool[k]
        if name.endswith("g") and name[0].isdigit():
            return {"icon": name.replace(",", "").rstrip("g") + " Bundle.png", "colorIcon": None, "rows": []}
        return None
    def src_hint(w, name):
        if not w: return None
        for r in w["rows"]:
            if r["name"].lower() in (name.lower(), {"l. goat milk": "large goat milk", "large milk": "large milk"}.get(name.lower())):
                return r["source"]
    def rq(kind, iid):
        return {"O": "(O)", "BO": "(BC)", "R": "(O)"}[kind] + iid
    # ---------- standard
    data = game("Data/Bundles.json")
    rooms = {r: {"name": r, "bundles": []} for r in ROOM_ORDER}
    for key, v in data.items():
        room, idx = key.split("/")
        f = v.split("/")
        name, rew, its, color = f[0], f[1].split(), f[2].split(), int(f[3])
        req = int(f[4]) if len(f) > 4 and f[4] else None
        w = wiki_for(name, wstd)
        slots = []
        for i in range(0, len(its), 3):
            iid, cnt, q = its[i], int(its[i+1]), int(its[i+2])
            if iid == "-1":
                slots.append({"gold": cnt}); continue
            qid = "(O)" + iid
            slots.append({"qid": qid, "name": items[qid]["name"], "count": cnt, "quality": QUAL[q],
                          "source": src_hint(w, items[qid]["name"])})
        rooms[room]["bundles"].append({
            "id": int(idx), "key": key, "name": resolve(f[6]) if len(f) > 6 and f[6] else name,
            "color": COLORS[color], "itemsRequired": req or len(slots), "items": slots,
            "reward": rew and {"qid": rq(rew[0], rew[1]), "name": items.get(rq(rew[0], rew[1]), {}).get("name"), "count": int(rew[2])},
            "icon": w and w["icon"], "colorIcon": w and w["colorIcon"],
        })
    for r, room in rooms.items():
        m = rmeta.get(r) or rmeta.get("Abandoned JojaMart" if r == "Abandoned Joja Mart" else r, {})
        room.update({"reward": m.get("reward"), "images": m.get("images", []), "description": m.get("description"),
                     "jojaDevelopment": JOJA[r][0], "jojaCost": JOJA[r][1]})
    # ---------- remix
    def parse_tok(tok):
        tok = tok.strip()
        if tok.startswith("["):
            return {"oneOf": [parse_tok(x) for x in tok.strip("[]").split("|")]}
        m = re.match(r"(\d+)\s+(?:(SQ|GQ|IQ)\s+)?(.+)", tok)
        cnt, q, nm = int(m.group(1)), QTOK.get(m.group(2), 0), m.group(3)
        if nm in ("EggCategory", "MilkCategory"):
            return {"category": nm.replace("Category", ""), "name": "Any " + nm.replace("Category", ""), "count": cnt, "quality": QUAL[q]}
        qid = "(O)" + nm if nm.isdigit() else by.get({"battery": "battery pack"}.get(nm.lower(), nm.lower()))
        return {"qid": qid, "name": items[qid]["name"] if qid else nm, "count": cnt, "quality": QUAL[q]}
    remix = []
    for a in game("Data/RandomBundles.json"):
        keys = a["Keys"].split()
        def B(b, fixed):
            w = wiki_for(b["Name"], wrmx) or wiki_for(b["Name"], wstd)
            its = [parse_tok(x) for x in b["Items"].split(",")]
            for it in its:
                for x in it.get("oneOf", [it]):
                    x["source"] = src_hint(w, x["name"]) if x.get("name") else None
            rc, rn = b["Reward"].split(" ", 1)
            rq_ = by.get(rn.lower())
            return {"name": resolve(b["Name"]), "slotIndex": b["Index"], "color": b["Color"], "items": its,
                    "pick": b["Pick"] if b["Pick"] > 0 else None,
                    "itemsRequired": b["RequiredItems"] if b["RequiredItems"] > 0 else None,
                    "reward": {"qid": rq_, "name": items[rq_]["name"] if rq_ else rn, "count": int(rc)},
                    "fixedSet": fixed, "icon": w and w["icon"], "colorIcon": w and w["colorIcon"]}
        slots = {}
        sets = a["BundleSets"]
        for s in sets:
            for b in s["Bundles"]: slots.setdefault(b["Index"], []).append(B(b, s["Id"]))
        for b in a.get("Bundles") or []: slots.setdefault(b["Index"], []).append(B(b, None))
        remix.append({"room": a["AreaName"], "bundleKeys": keys,
                      "slots": [{"index": i, "options": o, "note": "always this bundle" if len(o) == 1 else f"one of {len(o)} chosen at random"}
                                for i, o in sorted(slots.items())]})
    out = {"rooms": [rooms[r] for r in ROOM_ORDER], "remix": remix,
           "joja": {"membership": 5000, "developments": [{"room": r, "name": JOJA[r][0], "cost": JOJA[r][1]} for r in ROOM_ORDER if JOJA[r][1]],
                    "total": sum(v[1] for v in JOJA.values() if v[1]), "source": wiki_url("Joja Community Development Form")}}
    # sanity: Joja costs vs wiki page
    jt = pages["Joja Community Development Form"]
    for r, (n, c) in JOJA.items():
        if c: assert f"{{{{Price|{c}}}}}" in jt, (r, c)
    write("bundles", out, {"source": [SOURCES["game"], wiki_url("Bundles"), wiki_url("Remixed Bundles")],
                           "license": [GAME_LICENSE, WIKI_LICENSE]})
    nstd = sum(len(r["bundles"]) for r in out["rooms"]); nrmx = sum(len(o["options"]) for a in remix for o in a["slots"])
    miss = [b["name"] for r in out["rooms"] for b in r["bundles"] if not b["icon"]] + [o["name"] for a in remix for s in a["slots"] for o in s["options"] if not o["icon"]]
    unres = [x["name"] for a in remix for s in a["slots"] for o in s["options"] for it in o["items"] for x in it.get("oneOf", [it]) if "qid" in x and not x["qid"]]
    nosrc = sum(1 for r in out["rooms"] for b in r["bundles"] for s in b["items"] if "qid" in s and not s["source"])
    print(f"standard bundles {nstd}, remix bundle options {nrmx}; missing icons {miss}; unresolved remix items {unres}; std items without wiki source {nosrc}")
    return out

if __name__ == "__main__":
    build()
